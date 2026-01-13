import type { FitBriefSection, Artifacts } from '../../../utils/chatApi';

interface FitBriefTabProps {
  artifacts: Artifacts | null;
}

export function FitBriefTab({ artifacts }: FitBriefTabProps) {
  if (!artifacts?.fitBrief?.sections || artifacts.fitBrief.sections.length === 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--v2-text-tertiary)]">Building your fit brief...</p>
      </div>
    );
  }

  // Create a stable key based on content to trigger animation when content changes
  const contentKey = artifacts.fitBrief.sections.map(s => s.id).join('-');
  
  return (
    <div className="p-6 space-y-6" key={contentKey}>
      {artifacts.fitBrief.sections.map((section: FitBriefSection, idx: number) => (
        <div 
          key={section.id}
          className="artifact-item-enter"
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          <div className="border border-[var(--v2-border-subtle)] rounded-xl p-5 bg-[var(--v2-bg-elevated)]">
            <h3 className="text-xs uppercase tracking-wider text-[var(--v2-accent)] mb-3">
              {section.title}
            </h3>
            {renderFitBriefContent(section.content)}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderFitBriefContent(content: string) {
  const bullets = extractBullets(content);

  if (bullets.length > 0) {
    return (
      <ul className="text-sm text-[var(--v2-text-secondary)] space-y-1 leading-relaxed">
        {bullets.map((bullet, bIdx) => (
          <li key={bIdx}>• {bullet}</li>
        ))}
      </ul>
    );
  }

  return (
    <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed">
      {stripMarkdownEmphasis(content)}
    </p>
  );
}

function extractBullets(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  // 1) Standard newline-separated markdown bullets (they render inline inside <p>, so we convert to <li>s)
  const lines = trimmed
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const bulletLines = lines.filter((l) => /^[-•·]\s+/.test(l));
  if (bulletLines.length > 0) {
    return bulletLines
      .map((l) => l.replace(/^[-•·]\s+/, '').trim())
      .filter(Boolean)
      .map(stripMarkdownEmphasis);
  }

  // 2) Some model outputs use inline separators like "· ..." (as seen in Fit Brief screenshots)
  const inline = trimmed.replace(/^[•·]\s+/, '');
  const parts = inline
    .split(/\s*[•·]\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return parts.map(stripMarkdownEmphasis);
  }

  return [];
}

function stripMarkdownEmphasis(s: string): string {
  // Keep it intentionally simple: Fit Brief content is model-generated and should not be rendered as raw HTML.
  return s.replace(/\*\*/g, '').replace(/\*/g, '').trim();
}

