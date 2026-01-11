import type { Artifacts } from '../../../utils/chatApi';
import { FitBriefTab } from './FitBriefTab';
import { ExperienceTab } from './ExperienceTab';

interface ArtifactsPanelProps {
  activeTab: 'brief' | 'experience';
  onTabChange: (tab: 'brief' | 'experience') => void;
  artifacts: Artifacts | null;
  onShareClick: () => void;
}

export function ArtifactsPanel({ 
  activeTab, 
  onTabChange, 
  artifacts, 
  onShareClick 
}: ArtifactsPanelProps) {
  return (
    <div className="flex-1 lg:w-1/2 border-r border-[var(--v2-border-subtle)] flex flex-col overflow-hidden">
      {/* Fixed header: Tabs + Share */}
      <div className="flex-shrink-0 bg-[var(--v2-bg)] border-b border-[var(--v2-border-subtle)]">
        {/* Tabs + Share button row */}
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex gap-4">
            <button
              onClick={() => onTabChange('brief')}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                activeTab === 'brief' 
                  ? 'border-[var(--v2-accent)] text-[var(--v2-text)]' 
                  : 'border-transparent text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)]'
              }`}
            >
              Fit Brief
            </button>
            <button
              onClick={() => onTabChange('experience')}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                activeTab === 'experience' 
                  ? 'border-[var(--v2-accent)] text-[var(--v2-text)]' 
                  : 'border-transparent text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)]'
              }`}
            >
              Relevant Experience
            </button>
          </div>
          
          {/* Share button - always visible (shares both artifacts) */}
          <button
            onClick={onShareClick}
            className="px-4 py-2 border border-[var(--v2-border)] rounded-full
                       text-xs text-[var(--v2-text-secondary)]
                       hover:text-[var(--v2-text)] hover:border-[var(--v2-accent)]/50
                       transition-all duration-200"
          >
            Share
          </button>
        </div>
        
        {/* Title row (brief tab only) */}
        {activeTab === 'brief' && artifacts?.fitBrief && (
          <div className="px-6 py-3 flex items-center gap-2 text-xs text-[var(--v2-accent)] border-t border-[var(--v2-border-subtle)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--v2-accent)] animate-pulse-subtle" />
            <span className="uppercase tracking-wider">{artifacts.fitBrief.title}</span>
          </div>
        )}
      </div>
      
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'brief' ? (
          <FitBriefTab artifacts={artifacts} />
        ) : (
          <ExperienceTab artifacts={artifacts} />
        )}
      </div>
    </div>
  );
}

