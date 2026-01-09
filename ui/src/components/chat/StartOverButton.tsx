import { useState } from 'react';

interface StartOverButtonProps {
  onClick: () => void;
}

export function StartOverButton({ onClick }: StartOverButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative border border-[var(--v2-border)] rounded-full
                 text-[var(--v2-text-secondary)] hover:text-[var(--v2-text)]
                 hover:border-[var(--v2-accent)]/50
                 transition-all duration-300 ease-in-out overflow-hidden"
      style={{
        width: isHovered ? '108px' : '40px',
        height: '40px',
        // Keep layout stable: no padding/justify changes between states.
        padding: 0,
      }}
    >
      {/* Text - absolutely positioned so it never shifts the icon (no layout jerk) */}
      <span
        className="absolute left-3 right-10 top-1/2 -translate-y-1/2
                   text-xs font-medium whitespace-nowrap
                   transition-all duration-300 ease-in-out"
        style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(-6px)',
          pointerEvents: 'none',
        }}
      >
        Start over
      </span>
      
      {/* Icon - absolutely positioned so it stays perfectly still */}
      <svg 
        width="18" 
        height="18" 
        viewBox="0 0 32 32"
        fill="currentColor"
        className="absolute right-[11px] top-1/2 -translate-y-1/2 block"
        aria-hidden="true"
      >
        <path d="M 16 4 C 10.886719 4 6.617188 7.160156 4.875 11.625 L 6.71875 12.375 C 8.175781 8.640625 11.710938 6 16 6 C 19.242188 6 22.132813 7.589844 23.9375 10 L 20 10 L 20 12 L 27 12 L 27 5 L 25 5 L 25 8.09375 C 22.808594 5.582031 19.570313 4 16 4 Z M 25.28125 19.625 C 23.824219 23.359375 20.289063 26 16 26 C 12.722656 26 9.84375 24.386719 8.03125 22 L 12 22 L 12 20 L 5 20 L 5 27 L 7 27 L 7 23.90625 C 9.1875 26.386719 12.394531 28 16 28 C 21.113281 28 25.382813 24.839844 27.125 20.375 Z" />
      </svg>
    </button>
  );
}

