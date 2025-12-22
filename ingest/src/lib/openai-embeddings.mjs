import { sha256Hex } from "./hash.mjs";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export async function embedTexts({
  texts,
  model = process.env.OPENAI_EMBEDDING_MODEL || process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
  apiKey = process.env.OPENAI_API_KEY,
  dimensions
}) {
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Run with --dry-run to skip embedding, or set OPENAI_API_KEY to generate vectors."
    );
  }

  // OpenAI embeddings endpoint supports batching; keep modest batch size.
  const batchSize = Number(process.env.OPENAI_EMBEDDING_BATCH || 64);
  const out = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const payload = {
      model,
      input: batch
    };
    if (dimensions) payload.dimensions = dimensions;

    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const text = await res.text();
          // Retry on rate limits / transient 5xx.
          if (res.status === 429 || res.status >= 500) {
            lastErr = new Error(`OpenAI embeddings failed (${res.status}): ${text.slice(0, 500)}`);
            await sleep(300 * attempt * attempt);
            continue;
          }
          throw new Error(`OpenAI embeddings failed (${res.status}): ${text.slice(0, 800)}`);
        }
        const json = await res.json();
        const vectors = (json.data || []).map((d) => d.embedding);
        if (vectors.length !== batch.length) {
          throw new Error(`OpenAI embeddings returned ${vectors.length} vectors for batch size ${batch.length}`);
        }
        out.push(...vectors);
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
        await sleep(300 * attempt * attempt);
      }
    }
    if (lastErr) throw lastErr;
  }

  return out;
}

export function makeChunkCacheKey({ slug, chunkId, text, model, dimensions }) {
  const h = sha256Hex(text);
  return `${slug}::${chunkId}::${model}${dimensions ? `::${dimensions}` : ""}::${h}`;
}


