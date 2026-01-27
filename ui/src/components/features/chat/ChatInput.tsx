import { useEffect, useRef } from 'react';
import { ThinkingToggle } from './ThinkingToggle';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  isLoading: boolean;
  variant?: 'handshake' | 'chat' | 'split';
  thinkingEnabled?: boolean;
  onThinkingChange?: (enabled: boolean) => void;
}

export function ChatInput({ 
  value, 
  onChange, 
  onSend, 
  placeholder, 
  isLoading,
  variant = 'chat',
  thinkingEnabled = false,
  onThinkingChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeToFit = () => {
    const el = textareaRef.current;
    if (!el) return;

    // Reset then grow to content (capped at 5 lines).
    el.style.height = 'auto';

    const cs = window.getComputedStyle(el);
    const lineHeight = Number.parseFloat(cs.lineHeight || '20') || 20;
    const paddingTop = Number.parseFloat(cs.paddingTop || '0') || 0;
    const paddingBottom = Number.parseFloat(cs.paddingBottom || '0') || 0;
    const maxHeight = lineHeight * 5 + paddingTop + paddingBottom;

    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  useEffect(() => {
    resizeToFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return; // newline
    e.preventDefault(); // stop newline
    if (!isLoading) onSend();
  };

  const containerClass = variant === 'split'
    ? 'bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)]'
    : 'bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)]';

  return (
    <div className={`${containerClass} rounded-[1.625rem] overflow-hidden flex items-end gap-2 px-2 py-1`}>
      {/* Thinking toggle */}
      {onThinkingChange && (
        <div className="self-center ml-2">
          <ThinkingToggle enabled={thinkingEnabled} onChange={onThinkingChange} />
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 bg-transparent px-5 py-3 text-sm leading-relaxed
                   placeholder:text-[var(--v2-text-tertiary)]
                   focus:outline-none
                   resize-none overflow-y-hidden"
        disabled={isLoading}
      />
      <button
        onClick={onSend}
        disabled={isLoading}
        className={`self-center px-6 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-[1.375rem]
                   text-sm font-medium
                   hover:opacity-90 transition-opacity
                   disabled:opacity-50`}
      >
        Send
      </button>
    </div>
  );
}

