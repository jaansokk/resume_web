/**
 * Build-time parser for extracting structured sections from role markdown bodies.
 * Extracts Impact, Context, and Key Projects sections for CV rendering.
 */

export interface KeyProject {
  title: string;
  oneLiner?: string;
  impact: string[];
  details?: string;
}

export interface ParsedRole {
  impact: string[];
  context: string[];
  keyProjects: KeyProject[];
}

/**
 * Parse markdown body to extract CV-specific sections.
 * @param markdown - The markdown body content (without frontmatter)
 * @returns Parsed sections for CV rendering
 */
export function parseRoleMarkdown(markdown: string): ParsedRole {
  const result: ParsedRole = {
    impact: [],
    context: [],
    keyProjects: [],
  };

  // Split into sections by ## headings
  const sections = splitIntoSections(markdown);

  // Extract Impact bullets
  const impactSection = sections.find((s) => s.heading === 'Impact');
  if (impactSection) {
    result.impact = extractBullets(impactSection.content);
  }

  // Extract Context bullets
  const contextSection = sections.find((s) => s.heading === 'Context');
  if (contextSection) {
    result.context = extractBullets(contextSection.content);
  }

  // Extract Key Projects
  const keyProjectsSection = sections.find((s) => s.heading === 'Key projects');
  if (keyProjectsSection) {
    result.keyProjects = parseKeyProjects(keyProjectsSection.content);
  }

  return result;
}

interface Section {
  heading: string;
  content: string;
}

/**
 * Split markdown into sections by ## headings
 */
function splitIntoSections(markdown: string): Section[] {
  const sections: Section[] = [];
  const lines = markdown.split('\n');

  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      // Save previous section
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join('\n').trim(),
        });
      }
      // Start new section
      currentHeading = h2Match[1].trim();
      currentContent = [];
    } else if (currentHeading) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      content: currentContent.join('\n').trim(),
    });
  }

  return sections;
}

/**
 * Extract bullet points from markdown content
 */
function extractBullets(content: string): string[] {
  const bullets: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const bulletMatch = line.match(/^-\s+(.+)$/);
    if (bulletMatch) {
      bullets.push(bulletMatch[1].trim());
    }
  }

  return bullets;
}

/**
 * Parse Key Projects section into structured project objects
 */
function parseKeyProjects(content: string): KeyProject[] {
  const projects: KeyProject[] = [];
  const lines = content.split('\n');

  let currentProject: Partial<KeyProject> | null = null;
  let currentField: 'impact' | 'details' | null = null;
  let currentFieldLines: string[] = [];

  const saveCurrentField = () => {
    if (currentProject && currentField && currentFieldLines.length > 0) {
      if (currentField === 'impact') {
        currentProject.impact = extractBullets(currentFieldLines.join('\n'));
      } else if (currentField === 'details') {
        currentProject.details = currentFieldLines.join('\n').trim();
      }
    }
    currentFieldLines = [];
  };

  for (const line of lines) {
    // Check for ### project heading
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      // Save previous project
      saveCurrentField();
      if (currentProject && currentProject.title) {
        projects.push({
          title: currentProject.title,
          oneLiner: currentProject.oneLiner,
          impact: currentProject.impact || [],
          details: currentProject.details,
        });
      }
      // Start new project
      currentProject = {
        title: h3Match[1].trim(),
        impact: [],
      };
      currentField = null;
      continue;
    }

    if (!currentProject) continue;

    // Check for **One-liner:**
    const oneLinerMatch = line.match(/^\*\*One-liner:\*\*\s*(.+)$/);
    if (oneLinerMatch) {
      currentProject.oneLiner = oneLinerMatch[1].trim();
      continue;
    }

    // Check for **Impact:**
    if (line.match(/^\*\*Impact:\*\*\s*$/)) {
      saveCurrentField();
      currentField = 'impact';
      continue;
    }

    // Check for **Details:**
    if (line.match(/^\*\*Details:\*\*\s*$/)) {
      saveCurrentField();
      currentField = 'details';
      continue;
    }

    // Collect field content
    if (currentField) {
      currentFieldLines.push(line);
    }
  }

  // Save last project
  saveCurrentField();
  if (currentProject && currentProject.title) {
    projects.push({
      title: currentProject.title,
      oneLiner: currentProject.oneLiner,
      impact: currentProject.impact || [],
      details: currentProject.details,
    });
  }

  return projects;
}
