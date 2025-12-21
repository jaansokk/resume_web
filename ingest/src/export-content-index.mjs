import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./lib/frontmatter.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const UI_CONTENT_ROOT = path.join(repoRoot, "ui", "src", "content");
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


