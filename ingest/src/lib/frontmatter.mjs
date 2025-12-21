function parseInlineArray(value) {
  // Supports YAML-ish inline arrays like:
  // ['A', 'B'] or ["A", "B"] or [A, B]
  // We normalize to JSON and parse.
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return undefined;

  // Quote bare tokens: [A, B] -> ["A","B"]
  // But if quotes already exist, prefer a simpler conversion.
  let jsonish = trimmed;

  // Convert single-quoted strings to double-quoted strings (common in this repo).
  jsonish = jsonish.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, inner) => {
    const safe = String(inner).replace(/"/g, '\\"');
    return `"${safe}"`;
  });

  // If there are still unquoted tokens, quote them.
  // Example: [Gaming, Team Lead] -> ["Gaming","Team Lead"]
  jsonish = jsonish.replace(/\[([^\]]*)\]/, (_, inner) => {
    const parts = inner
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        if (p.startsWith('"') && p.endsWith('"')) return p;
        if (p === "true" || p === "false" || /^-?\d+(\.\d+)?$/.test(p)) return p;
        const safe = p.replace(/"/g, '\\"');
        return `"${safe}"`;
      });
    return `[${parts.join(",")}]`;
  });

  try {
    const parsed = JSON.parse(jsonish);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parseScalar(value) {
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("[") && v.endsWith("]")) {
    const arr = parseInlineArray(v);
    if (arr) return arr;
  }
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

export function parseFrontmatter(markdown) {
  // Only supports standard frontmatter at the beginning of file:
  // ---\n...yaml...\n---\n(body)
  if (!markdown.startsWith("---")) {
    return { data: {}, body: markdown };
  }
  const lines = markdown.split("\n");
  if (lines[0].trim() !== "---") {
    return { data: {}, body: markdown };
  }

  const data = {};
  let i = 1;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "---") {
      i++;
      break;
    }
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const rawValue = line.slice(idx + 1).trim();
    data[key] = parseScalar(rawValue);
  }

  const body = lines.slice(i).join("\n").replace(/^\n+/, "");
  return { data, body };
}


