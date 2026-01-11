import { quickReplies } from '../../domain/types';

interface QuickReplyGridProps {
  onReplySelect: (label: string) => void;
  showButtons: boolean;
}

export function QuickReplyGrid({ onReplySelect, showButtons }: QuickReplyGridProps) {
  return (
    <div 
      className={`grid grid-cols-2 gap-3 w-full max-w-2xl mx-auto mb-6 transition-all duration-700 ${
        showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {quickReplies.map((reply, idx) => (
        <button
          key={reply.id}
          onClick={() => onReplySelect(reply.label)}
          className="group flex items-center gap-2 px-4 py-3
                     bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)] 
                     rounded-full
                     hover:border-[var(--v2-accent)]/30 hover:bg-[var(--v2-bg-card)]
                     transition-all duration-300"
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <span className="text-sm text-[var(--v2-text-tertiary)] group-hover:text-[var(--v2-accent)] transition-colors">
            {reply.icon}
          </span>
          <span className="text-sm text-[var(--v2-text-secondary)] group-hover:text-[var(--v2-text)] transition-colors">
            {reply.label}
          </span>
        </button>
      ))}
    </div>
  );
}

