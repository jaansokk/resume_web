import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

interface ThinkingCollapsibleProps {
  /** The thinking text to display */
  thinking: string;
  /** Whether to start expanded (default: false) */
  defaultExpanded?: boolean;
  /** True while thinking is still streaming in */
  isStreaming?: boolean;
}

/**
 * Collapsible section showing the reasoning/thinking process.
 * Displayed above the assistant's response when thinking was used.
 */
function normalizeNewlines(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Extract the latest "complete" reasoning block.
 *
 * Streaming behavior:
 * - Prefer paragraph blocks (separated by blank lines).
 * - If no paragraph boundary exists yet, fall back to the latest complete line (terminated by '\n').
 *
 * Non-streaming behavior:
 * - Show the latest non-empty paragraph (or the full text if it's a single block).
 */
function extractLatestBlock(input: string, isStreaming: boolean): string | null {
  const text = normalizeNewlines(input || '').trimEnd();
  if (!text.trim()) return null;

  // Paragraph blocks (blank line delimited)
  const paragraphSep = /\n\s*\n/;

  if (isStreaming) {
    const parts = text.split(paragraphSep);
    // If we have at least 2 parts, the last completed paragraph is the penultimate
    // IF the stream currently has an incomplete trailing paragraph.
    // Detect completion by checking if the original ends with a blank line.
    const endsWithBlankLine = /\n\s*\n\s*$/.test(normalizeNewlines(input || ''));

    if (parts.length >= 2) {
      const candidate = endsWithBlankLine ? parts[parts.length - 1] : parts[parts.length - 2];
      const trimmed = (candidate || '').trim();
      if (trimmed) return trimmed;
    }

    // Fallback: latest completed line
    const raw = normalizeNewlines(input || '');
    const lastNewlineIdx = raw.lastIndexOf('\n');
    if (lastNewlineIdx <= 0) return null;
    const before = raw.slice(0, lastNewlineIdx);
    const prevNewlineIdx = before.lastIndexOf('\n');
    const line = before.slice(prevNewlineIdx + 1).trim();
    return line || null;
  }

  const paragraphs = text.split(paragraphSep).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return text.trim() || null;
  return paragraphs[paragraphs.length - 1] ?? null;
}

export function ThinkingCollapsible({
  thinking,
  defaultExpanded = false,
  isStreaming = false,
}: ThinkingCollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(isStreaming ? true : defaultExpanded);

  // Auto-expand while streaming (finished state should default collapsed)
  useEffect(() => {
    if (isStreaming) setIsExpanded(true);
  }, [isStreaming]);

  const fullThinking = useMemo(() => normalizeNewlines(thinking || '').trimEnd(), [thinking]);

  const latestBlock = useMemo(() => extractLatestBlock(thinking, isStreaming), [thinking, isStreaming]);
  const [displayBlock, setDisplayBlock] = useState<string | null>(latestBlock);
  const [contentOpacity, setContentOpacity] = useState(1);
  const prevBlockRef = useRef<string | null>(latestBlock);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Crossfade when a new complete block arrives.
  useEffect(() => {
    if (latestBlock === prevBlockRef.current) return;
    if (!latestBlock) return;

    if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
    setContentOpacity(0);

    swapTimerRef.current = setTimeout(() => {
      prevBlockRef.current = latestBlock;
      setDisplayBlock(latestBlock);
      setContentOpacity(1);
    }, 120);

    return () => {
      if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
    };
  }, [latestBlock]);

  useEffect(() => {
    // Keep initial render in sync.
    if (displayBlock == null && latestBlock != null) {
      prevBlockRef.current = latestBlock;
      setDisplayBlock(latestBlock);
    }
  }, [displayBlock, latestBlock]);

  if (isStreaming) {
    if (!displayBlock || displayBlock.trim().length === 0) return null;
  } else {
    if (!fullThinking.trim()) return null;
  }

  const headerTitleClasses =
    !isExpanded && !isStreaming
      ? 'opacity-0 [clip-path:inset(0_100%_0_0)] group-hover:opacity-100 group-hover:[clip-path:inset(0_0%_0_0)]'
      : 'opacity-100 [clip-path:inset(0_0%_0_0)]';

  const innerPanelClasses = 'rounded-lg';

  // Intentionally use inline backgroundColor:
  // - Tailwind's "/opacity" suffix can't adjust CSS-variable colors reliably.
  // - In split view the surrounding surface already uses `--v2-bg-elevated`, so reusing it
  //   can look like "no background". A subtle white overlay reads as "slightly lighter".
  const innerPanelStyle: CSSProperties = isStreaming
    ? { backgroundColor: 'rgba(20,20,20,0.30)' }
    : isExpanded
      ? { backgroundColor: 'rgba(255,255,255,0.035)' }
      : { backgroundColor: 'transparent' };

  return (
    <div className="mb-3">
      <div className={`${innerPanelClasses} overflow-hidden`} style={innerPanelStyle}>
        {/* Header - always visible */}
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className={`group w-full flex items-center gap-2 py-2 text-left transition-colors ${
            isExpanded ? 'bg-transparent' : 'bg-transparent hover:bg-white/[0.03]'
          }`}
          aria-expanded={isExpanded}
          aria-label="Reasoning"
        >
          {/* Chevron icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-4 h-4 text-[var(--v2-text-tertiary)] flex-shrink-0 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>

          {/* Lightbulb icon + title (shimmer only while streaming) */}
          <span className={`flex items-center gap-2 ${isStreaming ? 'v2-mask-shimmer' : ''}`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-[var(--v2-text-secondary)] flex-shrink-0"
              aria-hidden="true"
            >
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 2a7 7 0 0 0-4 12c.6.5 1 1.2 1 2v1h6v-1c0-.8.4-1.5 1-2a7 7 0 0 0-4-12Z" />
            </svg>

            {/* Title (collapsed hover reveal when finished) */}
            <span
              className={`text-xs font-medium text-[var(--v2-text-secondary)] transition-[opacity,clip-path] duration-300 ease-out ${headerTitleClasses}`}
            >
              Reasoning
            </span>
          </span>
        </button>

        {/* Expanded content
            - Streaming: latest completed block, clamped to 4 lines (intentional)
            - Finished: full reasoning (no clamp) */}
        {isExpanded && (
          <div className={`${isStreaming ? '' : 'mt-0'} px-3 pb-2`}>
            {isStreaming ? (
              <div
                className="pl-4 text-sm text-[var(--v2-text-secondary)] whitespace-pre-wrap leading-relaxed overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]"
                style={{ opacity: contentOpacity, transition: 'opacity 200ms ease' }}
              >
                {displayBlock}
              </div>
            ) : (
              <div className="pl-4 text-sm text-[var(--v2-text-secondary)] whitespace-pre-wrap leading-relaxed">
                {fullThinking}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
