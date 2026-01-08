export function CVHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[var(--v2-bg)]/80 backdrop-blur-md border-b border-[var(--v2-border-subtle)]">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="w-2 h-2 rounded-full bg-[var(--v2-accent)]" />
          <span className="text-sm font-medium">Jaan Sokk</span>
        </a>
        <nav className="flex items-center gap-6">
          <a 
            href="/cv" 
            className="text-xs text-[var(--v2-accent)] uppercase tracking-wider"
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
          <a 
            href="/"
            className="text-xs text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors uppercase tracking-wider"
          >
            Chat
          </a>
        </nav>
      </div>
    </header>
  );
}

