#!/usr/bin/env python3
"""Build /recent-projects scroll-sequence media from rendered PNG frame folders.

The phone mockup renders on a solid black background and its silhouette is the
same in every frame, so instead of shipping alpha video (poor browser support,
software decoding) we ship opaque video plus one static mask image that the page
applies with CSS `mask-image`. A second mask covers just the screen (the area inside
the black bezel) so the page can dip the screen to black between clips while the
device frame stays put.

For each clip folder (frames named `<prefix>NNNN.png`) this writes:
  <clip>.webm         VP9, opaque
  <clip>.mp4          H.264, opaque (Safari / iOS fallback)
  <clip>-poster.webp  first frame, shown until the video can play
and once for the set:
  <mask-name>         white PNG whose alpha is the phone silhouette
  <screen-mask-name>  white PNG whose alpha is the screen area (optional)

Requires ffmpeg (with libvpx-vp9 and libx264) and Python with numpy, scipy, Pillow.

Example (Leo):
  python3 ui/scripts/build-scroll-sequence-media.py \
    --src "$HOME/Documents/Leo/pitch deck" --clips mock1 mock2 mock3 mock4 \
    --out ui/public/recent-projects --mask-name leo-phone-mask.png \
    --screen-mask-name leo-screen-mask.png
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

# Max channel value still treated as background black when tracing the silhouette.
BACKGROUND_THRESHOLD = 14
# Max channel value treated as part of the black bezel ring around the screen.
BEZEL_THRESHOLD = 40
# Grow the screen mask (px) so it overlaps the anti-aliased screen edge into the bezel.
SCREEN_MASK_GROW = 2
# Share of pixels a sample frame's mask may differ from the reference before we refuse.
# The screen edge shifts by a pixel or two with on-screen content, so it gets more slack;
# the union of all samples is used, and any overlap onto the black bezel is invisible.
MAX_SILHOUETTE_MISMATCH = 0.001
MAX_SCREEN_MISMATCH = 0.005
# Gaussian sigma (px) used to anti-alias the mask edge.
EDGE_FEATHER_SIGMA = 0.8


def largest_component(mask: np.ndarray) -> np.ndarray:
    labels, count = ndimage.label(mask)
    if count == 0:
        return mask
    sizes = ndimage.sum(mask, labels, range(1, count + 1))
    return labels == (int(np.argmax(sizes)) + 1)


def frame_masks(frame_path: Path) -> tuple[np.ndarray, np.ndarray]:
    """(background, screen) boolean masks for one frame.

    background: near-black pixels connected to the image border.
    screen: the region enclosed by the bezel, i.e. the largest dark ring inside the device.
    """
    channel_max = np.asarray(Image.open(frame_path).convert("RGB")).max(axis=2)

    labels, _ = ndimage.label(channel_max <= BACKGROUND_THRESHOLD)
    edge_labels = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, edge_labels[edge_labels != 0])

    bezel = largest_component((channel_max <= BEZEL_THRESHOLD) & ~background)
    screen = largest_component(ndimage.binary_fill_holes(bezel) & ~bezel)
    return background, ndimage.binary_fill_holes(screen)


def clip_frames(clip_dir: Path, prefix: str) -> list[Path]:
    frames = sorted(clip_dir.glob(f"{prefix}*.png"))
    if not frames:
        raise SystemExit(f"No frames matching '{prefix}*.png' in {clip_dir}")
    return frames


def save_alpha_mask(mask: np.ndarray, out_path: Path) -> None:
    alpha = ndimage.gaussian_filter(mask.astype(np.float32), EDGE_FEATHER_SIGMA)
    alpha_u8 = (alpha.clip(0, 1) * 255).round().astype(np.uint8)
    white = np.full_like(alpha_u8, 255)
    Image.fromarray(np.dstack([white, alpha_u8]), "LA").save(out_path, optimize=True)


def build_masks(clip_frame_lists: list[list[Path]], mask_path: Path, screen_mask_path: Path | None) -> None:
    ref_background, ref_screen = frame_masks(clip_frame_lists[0][0])
    screen_union = ref_screen.copy()
    for frames in clip_frame_lists:
        for sample in (frames[0], frames[len(frames) // 2], frames[-1]):
            background, screen = frame_masks(sample)
            checks = (
                ("Silhouette", background, ref_background, MAX_SILHOUETTE_MISMATCH),
                ("Screen area", screen, ref_screen, MAX_SCREEN_MISMATCH),
            )
            for name, mask, reference, limit in checks:
                mismatch = (mask != reference).mean()
                if mismatch > limit:
                    raise SystemExit(
                        f"{name} in {sample} differs from the reference by {mismatch:.2%}; "
                        "a single static mask will not fit this clip."
                    )
            screen_union |= screen

    save_alpha_mask(~ref_background, mask_path)
    if screen_mask_path:
        save_alpha_mask(ndimage.binary_dilation(screen_union, iterations=SCREEN_MASK_GROW), screen_mask_path)


def ffmpeg(*args: str) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def encode_clip(frames: list[Path], prefix: str, fps: int, out_dir: Path, clip: str) -> None:
    pattern = str(frames[0].parent / f"{prefix}%04d.png")
    source = ["-framerate", str(fps), "-start_number", "0", "-i", pattern]

    ffmpeg(
        *source,
        "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", "-b:v", "0", "-crf", "34",
        "-deadline", "good", "-cpu-used", "1", "-row-mt", "1", "-an",
        str(out_dir / f"{clip}.webm"),
    )
    ffmpeg(
        *source,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-crf", "24",
        "-preset", "slow", "-tune", "animation", "-movflags", "+faststart", "-an",
        str(out_dir / f"{clip}.mp4"),
    )
    Image.open(frames[0]).convert("RGB").save(out_dir / f"{clip}-poster.webp", quality=80, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--src", type=Path, required=True, help="Folder containing one subfolder of PNG frames per clip")
    parser.add_argument("--clips", nargs="+", required=True, help="Clip subfolder names, also used as output basenames")
    parser.add_argument("--out", type=Path, required=True, help="Output folder (e.g. ui/public/recent-projects)")
    parser.add_argument("--mask-name", required=True, help="Filename for the shared silhouette mask PNG")
    parser.add_argument("--screen-mask-name", help="Filename for the shared screen-area mask PNG (optional)")
    parser.add_argument("--prefix", default="iphone mock", help="Frame filename prefix before the 4-digit index")
    parser.add_argument("--fps", type=int, default=24)
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    frame_lists = [clip_frames(args.src / clip, args.prefix) for clip in args.clips]

    screen_mask_path = args.out / args.screen_mask_name if args.screen_mask_name else None
    build_masks(frame_lists, args.out / args.mask_name, screen_mask_path)
    print(f"mask  -> {args.out / args.mask_name}")
    if screen_mask_path:
        print(f"screen mask -> {screen_mask_path}")

    for clip, frames in zip(args.clips, frame_lists):
        encode_clip(frames, args.prefix, args.fps, args.out, clip)
        print(f"{clip}: {len(frames)} frames -> {clip}.webm, {clip}.mp4, {clip}-poster.webp")


if __name__ == "__main__":
    main()
