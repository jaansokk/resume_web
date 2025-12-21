function normalizeWhitespace(text) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function splitByHeadings(markdown) {
  // Split on headings level 1-3: ^#{1,3} <text>
  const lines = markdown.split("\n");
  const sections = [];
  let current = { heading: "", lines: [] };

  const pushCurrent = () => {
    const content = current.lines.join("\n").trim();
    if (current.heading || content) {
      sections.push({ heading: current.heading, content });
    }
  };

  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)\s*$/);
    if (m) {
      pushCurrent();
      current = { heading: m[2].trim(), lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  pushCurrent();
  return sections.length ? sections : [{ heading: "", content: markdown.trim() }];
}

function splitIntoParagraphs(text) {
  // Preserve bullets inside a paragraph; split on blank lines.
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];
  return normalized.split(/\n\s*\n/g).map((p) => p.trim()).filter(Boolean);
}

function buildChunksFromParagraphs(paragraphs, { targetMin = 600, targetMax = 900, overlapParagraphs = 1 } = {}) {
  const chunks = [];
  let buf = [];
  let bufLen = 0;

  const flush = () => {
    if (!buf.length) return;
    chunks.push(buf.join("\n\n").trim());
    buf = [];
    bufLen = 0;
  };

  for (const para of paragraphs) {
    const paraLen = para.length;
    if (bufLen && bufLen + 2 + paraLen > targetMax) {
      flush();
      // overlap: carry last N paragraphs into next chunk
      const carry = chunks.length ? chunks[chunks.length - 1] : "";
      if (overlapParagraphs > 0 && carry) {
        const carryParas = splitIntoParagraphs(carry).slice(-overlapParagraphs);
        buf = [...carryParas];
        bufLen = buf.join("\n\n").length;
      }
    }
    buf.push(para);
    bufLen = buf.join("\n\n").length;

    // If we overshoot targetMax with a single huge paragraph, still flush.
    if (bufLen >= targetMax) {
      flush();
    }
  }
  flush();

  // Merge too-small trailing chunk into previous when possible.
  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1];
    if (last.length < targetMin) {
      const prev = chunks[chunks.length - 2];
      if (prev.length + 2 + last.length <= targetMax + 200) {
        chunks.splice(chunks.length - 2, 2, `${prev}\n\n${last}`.trim());
      }
    }
  }

  return chunks;
}

export function chunkMarkdownBody(body, { type } = {}) {
  const normalized = normalizeWhitespace(body);
  if (!normalized) return [];

  const sections = splitByHeadings(normalized);
  const out = [];
  for (const section of sections) {
    const paragraphs = splitIntoParagraphs(section.content);
    if (!paragraphs.length) continue;
    const chunks = buildChunksFromParagraphs(paragraphs, {
      targetMin: type === "background" ? 450 : 600,
      targetMax: type === "background" ? 800 : 900,
      overlapParagraphs: 1
    });
    for (const text of chunks) {
      out.push({ section: section.heading || "", text });
    }
  }
  return out;
}


