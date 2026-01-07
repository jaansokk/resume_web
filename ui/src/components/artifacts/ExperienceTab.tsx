import type { RelevantExperienceGroup, RelevantExperienceItem, Artifacts } from '../../utils/chatApi';

interface ExperienceTabProps {
  artifacts: Artifacts | null;
}

export function ExperienceTab({ artifacts }: ExperienceTabProps) {
  if (!artifacts?.relevantExperience?.groups || artifacts.relevantExperience.groups.length === 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--v2-text-tertiary)]">Finding relevant experience...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {artifacts.relevantExperience.groups.map((group: RelevantExperienceGroup, groupIdx: number) => (
        <div key={groupIdx}>
          {group.title && (
            <h3 className="text-xs uppercase tracking-wider text-[var(--v2-accent)] mb-3">{group.title}</h3>
          )}
          {group.items.map((item: RelevantExperienceItem, itemIdx: number) => (
            <div 
              key={`${groupIdx}-${itemIdx}`}
              className="border border-[var(--v2-border-subtle)] rounded-xl p-5 bg-[var(--v2-bg-elevated)]
                         hover:border-[var(--v2-accent)]/30 transition-colors cursor-pointer mb-4"
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

