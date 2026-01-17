from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Literal

from .qdrant_client import QdrantClient


ChunkType = Literal["experience", "project", "background"]


@dataclass(frozen=True)
class RetrievedChunk:
    type: ChunkType
    slug: str
    chunkId: int
    section: str
    text: str
    score: float
    # Metadata from source markdown frontmatter
    title: str | None = None
    company: str | None = None
    role: str | None = None
    period: str | None = None


class RetrievalService:
    def __init__(self, qdrant: QdrantClient):
        self.qdrant = qdrant
        self.max_background_chunks = int(os.environ.get("MAX_BACKGROUND_CHUNKS", "2"))
        self.max_main_chunks = int(os.environ.get("MAX_MAIN_CHUNKS", "10"))

    def retrieve(self, *, query_embedding: list[float], k: int = 40) -> dict[str, Any]:
        points = self.qdrant.search_chunks(vector=query_embedding, limit=k)

        background: list[RetrievedChunk] = []
        main: list[RetrievedChunk] = []

        for p in points:
            payload = p.get("payload") or {}
            score = float(p.get("score") or 0.0)
            ctype = payload.get("type") or "experience"
            if ctype not in ("experience", "project", "background"):
                ctype = "experience"

            chunk = RetrievedChunk(
                type=ctype,  # type: ignore[arg-type]
                slug=str(payload.get("slug") or ""),
                chunkId=int(payload.get("chunkId") or 0),
                section=str(payload.get("section") or ""),
                text=str(payload.get("text") or ""),
                score=score,
                title=str(payload.get("title")) if payload.get("title") else None,
                company=str(payload.get("company")) if payload.get("company") else None,
                role=str(payload.get("role")) if payload.get("role") else None,
                period=str(payload.get("period")) if payload.get("period") else None,
            )
            if not chunk.slug or not chunk.text:
                continue
            if chunk.type == "background":
                background.append(chunk)
            else:
                main.append(chunk)

        background = background[: self.max_background_chunks]
        main = main[: self.max_main_chunks]

        related_slugs = self._compute_related_slugs(main)

        return {
            "chunks": [c.__dict__ for c in (main + background)],
            "relatedSlugs": related_slugs,
        }

    def _compute_related_slugs(self, chunks: list[RetrievedChunk]) -> list[str]:
        slug_stats: dict[str, dict[str, float]] = {}
        for c in chunks:
            if not c.slug or c.type == "background":
                continue
            if c.slug not in slug_stats:
                slug_stats[c.slug] = {"count": 0.0, "maxScore": 0.0}
            slug_stats[c.slug]["count"] += 1.0
            if c.score > slug_stats[c.slug]["maxScore"]:
                slug_stats[c.slug]["maxScore"] = c.score

        sorted_slugs = sorted(
            slug_stats.items(),
            key=lambda x: (x[1]["count"], x[1]["maxScore"]),
            reverse=True,
        )
        top = [slug for slug, _ in sorted_slugs[:6]]
        return top


def is_ui_visible_item(payload: dict[str, Any] | None) -> bool:
    if not payload:
        return False
    # New rule: UI surfacing for artifacts is driven by explicit frontmatter visibility.
    # Ingestion copies `visibleIn` onto item payloads and derives `uiVisible` as a convenience.
    if payload.get("type") == "background":
        return False
    visible_in = payload.get("visibleIn")
    if isinstance(visible_in, list):
        return "artifacts" in visible_in
    # Fallback (shouldn't happen once all content is migrated):
    return payload.get("uiVisible") is not False


