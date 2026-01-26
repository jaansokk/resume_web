import { useEffect, useState } from 'react';

const STORAGE_KEY = 'thinking-mode-enabled';

interface ThinkingToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/**
 * Toggle for enabling/disabling extended thinking mode.
 * Persists preference to localStorage.
 */
export function ThinkingToggle({ enabled, onChange }: ThinkingToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`group flex items-center gap-1.5 px-2 py-1 rounded-full text-xs
                  transition-all duration-200
                  ${enabled 
                    ? 'bg-[var(--v2-accent)]/10 text-[var(--v2-accent)]' 
                    : 'bg-transparent text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)]'
                  }`}
      title={enabled ? 'Thinking mode enabled (click to disable)' : 'Enable thinking mode'}
      aria-pressed={enabled}
    >
      {/* Brain/thinking icon */}
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-3.5 h-3.5 transition-transform duration-200 ${enabled ? 'scale-110' : ''}`}
      >
        {/* Simple lightbulb/brain icon */}
        <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7Z" />
        <path d="M9 21h6" />
        <path d="M12 17v4" />
        {/* Sparkles when enabled */}
        {enabled && (
          <>
            <circle cx="12" cy="9" r="1" fill="currentColor" className="animate-pulse" />
          </>
        )}
      </svg>
      <span className="hidden sm:inline">
        {enabled ? 'Thinking' : 'Think'}
      </span>
    </button>
  );
}

/**
 * Hook to manage thinking mode preference with localStorage persistence.
 */
export function useThinkingMode(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(true); // Default to enabled

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setEnabled(stored === 'true');
    }
  }, []);

  // Persist to localStorage when changed
  const setThinkingEnabled = (value: boolean) => {
    setEnabled(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(value));
    }
  };

  return [enabled, setThinkingEnabled];
}
