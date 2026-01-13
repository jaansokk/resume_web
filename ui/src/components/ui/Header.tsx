import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getResumeNavLabel, subscribeNavStateChanged, type ResumeNavLabel } from '../../utils/navState';
import { trackExternalLinkClicked } from '../../utils/posthogTracking';

type ActivePage = 'resume' | 'cv' | 'contact';

function detectActivePage(pathname: string): ActivePage {
  const normalized = pathname.replace(/\/+$/, '').toLowerCase();
  
  if (normalized.includes('/contact')) return 'contact';
  if (normalized.includes('/cv')) return 'cv';
  return 'resume';
}

interface HeaderProps {
  transparent?: boolean;
  activePage?: ActivePage;
  isContactActive?: boolean; // Legacy prop for compatibility
  rightActions?: ReactNode;
}

export function Header({ transparent, activePage, isContactActive, rightActions }: HeaderProps) {
  const [resumeLabel, setResumeLabel] = useState<ResumeNavLabel>(() => getResumeNavLabel());

  useEffect(() => {
    return subscribeNavStateChanged(() => setResumeLabel(getResumeNavLabel()));
  }, []);

  const currentPage = useMemo(() => {
    if (activePage) return activePage;
    if (isContactActive) return 'contact'; // Legacy support
    if (typeof window === 'undefined') return 'resume';
    return detectActivePage(window.location.pathname);
  }, [activePage, isContactActive]);

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50',
        transparent ? 'bg-transparent' : 'bg-[var(--v2-bg)]/80 backdrop-blur-md',
      ].join(' ')}
    >
      <div className="px-6 flex items-center justify-between h-14">
        {/* Brand - non-clickable */}
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[var(--v2-accent)]" />
          <span className="text-sm font-medium">Jaan Sokk</span>
        </div>

        <nav className="flex items-center gap-6">
          {rightActions}
          {/* Conditional first link: Chat or Fit Brief & Experience */}
          <a
            href="/"
            className={`text-xs uppercase tracking-wider transition-colors ${
              currentPage === 'resume'
                ? 'text-[var(--v2-accent)]'
                : 'text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)]'
            }`}
          >
            {resumeLabel}
          </a>

          <a
            href="/cv"
            className={`text-xs uppercase tracking-wider transition-colors ${
              currentPage === 'cv'
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
            onClick={() => trackExternalLinkClicked({ linkUrl: 'https://linkedin.com/in/jaansokk', linkLabel: 'LinkedIn' })}
            className="text-xs text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors uppercase tracking-wider"
          >
            LinkedIn
          </a>

          <a
            href="/contact"
            className={`text-xs uppercase tracking-wider transition-colors ${
              currentPage === 'contact'
                ? 'text-[var(--v2-accent)]'
                : 'text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)]'
            }`}
          >
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}

