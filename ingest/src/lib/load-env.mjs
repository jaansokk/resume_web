import fs from "node:fs/promises";
import path from "node:path";

function parseDotenv(content) {
  const out = {};
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    let key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1);

    // Support: export KEY=value
    if (key.startsWith("export ")) {
      key = key.slice("export ".length).trim();
    }

    value = value.trimStart();

    // Dotenv-style parsing:
    // - If quoted, read until matching closing quote and ignore trailing content (incl comments)
    // - If unquoted, take the full remainder of the line (no inline comment stripping)
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0];
      const end = value.indexOf(quote, 1);
      if (end !== -1) {
        value = value.slice(1, end);
      } else {
        // No closing quote; fall back to stripping leading quote only.
        value = value.slice(1);
      }
    } else {
      value = value.trim();
    }

    out[key] = value;
  }
  return out;
}

async function loadFileIntoEnv(filePath, { override = false } = {}) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = parseDotenv(raw);
    for (const [k, v] of Object.entries(parsed)) {
      if (!override && process.env[k] !== undefined) continue;
      process.env[k] = v;
    }
    return true;
  } catch (e) {
    if (e && e.code === "ENOENT") return false;
    throw e;
  }
}

export async function loadEnv({ repoRoot, override = false } = {}) {
  // Priority:
  // 1) ENV_FILE (explicit)
  // 2) ingest/.env
  // 3) repo root .env
  if (!repoRoot) throw new Error("loadEnv requires repoRoot");

  const envFile = process.env.ENV_FILE;
  if (envFile) {
    await loadFileIntoEnv(path.resolve(envFile), { override });
    return;
  }

  await loadFileIntoEnv(path.join(repoRoot, "ingest", ".env"), { override });
  await loadFileIntoEnv(path.join(repoRoot, ".env"), { override });
}


