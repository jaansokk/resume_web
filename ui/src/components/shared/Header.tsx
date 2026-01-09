import { useEffect, useMemo, useState } from 'react';
import { getResumeNavLabel, subscribeNavStateChanged, type ResumeNavLabel } from '../../utils/navState';

function isCVPathname(pathname: string): boolean {
  // Normalize: drop query/hash handled elsewhere; trim trailing slashes.
  const normalized = pathname.replace(/\/+$/, '');
  if (!normalized) return false;

  const segments = normalized.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  const secondLast = segments[segments.length - 2];

  // Supports:
  // - /cv, /cv/
  // - /<base>/cv, /<base>/cv/
  // - /cv/index.html (some static hosts)
  if (last === 'cv') return true;
  if (secondLast === 'cv' && last === 'index.html') return true;
  return false;
}

interface HeaderProps {
  onContactClick?: () => void;
  isContactActive?: boolean;
  transparent?: boolean;
  activePage?: 'resume' | 'cv';
}

export function Header({ onContactClick, isContactActive, transparent, activePage }: HeaderProps) {
  const [resumeLabel, setResumeLabel] = useState<ResumeNavLabel>(() => getResumeNavLabel());

  useEffect(() => {
    return subscribeNavStateChanged(() => setResumeLabel(getResumeNavLabel()));
  }, []);

  const isCVPage = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return isCVPathname(window.location.pathname);
  }, []);

  const isCVActive = activePage ? activePage === 'cv' : isCVPage;

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50',
        transparent ? 'bg-transparent' : 'bg-[var(--v2-bg)]/80 backdrop-blur-md',
      ].join(' ')}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="w-2 h-2 rounded-full bg-[var(--v2-accent)]" />
          <span className="text-sm font-medium">Jaan Sokk</span>
        </a>

        <nav className="flex items-center gap-6">
          <a
            href="/?resume=1"
            className={`text-xs uppercase tracking-wider transition-colors ${
              !isCVActive && !isContactActive
                ? 'text-[var(--v2-accent)]'
                : 'text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)]'
            }`}
          >
            {resumeLabel}
          </a>

          <a
            href="/cv"
            className={`text-xs uppercase tracking-wider transition-colors ${
              isCVActive
                ? 'text-[var(--v2-accent)]'
                : 'text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)]'
            }`}
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

          {onContactClick ? (
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
          ) : (
            <a
              href="/?view=contact"
              className="text-xs text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors uppercase tracking-wider"
            >
              Contact
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

