import { signSigV4 } from "./sigv4.mjs";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing ${name}. Run via aws-vault so credentials are exported, e.g.\n` +
        `  aws-vault exec resume-web-ingest -- pnpm ingest:verify\n`
    );
  }
  return v;
}

function getAwsCreds() {
  return {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
    sessionToken: process.env.AWS_SESSION_TOKEN
  };
}

export async function aossFetch({
  endpoint,
  method,
  path,
  query,
  body,
  headers,
  region = process.env.AWS_REGION || "eu-central-1",
  service = process.env.AOSS_SERVICE || "aoss"
}) {
  const url = new URL(endpoint);
  url.pathname = path.startsWith("/") ? path : `/${path}`;
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  }

  const payload = body || "";
  const { accessKeyId, secretAccessKey, sessionToken } = getAwsCreds();
  const signedHeaders = signSigV4({
    method,
    url: url.toString(),
    headers: headers || {},
    body: payload,
    region,
    service,
    accessKeyId,
    secretAccessKey,
    sessionToken
  });

  const res = await fetch(url.toString(), {
    method,
    headers: signedHeaders,
    body: payload && method !== "GET" && method !== "HEAD" ? payload : undefined
  });
  const text = await res.text();
  return { res, text };
}

export function buildBulkNdjsonIndex({ index, id, doc }) {
  return `{"index":{"_index":"${index}","_id":"${id}"}}\n${JSON.stringify(doc)}\n`;
}

export async function bulkUpsert({
  endpoint,
  ndjson,
  maxBytes = 5 * 1024 * 1024
}) {
  // Split into chunks by bytes to stay under request limits.
  const parts = [];
  let buf = "";
  for (const block of ndjson) {
    if (Buffer.byteLength(buf + block, "utf8") > maxBytes && buf) {
      parts.push(buf);
      buf = "";
    }
    buf += block;
  }
  if (buf) parts.push(buf);

  for (let i = 0; i < parts.length; i++) {
    const body = parts[i];
    const { res, text } = await aossFetch({
      endpoint,
      method: "POST",
      path: "/_bulk",
      query: { refresh: "true" },
      body,
      headers: { "content-type": "application/x-ndjson" }
    });

    if (!res.ok) {
      throw new Error(`AOSS bulk failed (${res.status}): ${text.slice(0, 1200)}`);
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`AOSS bulk returned non-JSON (${res.status}): ${text.slice(0, 1200)}`);
    }
    if (json.errors) {
      const firstErr = (json.items || []).find((it) => it.index && it.index.error)?.index?.error;
      throw new Error(`AOSS bulk had item errors. First error: ${JSON.stringify(firstErr).slice(0, 1200)}`);
    }
  }
}


