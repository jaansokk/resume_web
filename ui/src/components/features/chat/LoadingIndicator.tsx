interface LoadingIndicatorProps {
  isInSplitView?: boolean;
}

export function LoadingIndicator({ isInSplitView = false }: LoadingIndicatorProps) {
  const containerClass = isInSplitView 
    ? '' 
    : 'animate-fade-in opacity-0';
  
  const containerStyle = isInSplitView 
    ? undefined 
    : { animationFillMode: 'forwards' as const };

  return (
    <div className={containerClass} style={containerStyle}>
      <div className="text-xs text-[var(--v2-text-tertiary)] mb-2 uppercase tracking-wider">Jaan</div>
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[var(--v2-text-tertiary)] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-[var(--v2-text-tertiary)] animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-[var(--v2-text-tertiary)] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

