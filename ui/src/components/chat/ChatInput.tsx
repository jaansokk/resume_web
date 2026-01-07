interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  isLoading: boolean;
  variant?: 'handshake' | 'chat' | 'split';
}

export function ChatInput({ 
  value, 
  onChange, 
  onSend, 
  placeholder, 
  isLoading,
  variant = 'chat'
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSend();
    }
  };

  const containerClass = variant === 'split'
    ? 'bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)]'
    : 'bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)]';

  return (
    <div className={`${containerClass} rounded-full flex items-center px-2 py-1`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent px-5 py-3 text-sm
                   placeholder:text-[var(--v2-text-tertiary)]
                   focus:outline-none"
        disabled={isLoading}
      />
      <button
        onClick={onSend}
        disabled={isLoading}
        className="px-6 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full
                   text-sm font-medium
                   hover:opacity-90 transition-opacity
                   disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}

