export interface CVSkillColumn {
  title: string;
  items: string[];
}

export interface CVTimelineItem {
  title: string;
  org?: string;
  year?: string;
}

export interface ParsedSkillsEducation {
  skills: {
    columns: CVSkillColumn[];
  };
  certifications: CVTimelineItem[];
  education: CVTimelineItem[];
}

/**
 * Build-time parser for extracting Skills + Education/Certifications from markdown.
 *
 * Supports two authoring formats for the Skills section:
 * 1) Preferred: "### Column title" + bullets under it (maps cleanly to 3 columns)
 * 2) Current: "- **Category:** item, item, item" bullets (auto-mapped into 3 columns)
 */
export function parseSkillsEducationMarkdown(markdown: string): ParsedSkillsEducation {
  const sections = splitIntoH2Sections(markdown);

  const skillsSection =
    findSection(sections, 'technical skills') ??
    findSection(sections, 'skills');

  const certsSection =
    findSection(sections, 'professional training & certifications') ??
    findSection(sections, 'professional training and certifications') ??
    findSection(sections, 'certifications');

  const educationSection = findSection(sections, 'education');

  return {
    skills: { columns: skillsSection ? parseSkillsColumns(skillsSection.content) : [] },
    certifications: certsSection ? parseTimelineBullets(certsSection.content) : [],
    education: educationSection ? parseTimelineBullets(educationSection.content) : [],
  };
}

interface Section {
  heading: string;
  content: string;
}

function findSection(sections: Section[], headingLower: string): Section | undefined {
  return sections.find((s) => normalize(s.heading) === headingLower);
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function splitIntoH2Sections(markdown: string): Section[] {
  const sections: Section[] = [];
  const lines = markdown.split('\n');

  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
      }
      currentHeading = h2Match[1].trim();
      currentContent = [];
      continue;
    }
    if (currentHeading) currentContent.push(line);
  }

  if (currentHeading) {
    sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
  }

  return sections;
}

function parseSkillsColumns(content: string): CVSkillColumn[] {
  // Preferred format: ### headings for the 3 columns.
  const h3Cols = splitIntoH3Sections(content);
  if (h3Cols.length > 0) {
    const cols = h3Cols
      .map((c) => ({ title: c.heading, items: extractPlainBullets(c.content) }))
      .filter((c) => c.items.length > 0);

    if (cols.length <= 3) return cols;

    // Enforce 3 columns by merging overflow into the last column.
    return [
      cols[0],
      cols[1],
      { title: cols[2].title, items: [...cols[2].items, ...cols.slice(3).flatMap((x) => x.items)] },
    ];
  }

  // Current format: "- **Category:** a, b, c"
  const categories = extractCategorySkills(content);

  const languages = categories.get('Languages') ?? [];
  const web = categories.get('Web Technologies') ?? [];
  const cloud = categories.get('Cloud & Infra') ?? [];
  const design = categories.get('Design Tools') ?? [];
  const other = categories.get('Other') ?? [];

  return [
    { title: 'Languages', items: languages },
    { title: 'Web', items: web },
    { title: 'Infra & Tools', items: [...cloud, ...design, ...other] },
  ].filter((c) => c.items.length > 0);
}

interface H3Section {
  heading: string;
  content: string;
}

function splitIntoH3Sections(markdown: string): H3Section[] {
  const sections: H3Section[] = [];
  const lines = markdown.split('\n');

  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
      }
      currentHeading = h3Match[1].trim();
      currentContent = [];
      continue;
    }
    if (currentHeading) currentContent.push(line);
  }

  if (currentHeading) {
    sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
  }

  return sections;
}

function extractPlainBullets(content: string): string[] {
  const out: string[] = [];
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*-\s+(.+)\s*$/);
    if (m) out.push(stripMarkdownEmphasis(m[1].trim()));
  }
  return out;
}

function extractCategorySkills(content: string): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const line of content.split('\n')) {
    // Accept both:
    // - **Languages:** Python, TypeScript        (colon inside bold)
    // - **Languages**: Python, TypeScript        (colon outside bold)
    // - Languages: Python, TypeScript            (no bold)
    const insideBold = line.match(/^\s*-\s+\*\*(.+?):\*\*\s*(.+)\s*$/);
    const outsideBold = line.match(/^\s*-\s+\*\*(.+?)\*\*:\s*(.+)\s*$/);
    const plain = line.match(/^\s*-\s+([^:*][^:]*?)\s*:\s*(.+)\s*$/);

    const categoryRaw = (insideBold?.[1] ?? outsideBold?.[1] ?? plain?.[1])?.trim();
    const itemsRaw = (insideBold?.[2] ?? outsideBold?.[2] ?? plain?.[2])?.trim();
    if (!categoryRaw || !itemsRaw) continue;

    const category = stripMarkdownEmphasis(categoryRaw.replace(/:\s*$/, '').trim());
    const items = itemsRaw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .map(stripMarkdownEmphasis);

    if (items.length === 0) continue;
    map.set(category, items);
  }

  return map;
}

function parseTimelineBullets(content: string): CVTimelineItem[] {
  const out: CVTimelineItem[] = [];

  for (const line of content.split('\n')) {
    const m = line.match(/^\s*-\s+(.+)\s*$/);
    if (!m) continue;
    const item = parseTimelineLine(m[1].trim());
    if (item) out.push(item);
  }

  return out;
}

function parseTimelineLine(text: string): CVTimelineItem | null {
  // Handles:
  // - "**Title** (Org, 2019)"
  // - "**Title**, Org (2002 - 2006)"
  // - "**Title** (1990 - 2002)"
  const boldTitleMatch = text.match(/^\*\*(.+?)\*\*(.*)$/);
  const title = stripMarkdownEmphasis((boldTitleMatch ? boldTitleMatch[1] : text).trim());
  const rest = (boldTitleMatch ? boldTitleMatch[2] : '').trim();

  if (!title) return null;

  // Prefer extracting year/range from trailing parentheses.
  const parenMatch = rest.match(/\(([^)]+)\)\s*$/);
  const paren = parenMatch ? parenMatch[1].trim() : undefined;

  let org: string | undefined;
  let year: string | undefined;

  if (paren) {
    // Often "Org, 2019" or "Org / Person, 2016" or "1990 - 2002"
    const lastComma = paren.lastIndexOf(',');
    if (lastComma !== -1) {
      org = paren.slice(0, lastComma).trim();
      year = paren.slice(lastComma + 1).trim();
    } else {
      year = paren;
    }
  }

  if (!org) {
    // If we have ", Org" outside parens: "**Title**, Org ..."
    const commaOrg = rest.match(/^,\s*([^()]+?)\s*(?:\(|$)/);
    if (commaOrg) org = commaOrg[1].trim();
  }

  return { title, org: org || undefined, year: year || undefined };
}

function stripMarkdownEmphasis(s: string): string {
  return s.replace(/\*\*/g, '').replace(/\*/g, '').trim();
}

