import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  index: number;
  isInSplitView?: boolean;
}

export function ChatMessage({ message, index, isInSplitView = false }: ChatMessageProps) {
  if (isInSplitView) {
    // Simplified layout for split view
    return (
      <div>
        {message.role === 'assistant' && (
          <div className="text-xs text-[var(--v2-text-tertiary)] mb-2 uppercase tracking-wider">Jaan</div>
        )}
        <p className={`text-sm leading-relaxed ${
          message.role === 'assistant' ? 'text-[var(--v2-text-secondary)]' : 'text-[var(--v2-text)]'
        }`}>
          {message.text}
        </p>
      </div>
    );
  }

  // Full layout for chat view
  return (
    <div 
      className={`animate-fade-up opacity-0 ${message.role === 'user' ? 'text-right' : ''}`}
      style={{ animationFillMode: 'forwards', animationDelay: `${index * 100}ms` }}
    >
      <div className={`inline-block max-w-[85%] ${
        message.role === 'user' 
          ? 'bg-[var(--v2-accent-dim)] text-[var(--v2-text)] rounded-3xl rounded-br-lg px-5 py-3'
          : 'text-left'
      }`}>
        {message.role === 'assistant' && (
          <div className="text-xs text-[var(--v2-text-tertiary)] mb-2 uppercase tracking-wider">Jaan</div>
        )}
        <p className={`text-base leading-relaxed ${message.role === 'assistant' ? 'text-[var(--v2-text-secondary)]' : ''}`}>
          {message.text}
        </p>
      </div>
    </div>
  );
}

