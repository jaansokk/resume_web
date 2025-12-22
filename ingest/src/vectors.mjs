import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./lib/frontmatter.mjs";
import { sha256Hex } from "./lib/hash.mjs";
import { chunkMarkdownBody } from "./lib/chunking.mjs";
import { embedTexts, makeChunkCacheKey } from "./lib/openai-embeddings.mjs";
import { buildBulkNdjsonIndex, bulkUpsert, countDocs } from "./lib/opensearch-bulk.mjs";
import { loadEnv } from "./lib/load-env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const DEFAULT_ENDPOINT = "https://09eid9cakc659fdreqsj.eu-central-1.aoss.amazonaws.com";

const UI_CONTENT_ROOT = path.join(repoRoot, "ui", "src", "content");
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
  for (const k of cfg.required) {
    if (k === "tags") {
      assert(Array.isArray(data.tags), `[${type}/${slug}] missing required frontmatter: tags[]`);
      continue;
    }
    assert(typeof data[k] === "string" && data[k].trim(), `[${type}/${slug}] missing required frontmatter: ${k}`);
  }

  const doc = {
    type,
    uiVisible: cfg.uiVisible,
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

  // Backward-compatible env names:
  const endpoint =
    process.env.AOSS_ENDPOINT ||
    process.env.OPENSEARCH_ENDPOINT ||
    process.env.OS_ENDPOINT ||
    DEFAULT_ENDPOINT;
  const ITEMS_INDEX =
    process.env.AOSS_ITEMS_INDEX ||
    process.env.OS_INDEX_ITEMS ||
    "content_items_v1";
  const CHUNKS_INDEX =
    process.env.AOSS_CHUNKS_INDEX ||
    process.env.OS_INDEX_CHUNKS ||
    "content_chunks_v1";

  const model =
    process.env.OPENAI_EMBEDDING_MODEL ||
    process.env.OPENAI_EMBED_MODEL ||
    "text-embedding-3-small";
  const dimensions = process.env.OPENAI_EMBEDDING_DIM ? Number(process.env.OPENAI_EMBEDDING_DIM) : undefined;

  console.log(`AOSS endpoint: ${endpoint}`);
  console.log(`Indexes: items=${ITEMS_INDEX} chunks=${CHUNKS_INDEX}`);
  console.log(`Embedding model: ${model}${dimensions ? ` (dimensions=${dimensions})` : ""}`);
  console.log(`Mode: ${dryRun ? "dry-run" : noIndex ? "embed-only" : "embed+index"}`);

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

  // Bulk indexing
  const bulkBlocks = [];

  for (const doc of itemDocs) {
    // NOTE (OpenSearch Serverless): Bulk API does NOT support custom document IDs (_id).
    // Store the slug in the document and let AOSS generate the document ID.
    bulkBlocks.push(buildBulkNdjsonIndex({ index: ITEMS_INDEX, id: undefined, doc }));
  }
  for (const doc of chunkDocs) {
    assert(Array.isArray(doc.embedding), `Missing embedding for ${doc.slug}__${doc.chunkId}`);
    // NOTE (OpenSearch Serverless): Bulk API does NOT support custom document IDs (_id).
    // We include slug+chunkId as fields for deterministic lookup if needed.
    bulkBlocks.push(buildBulkNdjsonIndex({ index: CHUNKS_INDEX, id: undefined, doc }));
  }

  console.log(`Indexing to AOSS: operations=${bulkBlocks.length}`);
  await bulkUpsert({
    endpoint,
    ndjson: bulkBlocks,
    refresh: process.env.AOSS_REFRESH || process.env.OS_REFRESH // optional; avoid refresh=true
  });

  // Serverless is eventually consistent; counts may lag briefly. Retry a few times.
  let itemsCount;
  let chunksCount;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      itemsCount = await countDocs({ endpoint, index: ITEMS_INDEX });
      chunksCount = await countDocs({ endpoint, index: CHUNKS_INDEX });
      break;
    } catch (e) {
      if (attempt === 5) throw e;
      await sleep(500 * attempt);
    }
  }
  if (itemsCount && chunksCount) {
    console.log(`AOSS counts: ${ITEMS_INDEX}=${itemsCount.count} ${CHUNKS_INDEX}=${chunksCount.count}`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});


