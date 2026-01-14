import type { Message } from '../../domain/types';

interface ChatMessageProps {
  message: Message;
  index: number;
  isInSplitView?: boolean;
  isStreaming?: boolean;
}

export function ChatMessage({ message, index, isInSplitView = false, isStreaming = false }: ChatMessageProps) {
  // Cursor style for streaming
  const cursor = isStreaming ? (
    <span className="inline-block w-[2px] h-[1em] bg-[var(--v2-text-secondary)] ml-[2px] animate-pulse" />
  ) : null;

  if (isInSplitView) {
    // Split view: left/right alignment indicates speaker (no name label)
    return (
      <div className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
        <div
          className={`max-w-[85%] ${
            message.role === 'user'
              ? 'bg-[var(--v2-accent-dim)] text-[var(--v2-text)] rounded-3xl rounded-br-lg px-5 py-3'
              : 'text-left'
          }`}
        >
          <p className={`text-sm leading-relaxed ${message.role === 'assistant' ? 'text-[var(--v2-text-secondary)]' : ''}`}>
            {message.text}
            {cursor}
          </p>
        </div>
      </div>
    );
  }

  // Full layout for chat view
  return (
    <div 
      className={`${!isStreaming ? 'animate-fade-up opacity-0' : ''} ${message.role === 'user' ? 'text-right' : ''}`}
      style={!isStreaming ? { animationFillMode: 'forwards', animationDelay: `${index * 100}ms` } : undefined}
    >
      <div className={`inline-block max-w-[85%] ${
        message.role === 'user' 
          ? 'bg-[var(--v2-accent-dim)] text-[var(--v2-text)] rounded-3xl rounded-br-lg px-5 py-3'
          : 'text-left'
      }`}>
        <p className={`text-base leading-relaxed ${message.role === 'assistant' ? 'text-[var(--v2-text-secondary)]' : ''}`}>
          {message.text}{cursor}
        </p>
      </div>
    </div>
  );
}

