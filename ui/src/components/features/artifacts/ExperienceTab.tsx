import type { RelevantExperienceGroup, RelevantExperienceItem, Artifacts } from '../../../utils/chatApi';

interface ExperienceTabProps {
  artifacts: Artifacts | null;
}

export function ExperienceTab({ artifacts }: ExperienceTabProps) {
  if (!artifacts) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--v2-text-tertiary)]">Finding relevant experience...</p>
      </div>
    );
  }

  const groups = artifacts.relevantExperience?.groups || [];
  if (groups.length === 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--v2-text-tertiary)]">No relevant experience to show yet.</p>
      </div>
    );
  }

  // Create a stable key based on content to trigger animation when content changes
  const contentKey = groups
    .flatMap(g => g.items.map(i => i.slug))
    .join('-');
  
  return (
    <div className="p-6 space-y-4" key={contentKey}>
      {groups.map((group: RelevantExperienceGroup, groupIdx: number) => (
        <div key={groupIdx} className="artifact-item-enter" style={{ animationDelay: `${groupIdx * 100}ms` }}>
          {group.title && (
            <h3 className="text-xs uppercase tracking-wider text-[var(--v2-accent)] mb-3">
              {group.title}
            </h3>
          )}
          {group.items.map((item: RelevantExperienceItem, itemIdx: number) => (
            <div 
              key={`${groupIdx}-${itemIdx}`}
              className="border border-[var(--v2-border-subtle)] rounded-xl p-5 bg-[var(--v2-bg-elevated)]
                         hover:border-[var(--v2-accent)]/30 transition-colors cursor-pointer mb-4
                         artifact-item-enter"
              style={{ animationDelay: `${groupIdx * 100 + (itemIdx + 1) * 50}ms` }}
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-[var(--v2-text)]">{item.title}</h4>
                {item.period && (
                  <span className="text-xs text-[var(--v2-text-tertiary)]">{item.period}</span>
                )}
              </div>
              {item.role && (
                <p className="text-xs text-[var(--v2-accent)] mb-2">{item.role}</p>
              )}
              {item.bullets && item.bullets.length > 0 && (
                <ul className="text-sm text-[var(--v2-text-secondary)] space-y-1">
                  {item.bullets.map((bullet: string, bIdx: number) => (
                    <li key={bIdx}>• {bullet}</li>
                  ))}
                </ul>
              )}
              {item.whyRelevant && (
                <p className="text-xs text-[var(--v2-text-tertiary)] mt-3 italic">{item.whyRelevant}</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

