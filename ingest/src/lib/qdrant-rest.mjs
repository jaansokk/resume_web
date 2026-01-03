import crypto from "node:crypto";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stripTrailingSlash(s) {
  return String(s || "").replace(/\/$/, "");
}

function uuidToBytes(uuid) {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  assert(hex.length === 32, `Invalid UUID: ${uuid}`);
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function bytesToUuid(bytes) {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20)
  ].join("-");
}

// RFC4122 UUID v5 = SHA1(namespace_bytes + name_bytes)
export function uuidv5(namespaceUuid, name) {
  const ns = uuidToBytes(namespaceUuid);
  const nameBytes = Buffer.from(String(name), "utf8");
  const sha1 = crypto.createHash("sha1");
  sha1.update(Buffer.from(ns));
  sha1.update(nameBytes);
  const digest = sha1.digest(); // 20 bytes
  const bytes = new Uint8Array(digest.slice(0, 16));
  // Set version 5
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  // Set variant RFC4122
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

export async function qdrantRequest({ url, method, path, body }) {
  const endpoint = stripTrailingSlash(url);
  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Qdrant ${method} ${path} failed (${res.status}): ${text.slice(0, 1200)}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function ensureCollection({
  url,
  name,
  vectorName,
  dim,
  distance,
  onExists = "skip"
}) {
  assert(vectorName, "vectorName required");
  const existing = await qdrantRequest({ url, method: "GET", path: `/collections/${name}` }).catch(() => null);
  if (existing && existing.result) {
    if (onExists === "skip") return { created: false };
  }

  const body = {
    vectors: {
      [vectorName]: {
        size: dim,
        distance
      }
    }
  };
  await qdrantRequest({ url, method: "PUT", path: `/collections/${name}`, body });
  return { created: true };
}

export async function upsertPoints({ url, collection, points, wait = true }) {
  assert(Array.isArray(points) && points.length, "points[] required");
  const body = { points };
  const qs = wait ? "?wait=true" : "";
  return await qdrantRequest({
    url,
    method: "PUT",
    path: `/collections/${collection}/points${qs}`,
    body
  });
}


