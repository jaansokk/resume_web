import { useState } from 'react';

interface DownloadPdfIconButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function DownloadPdfIconButton({ onClick, disabled }: DownloadPdfIconButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      className="relative border border-[var(--v2-border)] rounded-full
                 text-[var(--v2-text-secondary)] hover:text-[var(--v2-text)]
                 hover:border-[var(--v2-accent)]/50
                 transition-all duration-300 ease-in-out overflow-hidden
                 disabled:opacity-60 disabled:cursor-default"
      style={{
        width: isHovered && !disabled ? '160px' : '40px',
        height: '40px',
        padding: 0,
      }}
    >
      {/* Download Icon - absolutely positioned so it stays perfectly still on the left */}
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="absolute left-3 top-1/2 -translate-y-1/2 block"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      
      {/* Text - absolutely positioned so it never shifts the icon */}
      <span
        className="absolute left-9 right-3 top-1/2 -translate-y-1/2
                   text-xs font-medium whitespace-nowrap
                   transition-all duration-300 ease-in-out"
        style={{
          opacity: isHovered && !disabled ? 1 : 0,
          transform: isHovered && !disabled ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(6px)',
          pointerEvents: 'none',
        }}
      >
        Download PDF
      </span>
    </button>
  );
}
