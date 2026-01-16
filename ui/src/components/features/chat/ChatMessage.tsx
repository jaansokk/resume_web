import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../../domain/types';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function normalizeUrl(href?: string): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return undefined;
    return trimmed;
  } catch {
    return undefined;
  }
}

function isExternalUrl(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}

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

  const isAssistant = message.role === 'assistant';

  const markdown = isAssistant ? (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className={`${isInSplitView ? 'text-sm' : 'text-base'} leading-relaxed text-[var(--v2-text-secondary)]`}>
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul
            className={`${
              isInSplitView ? 'text-sm' : 'text-base'
            } mt-2 list-disc pl-5 space-y-1 leading-relaxed text-[var(--v2-text-secondary)]`}
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            className={`${
              isInSplitView ? 'text-sm' : 'text-base'
            } mt-2 list-decimal pl-5 space-y-1 leading-relaxed text-[var(--v2-text-secondary)]`}
          >
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-[var(--v2-text)]">{children}</strong>,
        a: ({ href, children }) => {
          const safeHref = normalizeUrl(href);
          if (!safeHref) {
            return <span className="text-[var(--v2-text-secondary)] underline underline-offset-2">{children}</span>;
          }
          const external = isExternalUrl(safeHref);
          return (
            <a
              href={safeHref}
              className="text-[var(--v2-accent)] underline underline-offset-2 hover:text-[var(--v2-text)] transition-colors"
              target={external ? '_blank' : undefined}
              rel={external ? 'noreferrer' : undefined}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {message.text}
    </ReactMarkdown>
  ) : (
    message.text
  );

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
          <div
            className={`text-sm leading-relaxed ${
              message.role === 'assistant' ? 'text-[var(--v2-text-secondary)]' : 'text-[var(--v2-text)]'
            }`}
          >
            {markdown}
            {cursor}
          </div>
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
        <div
          className={`text-base leading-relaxed ${
            message.role === 'assistant' ? 'text-[var(--v2-text-secondary)]' : 'text-[var(--v2-text)]'
          }`}
        >
          {markdown}
          {cursor}
        </div>
      </div>
    </div>
  );
}

