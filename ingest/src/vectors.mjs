import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./lib/frontmatter.mjs";
import { sha256Hex } from "./lib/hash.mjs";
import { chunkMarkdownBody } from "./lib/chunking.mjs";
import { embedTexts, makeChunkCacheKey } from "./lib/openai-embeddings.mjs";
import { loadEnv } from "./lib/load-env.mjs";
import { ensureCollection, upsertPoints, uuidv5 } from "./lib/qdrant-rest.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const DEFAULT_QDRANT_URL = "http://127.0.0.1:6333";

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
const CACHE_FILE = path.join(repoRoot, "ingest", "exported-content", "embeddings-cache.json");
const DEBUG_DIR = path.join(repoRoot, "ingest", "exported-content", "debug");

function getArgFlag(name) {
  return process.argv.includes(name);
}

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const json = JSON.parse(raw);
    return json && typeof json === "object" ? json : {};
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2) + "\n", "utf8");
}

function getTypeConfig(type) {
  if (type === "experience" || type === "project") {
    return {
      required: ["title", "company", "role", "period", "tags", "summary"],
      // UI visibility is controlled by frontmatter.visibleIn (see buildItemDoc)
      uiVisible: true
    };
  }
  if (type === "background") {
    return {
      required: ["title", "tags", "summary"],
      uiVisible: false
    };
  }
  throw new Error(`Unknown type: ${type}`);
}

function normalizeUpdatedAt(frontmatterUpdatedAt) {
  if (typeof frontmatterUpdatedAt === "string" && frontmatterUpdatedAt.trim()) {
    const d = new Date(frontmatterUpdatedAt);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function buildItemDoc({ type, slug, data, sourcePath, sourceHash }) {
  const cfg = getTypeConfig(type);

  // New schema: `type` is explicit in frontmatter; enforce consistency with directory.
  assert(data.type === type, `[${type}/${slug}] frontmatter.type must be "${type}" (got "${data.type}")`);
  assert(Array.isArray(data.visibleIn) && data.visibleIn.length > 0, `[${type}/${slug}] missing required frontmatter: visibleIn[]`);

  for (const k of cfg.required) {
    if (k === "tags") {
      assert(Array.isArray(data.tags), `[${type}/${slug}] missing required frontmatter: tags[]`);
      continue;
    }
    assert(typeof data[k] === "string" && data[k].trim(), `[${type}/${slug}] missing required frontmatter: ${k}`);
  }

  const uiVisible = type !== "background" && data.visibleIn.includes("artifacts");

  const doc = {
    type,
    subtype: typeof data.subtype === "string" && data.subtype.trim() ? data.subtype.trim() : undefined,
    visibleIn: data.visibleIn,
    uiVisible,
    slug,
    title: data.title,
    tags: data.tags,
    summary: data.summary,
    sourcePath,
    sourceHash,
    updatedAt: normalizeUpdatedAt(data.updatedAt)
  };

  // Optional fields
  if (Array.isArray(data.keywords)) doc.keywords = data.keywords;
  if (typeof data.heroImage === "string" && data.heroImage) doc.heroImage = data.heroImage;
  if (Array.isArray(data.gallery)) doc.gallery = data.gallery;
  if (data.links && typeof data.links === "object") doc.links = data.links;

  if (type === "experience" || type === "project") {
    doc.company = data.company;
    doc.role = data.role;
    doc.period = data.period;
    if (typeof data.startDate === "string" && data.startDate) doc.startDate = data.startDate;
    if (typeof data.endDate === "string" && data.endDate) doc.endDate = data.endDate;
  }

  return doc;
}

function buildChunkPrefix({ type, title, company, role }) {
  if (type === "background") return `${title}\n\n`;
  return `${title} — ${company} — ${role}\n\n`;
}

async function loadMarkdownItems({ type, dir }) {
  const files = (await readDirSafe(dir)).filter((f) => f.endsWith(".md"));
  const items = [];
  for (const filename of files) {
    const slug = filename.replace(/\.md$/, "");
    const sourcePath = path.relative(repoRoot, path.join(dir, filename));
    const fullPath = path.join(dir, filename);
    const raw = await fs.readFile(fullPath, "utf8");
    const sourceHash = sha256Hex(raw);
    const { data, body } = parseFrontmatter(raw);
    items.push({ type, slug, sourcePath, sourceHash, data, body });
  }
  items.sort((a, b) => a.slug.localeCompare(b.slug));
  return items;
}

async function main() {
  // Load `.env` and let it override any existing values (to avoid "stale exported env vars").
  await loadEnv({ repoRoot, override: true });

  const dryRun = getArgFlag("--dry-run");
  const noIndex = getArgFlag("--no-index");
  const limit = Number(getArgValue("--limit") || "0") || undefined;

  // Qdrant config (new baseline)
  const QDRANT_URL = (process.env.QDRANT_URL || DEFAULT_QDRANT_URL).trim();
  const ITEMS_COLLECTION = (process.env.QDRANT_COLLECTION_ITEMS || "content_items_v1").trim();
  const CHUNKS_COLLECTION = (process.env.QDRANT_COLLECTION_CHUNKS || "content_chunks_v1").trim();
  const NAMESPACE_UUID = (process.env.QDRANT_NAMESPACE_UUID || "1d0b5b2a-7a1c-4fb6-8f7b-6a8c8a2c3f4d").trim();

  const model =
    process.env.OPENAI_EMBEDDING_MODEL ||
    process.env.OPENAI_EMBED_MODEL ||
    "text-embedding-3-small";
  const dimensions = process.env.OPENAI_EMBEDDING_DIM ? Number(process.env.OPENAI_EMBEDDING_DIM) : undefined;

  const embeddingDim = dimensions || Number(process.env.EMBEDDING_DIM || "1536");

  console.log(`Qdrant URL: ${QDRANT_URL}`);
  console.log(`Collections: items=${ITEMS_COLLECTION} chunks=${CHUNKS_COLLECTION}`);
  console.log(`Embedding model: ${model}${dimensions ? ` (dimensions=${dimensions})` : ""}`);
  console.log(`Mode: ${dryRun ? "dry-run" : noIndex ? "embed-only" : "embed+index"}`);
  console.log(`Using UI content root: ${UI_CONTENT_ROOT}`);

  const experienceDir = path.join(UI_CONTENT_ROOT, "experience");
  const projectsDir = path.join(UI_CONTENT_ROOT, "projects");
  const backgroundDir = path.join(UI_CONTENT_ROOT, "background");

  let items = [
    ...(await loadMarkdownItems({ type: "experience", dir: experienceDir })),
    ...(await loadMarkdownItems({ type: "project", dir: projectsDir })),
    ...(await loadMarkdownItems({ type: "background", dir: backgroundDir }))
  ];

  if (limit) items = items.slice(0, limit);
  console.log(`Loaded markdown files: ${items.length}`);

  const itemDocs = [];
  const chunkDocs = [];

  for (const item of items) {
    const itemDoc = buildItemDoc({
      type: item.type,
      slug: item.slug,
      data: item.data,
      sourcePath: item.sourcePath,
      sourceHash: item.sourceHash
    });
    itemDocs.push(itemDoc);

    // Only embed/index chunks for items explicitly eligible for RAG.
    if (!Array.isArray(itemDoc.visibleIn) || !itemDoc.visibleIn.includes("rag")) continue;

    const chunks = chunkMarkdownBody(item.body, { type: item.type });
    if (!chunks.length) continue;

    const prefix = buildChunkPrefix({
      type: item.type,
      title: itemDoc.title,
      company: itemDoc.company,
      role: itemDoc.role
    });

    chunks.forEach((c, idx) => {
      const textWithPrefix = `${prefix}${c.text}`.trim();
      chunkDocs.push({
        type: item.type,
        slug: item.slug,
        chunkId: idx,
        title: itemDoc.title,
        tags: itemDoc.tags,
        company: itemDoc.company,
        role: itemDoc.role,
        section: c.section || "",
        text: c.text,
        updatedAt: itemDoc.updatedAt,
        sourceHash: item.sourceHash,
        textHash: sha256Hex(textWithPrefix),
        _embedInput: textWithPrefix
      });
    });
  }

  console.log(`Built docs: items=${itemDocs.length} chunks=${chunkDocs.length}`);

  await fs.mkdir(DEBUG_DIR, { recursive: true });
  await fs.writeFile(path.join(DEBUG_DIR, "items.json"), JSON.stringify(itemDocs, null, 2) + "\n", "utf8");
  await fs.writeFile(
    path.join(DEBUG_DIR, "chunks.json"),
    JSON.stringify(chunkDocs.map(({ _embedInput, ...rest }) => rest), null, 2) + "\n",
    "utf8"
  );

  if (dryRun) {
    console.log(`Dry-run: wrote debug dumps to ${DEBUG_DIR} and skipped embedding/indexing.`);
    return;
  }

  // Embeddings (with cache)
  const cache = await loadCache();
  const embedInputs = [];
  const embedTargets = [];

  for (const c of chunkDocs) {
    const cacheKey = makeChunkCacheKey({
      slug: c.slug,
      chunkId: c.chunkId,
      text: c._embedInput,
      model,
      dimensions
    });
    const cached = cache[cacheKey];
    if (cached && Array.isArray(cached.embedding)) {
      c.embedding = cached.embedding;
      continue;
    }
    embedInputs.push(c._embedInput);
    embedTargets.push({ chunk: c, cacheKey });
  }

  console.log(`Embeddings: cached=${chunkDocs.length - embedInputs.length}, toCompute=${embedInputs.length}`);

  if (embedInputs.length) {
    const vectors = await embedTexts({ texts: embedInputs, model, dimensions });
    for (let i = 0; i < vectors.length; i++) {
      const { chunk, cacheKey } = embedTargets[i];
      chunk.embedding = vectors[i];
      cache[cacheKey] = { embedding: vectors[i], createdAt: new Date().toISOString() };
    }
    await saveCache(cache);
    console.log(`Updated cache: ${CACHE_FILE}`);
  }

  // Strip internal field
  for (const c of chunkDocs) delete c._embedInput;

  if (noIndex) {
    console.log("Embed-only: skipping indexing.");
    return;
  }

  console.log("Ensuring Qdrant collections exist...");
  // Metadata collection (no real vectors needed; we store a tiny dummy vector)
  await ensureCollection({
    url: QDRANT_URL,
    name: ITEMS_COLLECTION,
    vectorName: "dummy",
    dim: 1,
    distance: "Cosine"
  });
  // Chunks collection
  await ensureCollection({
    url: QDRANT_URL,
    name: CHUNKS_COLLECTION,
    vectorName: "embedding",
    dim: embeddingDim,
    distance: "Cosine"
  });

  // Upsert items
  const itemPoints = itemDocs.map((doc) => ({
    id: uuidv5(NAMESPACE_UUID, doc.slug),
    vectors: { dummy: [0] },
    payload: doc
  }));

  // Upsert chunks
  const chunkPoints = chunkDocs.map((doc) => {
    assert(Array.isArray(doc.embedding), `Missing embedding for ${doc.slug}__${doc.chunkId}`);
    const { embedding, ...payload } = doc;
    return {
      id: uuidv5(NAMESPACE_UUID, `${doc.slug}::${doc.chunkId}`),
      vectors: { embedding },
      payload
    };
  });

  console.log(`Upserting to Qdrant: items=${itemPoints.length} chunks=${chunkPoints.length}`);
  // Chunk into batches to avoid giant requests
  const BATCH = Number(process.env.QDRANT_BATCH || "128");
  for (let i = 0; i < itemPoints.length; i += BATCH) {
    await upsertPoints({ url: QDRANT_URL, collection: ITEMS_COLLECTION, points: itemPoints.slice(i, i + BATCH) });
  }
  for (let i = 0; i < chunkPoints.length; i += BATCH) {
    await upsertPoints({ url: QDRANT_URL, collection: CHUNKS_COLLECTION, points: chunkPoints.slice(i, i + BATCH) });
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});


