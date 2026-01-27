import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
}

export function Header({ transparent, activePage, isContactActive }: HeaderProps) {
  // Always start with 'Chat' to match SSR, then update after mount to avoid hydration mismatch
  const [resumeLabel, setResumeLabel] = useState<ResumeNavLabel>('Chat');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsClosing(false);
    }, 400); // Match animation duration
  }, []);

  useEffect(() => {
    // Set the actual value after mount (client-side only)
    setResumeLabel(getResumeNavLabel());
    
    // Subscribe to changes
    return subscribeNavStateChanged(() => setResumeLabel(getResumeNavLabel()));
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Trigger entrance animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimatingIn(true);
      });
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileMenu();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      setIsAnimatingIn(false);
    };
  }, [isMobileMenuOpen, closeMobileMenu]);

  const currentPage = useMemo(() => {
    if (activePage) return activePage;
    if (isContactActive) return 'contact'; // Legacy support
    if (typeof window === 'undefined') return 'resume';
    return detectActivePage(window.location.pathname);
  }, [activePage, isContactActive]);

  return (
    <>
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

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
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

          {/* Mobile burger / close */}
          <button
            type="button"
            className={[
              'md:hidden w-10 h-10 inline-flex items-center justify-center text-[var(--v2-text)]',
              isMobileMenuOpen ? 'fixed top-2 right-4 z-[70]' : 'relative -mr-2',
            ].join(' ')}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((v) => !v)}
          >
            <span
              className={[
                'absolute block h-[2px] w-6 bg-current transition-transform duration-200 ease-out',
                isMobileMenuOpen ? 'translate-y-0 rotate-45' : '-translate-y-[5px] rotate-0',
              ].join(' ')}
            />
            <span
              className={[
                'absolute block h-[2px] w-6 bg-current transition-transform duration-200 ease-out',
                isMobileMenuOpen ? 'translate-y-0 -rotate-45' : 'translate-y-[5px] rotate-0',
              ].join(' ')}
            />
          </button>
        </div>
      </header>

      {/* Mobile overlay menu - rendered via portal to document.body */}
      {isMobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className={`fixed inset-0 z-[60] bg-black/80 flex items-center justify-center transition-opacity duration-500 ${
            isClosing ? 'opacity-0' : isAnimatingIn ? 'opacity-100' : 'opacity-0'
          }`}
          role="dialog" 
          aria-modal="true" 
          aria-label="Navigation menu" 
          onClick={closeMobileMenu}
        >
          <div className="w-full px-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div 
              className={`text-lg font-semibold tracking-wide mb-12 text-[var(--v2-text)] transition-all duration-500 ${
                isClosing || !isAnimatingIn ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
              }`}
              style={{ transitionDelay: isClosing ? '0ms' : '100ms' }}
            >
              Jaan Sokk
            </div>

            <nav className="flex flex-col items-center gap-8">
              <a
                href="/"
                onClick={closeMobileMenu}
                className={`text-base uppercase tracking-[0.2em] transition-all duration-500 ${
                  isClosing || !isAnimatingIn ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
                } ${
                  currentPage === 'resume'
                    ? 'text-[var(--v2-accent)]'
                    : 'text-[var(--v2-text)]'
                }`}
                style={{ transitionDelay: isClosing ? '0ms' : '150ms' }}
              >
                {resumeLabel}
              </a>

              <a
                href="/cv"
                onClick={closeMobileMenu}
                className={`text-base uppercase tracking-[0.2em] transition-all duration-500 ${
                  isClosing || !isAnimatingIn ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
                } ${
                  currentPage === 'cv'
                    ? 'text-[var(--v2-accent)]'
                    : 'text-[var(--v2-text)]'
                }`}
                style={{ transitionDelay: isClosing ? '0ms' : '200ms' }}
              >
                CV
              </a>

              <a
                href="https://linkedin.com/in/jaansokk"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackExternalLinkClicked({
                    linkUrl: 'https://linkedin.com/in/jaansokk',
                    linkLabel: 'LinkedIn',
                  });
                  closeMobileMenu();
                }}
                className={`text-base uppercase tracking-[0.2em] transition-all duration-500 ${
                  isClosing || !isAnimatingIn ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
                } text-[var(--v2-text)]`}
                style={{ transitionDelay: isClosing ? '0ms' : '250ms' }}
              >
                LinkedIn
              </a>

              <a
                href="/contact"
                onClick={closeMobileMenu}
                className={`text-base uppercase tracking-[0.2em] transition-all duration-500 ${
                  isClosing || !isAnimatingIn ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
                } ${
                  currentPage === 'contact'
                    ? 'text-[var(--v2-accent)]'
                    : 'text-[var(--v2-text)]'
                }`}
                style={{ transitionDelay: isClosing ? '0ms' : '300ms' }}
              >
                Contact
              </a>
            </nav>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

