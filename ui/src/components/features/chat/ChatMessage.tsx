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

function normalizeBulletsForMarkdown(input: string): string {
  // Some model outputs use unicode bullets (• / ·) which markdown does not treat as list markers.
  // We normalize these into "-" lists so ReactMarkdown renders proper <ul><li> blocks.
  if (!input) return input;

  const lines = input.split('\n');
  let inCodeFence = false;

  const out: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine;

    // Skip any transformations inside fenced code blocks.
    if (line.trimStart().startsWith('```')) {
      inCodeFence = !inCodeFence;
      out.push(line);
      continue;
    }
    if (inCodeFence) {
      out.push(line);
      continue;
    }

    // Convert inline bullets like: "Intro: • A • B • C" into a proper list.
    // Also handles lines that start with a bullet: "• A • B".
    const inlineParts = line.split(/\s*[•·]\s+/).map((p) => p.trim()).filter(Boolean);
    const hasInlineBullets = /\s*[•·]\s+/.test(line) && inlineParts.length > 1;
    if (hasInlineBullets) {
      // If the first segment originally contained text before the first bullet, keep it as a paragraph.
      // Heuristic: if the line starts with a bullet, the prefix is empty.
      const startsWithBullet = /^\s*[•·]\s+/.test(line);
      const prefix = startsWithBullet ? '' : inlineParts[0];
      const items = startsWithBullet ? inlineParts : inlineParts.slice(1);

      if (prefix) out.push(prefix, '');
      for (const item of items) out.push(`- ${item}`);
      continue;
    }

    // Convert newline bullets like "• Something" into "- Something"
    if (/^\s*[•·]\s+/.test(line)) {
      out.push(line.replace(/^\s*[•·]\s+/, '- '));
      continue;
    }

    out.push(line);
  }

  return out.join('\n');
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
          <p
            className={`${
              isInSplitView ? 'text-sm' : 'text-base'
            } mt-2 first:mt-0 leading-relaxed text-[var(--v2-text-secondary)]`}
          >
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul
            className={`${
              isInSplitView ? 'text-sm' : 'text-base'
            } mt-2 first:mt-0 list-disc pl-5 space-y-1 leading-relaxed text-[var(--v2-text-secondary)]`}
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            className={`${
              isInSplitView ? 'text-sm' : 'text-base'
            } mt-2 first:mt-0 list-decimal pl-5 space-y-1 leading-relaxed text-[var(--v2-text-secondary)]`}
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
      {normalizeBulletsForMarkdown(message.text)}
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
    <div className={message.role === 'user' ? 'text-right' : ''}>
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

