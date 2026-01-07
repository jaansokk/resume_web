interface HeaderProps {
  onContactClick?: () => void;
  isContactActive?: boolean;
}

export function Header({ onContactClick, isContactActive }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-[var(--v2-accent)]" />
        <span className="text-sm font-medium">Jaan Sokk</span>
      </div>
      <nav className="flex items-center gap-6">
        <a 
          href="#" 
          className="text-xs text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors uppercase tracking-wider"
        >
          CV
        </a>
        <a 
          href="https://linkedin.com/in/jaansokk" 
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors uppercase tracking-wider"
        >
          LinkedIn
        </a>
        <button
          type="button"
          onClick={onContactClick}
          className={`text-xs transition-colors uppercase tracking-wider ${
            isContactActive
              ? 'text-[var(--v2-accent)]'
              : 'text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)]'
          }`}
        >
          Contact
        </button>
      </nav>
    </header>
  );
}

