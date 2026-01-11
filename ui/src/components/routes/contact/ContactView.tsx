import { useMemo, useState, type FormEvent } from 'react';
import { Header } from '../../shared/Header';
import { BackgroundOverlay } from '../../shared/BackgroundOverlay';
import { postContact } from '../../../utils/contactApi';

interface ContactViewProps {
  onClose?: () => void;
}

function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

function isValidLinkedInUrl(value: string): boolean {
  // LinkedIn profile URLs can be:
  // - https://www.linkedin.com/in/username
  // - https://linkedin.com/in/username
  // - http://www.linkedin.com/in/username
  // - www.linkedin.com/in/username
  // - linkedin.com/in/username
  const linkedInRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]{3,100}\/?$/i;
  return linkedInRegex.test(value);
}

function isValidContact(value: string): boolean {
  const trimmed = value.trim();
  return isValidEmail(trimmed) || isValidLinkedInUrl(trimmed);
}

export function ContactView({ onClose }: ContactViewProps) {
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);

  const isContactValid = useMemo(() => {
    return contact.trim().length === 0 || isValidContact(contact);
  }, [contact]);

  const canSubmit = useMemo(() => {
    return contact.trim().length > 0 && message.trim().length > 0 && isContactValid;
  }, [contact, message, isContactValid]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowValidationError(false);

    if (!isContactValid) {
      setShowValidationError(true);
      setError('Please enter a valid email address or LinkedIn profile URL (e.g., linkedin.com/in/yourname)');
      return;
    }

    if (!canSubmit) {
      setError('Please add your email/LinkedIn and a short message.');
      return;
    }

    setIsSending(true);
    try {
      await postContact({
        contact,
        message,
        pagePath: window.location.pathname,
        website: '',
      });
      setIsSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="v2-concept min-h-screen flex flex-col relative overflow-hidden">
      <Header isContactActive />
      <BackgroundOverlay />

      <div className="relative z-10 flex-1 flex flex-col px-6 pt-20 pb-24 justify-center">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center">
            <div className="animate-fade-up opacity-0 mb-6" style={{ animationFillMode: 'forwards' }}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] tracking-[-0.02em]">
                Let&apos;s get in touch!
              </h1>
            </div>

            <div
              className="text-lg mb-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[var(--v2-text-secondary)] animate-fade-in opacity-0"
              style={{ animationFillMode: 'forwards', animationDelay: '80ms' }}
            >
              <span className="inline-flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 4h16v16H4z" />
                  <path d="m22 6-10 7L2 6" />
                </svg>
                <span>jaan@sokkphoto.com</span>
              </span>
              <span className="text-[var(--v2-text-secondary)]">|</span>
              <span className="inline-flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.57 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.09a2 2 0 0 1 2.11-.45c.85.25 1.73.45 2.63.57A2 2 0 0 1 22 16.92z" />
                </svg>
                <a href="tel:+37253447293"><span>+372 5344 7293</span></a>
              </span>
            </div>

            <p className="text-lg text-[var(--v2-text-secondary)] max-w-md mx-auto mb-8 animate-fade-in opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '120ms' }}>
              Drop your email or LinkedIn and a message — I&apos;ll get back to you shortly.
            </p>
          </div>

          <div className="relative">
            {/* Form (animates out after submit) */}
            <form
              onSubmit={handleSubmit}
              className={`w-full max-w-4xl mx-auto text-left transition-all duration-500 ${
                isSubmitted ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
              }`}
            >
              <div className="bg-[var(--v2-bg-card)]/70 backdrop-blur border border-[var(--v2-border)] rounded-2xl p-5 md:p-6">
                <label className="block text-xs uppercase tracking-wider text-[var(--v2-text-secondary)] mb-2">
                  Your email or LinkedIn
                </label>
                <input
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                    setShowValidationError(false);
                    setError(null);
                  }}
                  placeholder="name@email.com or linkedin.com/in/..."
                  className={`w-full rounded-xl bg-black/30 border px-4 py-3 text-sm text-[var(--v2-text)] placeholder:text-[var(--v2-text-secondary)] focus:outline-none focus:ring-2 transition ${
                    !isContactValid && contact.trim().length > 0
                      ? 'border-red-400/60 focus:ring-red-400/20 focus:border-red-400'
                      : 'border-[var(--v2-border)] focus:ring-[var(--v2-accent-dim)] focus:border-[var(--v2-accent)]'
                  }`}
                />
                {!isContactValid && contact.trim().length > 0 && (
                  <div className="mt-2 text-xs text-red-300">
                    Please enter a valid email or LinkedIn URL (e.g., linkedin.com/in/yourname)
                  </div>
                )}

                <div className="h-5" />

                <label className="block text-xs uppercase tracking-wider text-[var(--v2-text-secondary)] mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What would you like to talk about?"
                  rows={5}
                  className="w-full rounded-xl bg-black/30 border border-[var(--v2-border)] px-4 py-3 text-sm text-[var(--v2-text)] placeholder:text-[var(--v2-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--v2-accent-dim)] focus:border-[var(--v2-accent)] transition resize-none"
                />

                {error && (
                  <div className="mt-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between gap-3">
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-xs uppercase tracking-wider text-[var(--v2-text-secondary)] hover:text-[var(--v2-text)] transition-colors"
                    >
                      Back
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={!canSubmit || isSending}
                    className={`rounded-xl px-5 py-3 text-sm font-medium transition-all border ${
                      canSubmit
                        ? 'bg-[var(--v2-accent)] text-black border-transparent hover:opacity-90'
                        : 'bg-black/20 text-[var(--v2-text-secondary)] border-[var(--v2-border)] cursor-not-allowed'
                    } ${!onClose ? 'ml-auto' : ''}`}
                  >
                    {isSending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </form>

            {/* Thank you (animates in after submit) */}
            <div
              className={`absolute inset-x-0 top-0 transition-all duration-500 ${
                isSubmitted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
              aria-hidden={!isSubmitted}
            >
              <div className="w-full max-w-4xl mx-auto">
                <div className="bg-[var(--v2-bg-card)]/70 backdrop-blur border border-[var(--v2-border)] rounded-2xl p-6 text-center">
                  <div className="text-sm uppercase tracking-wider text-[var(--v2-text-secondary)] mb-2">
                    Message sent
                  </div>
                  <div className="text-2xl md:text-3xl font-medium">
                    Thank you — I&apos;ll get back to you soon.
                  </div>

                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-6 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium bg-[var(--v2-accent)] text-black hover:opacity-90 transition"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


