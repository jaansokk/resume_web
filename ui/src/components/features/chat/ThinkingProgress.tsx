import { useEffect, useState, useRef } from 'react';

interface ThinkingProgressProps {
  /** The raw thinking text being accumulated */
  thinkingText: string;
  /** Whether thinking is currently in progress */
  isThinking: boolean;
}

/**
 * Shows inline progress during the thinking phase.
 * Displays rotating snippets from the thinking process with a pulsing indicator.
 */
export function ThinkingProgress({ thinkingText, isThinking }: ThinkingProgressProps) {
  const [displayText, setDisplayText] = useState('');
  const [rotationIndex, setRotationIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Extract meaningful snippets from thinking text
  useEffect(() => {
    if (!thinkingText || !isThinking) {
      setDisplayText('');
      return;
    }
    
    // Get the last ~100 chars of thinking, starting at a word boundary
    const text = thinkingText.trim();
    if (text.length === 0) {
      setDisplayText('Thinking...');
      return;
    }
    
    // Find a good snippet to show
    const maxLen = 80;
    let snippet = text.slice(-maxLen);
    
    // Try to start at a word boundary
    const firstSpace = snippet.indexOf(' ');
    if (firstSpace > 0 && firstSpace < 20) {
      snippet = snippet.slice(firstSpace + 1);
    }
    
    // Clean up: remove incomplete sentences at the start
    const sentenceStart = snippet.search(/[A-Z]/);
    if (sentenceStart > 0 && sentenceStart < 30) {
      snippet = snippet.slice(sentenceStart);
    }
    
    // Add ellipsis if we truncated
    if (text.length > maxLen) {
      snippet = '...' + snippet;
    }
    
    setDisplayText(snippet || 'Analyzing...');
  }, [thinkingText, isThinking]);
  
  // Rotate through thinking states for variety
  useEffect(() => {
    if (!isThinking) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    intervalRef.current = setInterval(() => {
      setRotationIndex(prev => prev + 1);
    }, 3000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isThinking]);
  
  if (!isThinking) return null;
  
  const thinkingLabels = [
    'Reasoning',
    'Analyzing context',
    'Connecting experience',
    'Finding relevance',
    'Synthesizing',
  ];
  
  const currentLabel = thinkingLabels[rotationIndex % thinkingLabels.length];
  
  return (
    <div className="flex items-start gap-3 py-3 px-4 rounded-lg bg-[var(--v2-bg-elevated)]/50 border border-[var(--v2-border-subtle)]/50">
      {/* Thinking indicator */}
      <div className="flex-shrink-0 mt-0.5">
        <div className="relative w-5 h-5">
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full border-2 border-[var(--v2-accent)]/30 animate-ping" />
          {/* Inner dot */}
          <div className="absolute inset-1.5 rounded-full bg-[var(--v2-accent)] animate-pulse" />
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-[var(--v2-accent)] mb-1">
          {currentLabel}...
        </div>
        <div className="text-sm text-[var(--v2-text-secondary)] italic truncate">
          {displayText}
        </div>
      </div>
    </div>
  );
}
