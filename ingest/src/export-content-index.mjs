import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./lib/frontmatter.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function resolveUiContentRoot() {
  // Optional override if you keep content outside the public repo.
  // Example: RESUME_UI_CONTENT_ROOT=../resume_web_content/ui/src/content
  const fromEnv =
    (process.env.RESUME_UI_CONTENT_ROOT || process.env.UI_CONTENT_ROOT || process.env.RESUME_CONTENT_ROOT || "").trim();
  if (fromEnv) return path.resolve(repoRoot, fromEnv);

  // Convenience default for this workspace layout:
  //   resume_web/ (this repo)
  //   resume_web_content/ (private content repo) sitting beside it
  const sibling = path.resolve(repoRoot, "..", "resume_web_content", "ui", "src", "content");
  if (fsSync.existsSync(sibling)) return sibling;

  // Fallback: content checked into this repo.
  return path.join(repoRoot, "ui", "src", "content");
}

const UI_CONTENT_ROOT = resolveUiContentRoot();
const OUT_DIR = path.join(repoRoot, "ingest", "exported-content");
const OUT_FILE = path.join(OUT_DIR, "content-index.json");
const UI_PUBLIC_COPY = path.join(repoRoot, "ui", "public", "content-index.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readDirSafe(dir) {
  try {
    return await fs.readdir(dir);
  } catch (e) {
    if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) return [];
    throw e;
  }
}

function pickOptional(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") out[k] = obj[k];
  }
  return out;
}

async function loadItemsFromCollection(type, collectionDir) {
  const files = (await readDirSafe(collectionDir)).filter((f) => f.endsWith(".md"));
  const items = [];

  for (const filename of files) {
    const slug = filename.replace(/\.md$/, "");
    const fullPath = path.join(collectionDir, filename);
    const raw = await fs.readFile(fullPath, "utf8");
    const { data } = parseFrontmatter(raw);

    // New schema: explicit routing control
    assert(Array.isArray(data.visibleIn) && data.visibleIn.length > 0, `[${type}/${slug}] missing required frontmatter: visibleIn[]`);
    if (!data.visibleIn.includes("artifacts")) {
      // content-index.json is the "UI-visible for artifacts" index (experience/projects only).
      continue;
    }

    // New schema: `type` is the top-level bucket. Enforce consistency with directory.
    assert(data.type === type, `[${type}/${slug}] frontmatter.type must be "${type}" (got "${data.type}")`);

    // Fail fast on required fields (MVP spec).
    assert(typeof data.title === "string" && data.title.trim(), `[${type}/${slug}] missing required frontmatter: title`);

    if (type === "experience" || type === "project") {
      assert(typeof data.company === "string" && data.company.trim(), `[${type}/${slug}] missing required frontmatter: company`);
      assert(typeof data.role === "string" && data.role.trim(), `[${type}/${slug}] missing required frontmatter: role`);
      assert(typeof data.period === "string" && data.period.trim(), `[${type}/${slug}] missing required frontmatter: period`);
    }

    assert(Array.isArray(data.tags), `[${type}/${slug}] missing required frontmatter: tags[]`);
    assert(typeof data.summary === "string" && data.summary.trim(), `[${type}/${slug}] missing required frontmatter: summary`);

    const base = {
      type,
      ...(typeof data.subtype === "string" && data.subtype.trim() ? { subtype: data.subtype.trim() } : {}),
      visibleIn: data.visibleIn,
      slug,
      title: data.title,
      tags: data.tags,
      summary: data.summary
    };

    const extraForUi =
      type === "experience" || type === "project"
        ? {
            company: data.company,
            role: data.role,
            period: data.period
          }
        : {};

    const optionalUi = pickOptional(data, ["heroImage", "gallery"]);

    items.push({
      ...base,
      ...extraForUi,
      ...optionalUi
    });
  }

  // Sort for stable output
  items.sort((a, b) => a.slug.localeCompare(b.slug));
  return items;
}

async function main() {
  console.log(`Using UI content root: ${UI_CONTENT_ROOT}`);
  const experienceDir = path.join(UI_CONTENT_ROOT, "experience");
  const projectsDir = path.join(UI_CONTENT_ROOT, "projects");

  const experienceItems = await loadItemsFromCollection("experience", experienceDir);
  const projectItems = await loadItemsFromCollection("project", projectsDir);

  const out = {
    generatedAt: new Date().toISOString(),
    items: [...experienceItems, ...projectItems]
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2) + "\n", "utf8");

  // Simplest integration path per spec: copy to ui/public/
  await fs.mkdir(path.dirname(UI_PUBLIC_COPY), { recursive: true });
  await fs.writeFile(UI_PUBLIC_COPY, JSON.stringify(out, null, 2) + "\n", "utf8");

  console.log(`Wrote: ${OUT_FILE}`);
  console.log(`Copied: ${UI_PUBLIC_COPY}`);
  console.log(`Exported items: ${out.items.length} (experience=${experienceItems.length}, project=${projectItems.length})`);
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});


