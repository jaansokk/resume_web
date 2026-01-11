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

  return (
    <div className="p-6 space-y-6">
      {artifacts.fitBrief.sections.map((section: FitBriefSection, idx: number) => (
        <div 
          key={section.id}
          className="transition-all duration-500 opacity-100 translate-y-0"
        >
          <div className="border border-[var(--v2-border-subtle)] rounded-xl p-5 bg-[var(--v2-bg-elevated)]">
            <h3 className="text-xs uppercase tracking-wider text-[var(--v2-accent)] mb-3">
              {section.title}
            </h3>
            <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed">
              {section.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

