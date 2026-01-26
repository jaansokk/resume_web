#!/usr/bin/env node

/**
 * Script to generate a single markdown file from all content files
 * that have `visibleIn: cv` in their frontmatter.
 */

import { readFileSync, writeFileSync, readdirSync, realpathSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

// Import the frontmatter parser from the ingest module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontmatterPath = join(__dirname, "../../ingest/src/lib/frontmatter.mjs");
const { parseFrontmatter } = await import(frontmatterPath);

// Content directory path (adjust if needed)
const CONTENT_DIR = join(__dirname, "../../../resume_web_content/ui/src/content");

/**
 * Recursively find all markdown files in a directory
 * Handles symlinks by not following them to avoid infinite loops
 */
function findMarkdownFiles(dir, fileList = [], visited = new Set()) {
  // Resolve the real path to avoid processing the same directory twice
  let realPath;
  try {
    realPath = realpathSync(dir);
  } catch {
    realPath = dir;
  }

  // Skip if we've already visited this directory (handles symlinks)
  if (visited.has(realPath)) {
    return fileList;
  }
  visited.add(realPath);

  try {
    const files = readdirSync(dir, { withFileTypes: true });

    files.forEach((dirent) => {
      const filePath = join(dir, dirent.name);

      if (dirent.isDirectory()) {
        // Only recurse into actual directories, not symlinks
        if (!dirent.isSymbolicLink()) {
          findMarkdownFiles(filePath, fileList, visited);
        }
      } else if (dirent.isFile() && dirent.name.endsWith(".md")) {
        fileList.push(filePath);
      }
    });
  } catch (error) {
    console.warn(`Error reading directory ${dir}:`, error.message);
  }

  return fileList;
}

/**
 * Check if a file has visibleIn: cv
 */
function hasCvVisibility(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    const { data } = parseFrontmatter(content);

    if (!data.visibleIn) {
      return false;
    }

    // visibleIn can be an array or a string
    const visibleIn = Array.isArray(data.visibleIn)
      ? data.visibleIn
      : [data.visibleIn];

    return visibleIn.includes("cv");
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Extract body content from a markdown file
 */
function getBodyContent(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    const { data, body } = parseFrontmatter(content);
    return { data, body };
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return { data: {}, body: "" };
  }
}

/**
 * Parse period string to extract sort key for chronological ordering
 * Returns [startYear, isPresent] where isPresent indicates ongoing role
 * Handles formats like "2025 — 2025", "2019 — 2024", "2005 — Present"
 */
function parsePeriodForSorting(period) {
  if (!period || typeof period !== "string") {
    return { startYear: 0, isPresent: false };
  }

  const isPresent = period.toLowerCase().includes("present");
  
  // Handle various separators: —, -, –
  const normalized = period.replace(/[—–]/g, "-");
  
  // Extract first year from the period string
  const match = normalized.match(/\b(\d{4})\b/);
  if (match) {
    return { startYear: parseInt(match[1], 10), isPresent };
  }

  return { startYear: 0, isPresent: false };
}

/**
 * Generate a heading for a file based on its metadata and path
 */
function generateFileHeading(filePath, data) {
  const relativePath = relative(CONTENT_DIR, filePath);
  const parts = relativePath.split("/");
  const category = parts[0]; // background, experience, projects
  const filename = parts[parts.length - 1].replace(".md", "");

  // Try to use meaningful title from frontmatter
  if (data.title) {
    return `## ${data.title}`;
  }
  if (data.company && data.role) {
    return `## ${data.role} - ${data.company}`;
  }
  if (data.company) {
    return `## ${data.company}`;
  }

  // Fallback to filename
  return `## ${filename}`;
}

/**
 * Main function
 */
function main() {
  const outputPath = process.argv[2] || join(__dirname, "../../../resume_web_content/cv-combined.md");

  console.log(`Scanning content directory: ${CONTENT_DIR}`);
  console.log(`Output file: ${outputPath}`);

  // Find all markdown files
  const allFiles = findMarkdownFiles(CONTENT_DIR);
  console.log(`Found ${allFiles.length} markdown files`);

  // Filter files with visibleIn: cv
  const cvFiles = allFiles.filter(hasCvVisibility);
  console.log(`Found ${cvFiles.length} files with visibleIn: cv`);

  if (cvFiles.length === 0) {
    console.warn("No files found with visibleIn: cv");
    return;
  }

  // Extract content from each file
  const sections = [];
  for (const filePath of cvFiles) {
    const { data, body } = getBodyContent(filePath);
    const heading = generateFileHeading(filePath, data);
    sections.push({
      heading,
      body: body.trim(),
      data,
      path: relative(CONTENT_DIR, filePath),
    });
  }

  // Sort sections by category, then by date for experience entries
  sections.sort((a, b) => {
    const aCategory = a.path.split("/")[0];
    const bCategory = b.path.split("/")[0];
    
    // First sort by category
    if (aCategory !== bCategory) {
      const order = { background: 0, experience: 1, projects: 2 };
      return (order[aCategory] || 99) - (order[bCategory] || 99);
    }
    
    // For experience entries, sort by period (latest first)
    if (aCategory === "experience") {
      const aPeriod = parsePeriodForSorting(a.data.period);
      const bPeriod = parsePeriodForSorting(b.data.period);
      
      // If one is "Present" (ongoing), it comes first
      if (aPeriod.isPresent && !bPeriod.isPresent) return -1;
      if (!aPeriod.isPresent && bPeriod.isPresent) return 1;
      
      // Both ongoing or both ended: sort by start year (latest first)
      return bPeriod.startYear - aPeriod.startYear;
    }
    
    // For other categories, sort by filename
    return a.path.localeCompare(b.path);
  });

  // Combine into single markdown
  const combined = sections
    .map((section) => {
      return `${section.heading}\n\n${section.body}`;
    })
    .join("\n\n---\n\n");

  // Write output
  writeFileSync(outputPath, combined, "utf-8");
  console.log(`\n✅ Generated combined CV markdown file: ${outputPath}`);
  console.log(`   Total sections: ${sections.length}`);
}

main();
