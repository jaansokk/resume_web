import { useEffect, useMemo, useState } from 'react';
import { postShare } from '../../utils/shareApi';
import type { Artifacts } from '../../utils/chatApi';
import type { Message } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  activeTab: 'brief' | 'experience';
  messages: Message[];
  artifacts: Artifacts | null;
}

export function ShareModal({ isOpen, onClose, conversationId, activeTab, messages, artifacts }: ShareModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);

  if (!isOpen) return null;

  const shareUrl = useMemo(() => {
    if (!sharePath) return null;
    if (typeof window === 'undefined') return sharePath;
    return `${window.location.origin}${sharePath}`;
  }, [sharePath]);

  const handleClose = () => {
    setStep(1);
    setContact('');
    setIsSubmitting(false);
    setError(null);
    setSharePath(null);
    onClose();
  };

  useEffect(() => {
    // Reset any previous submission errors when reopening.
    if (isOpen) setError(null);
  }, [isOpen]);

  const canShare = Boolean(artifacts?.fitBrief && artifacts?.relevantExperience);

  const handleContactSubmit = async () => {
    const createdByContact = contact.trim();
    if (!createdByContact) return;
    if (!canShare) {
      setError('Share is only available once both Fit Brief and Relevant Experience are generated.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await postShare({
        createdByContact,
        snapshot: {
          conversationId,
          createdAt: new Date().toISOString(),
          ui: { view: 'split', split: { activeTab } },
          messages: messages.map((m) => ({ role: m.role, text: m.text })),
          artifacts: {
            fitBrief: artifacts!.fitBrief!,
            relevantExperience: artifacts!.relevantExperience!,
          },
        },
      });
      setSharePath(res.path);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create share link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback: do nothing; user can manually copy from the input field.
    }
  };

  // Custom modal for Share flow (multi-step with custom layouts)
  // Note: We keep this custom instead of using the generic Modal component
  // because it has a 2-step flow with custom input fields and button layouts
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in" 
      style={{ animationFillMode: 'forwards' }}
    >
      <div 
        className="bg-[var(--v2-bg-card)] border border-[var(--v2-border)] rounded-2xl p-8 max-w-md w-full mx-4 animate-scale-in" 
        style={{ animationFillMode: 'forwards' }}
      >
        {step === 1 ? (
          <>
            <h2 className="text-xl font-medium mb-2">Let's swap LinkedIn's</h2>
            <p className="text-sm text-[var(--v2-text-tertiary)] mb-6">
              Drop your LinkedIn profile or email so we can stay in touch.
            </p>
            
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleContactSubmit()}
              placeholder="linkedin.com/in/yourprofile or email@example.com"
              className="w-full bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)] 
                         rounded-xl px-5 py-3 text-sm mb-4
                         placeholder:text-[var(--v2-text-tertiary)]
                         focus:outline-none focus:border-[var(--v2-accent)]/50
                         transition-colors"
              autoFocus
            />

            {error ? (
              <div className="text-xs text-red-300 mb-3">
                {error}
              </div>
            ) : null}
            
            <button 
              onClick={handleContactSubmit}
              disabled={!contact.trim() || isSubmitting}
              className="w-full px-4 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium 
                         hover:opacity-90 transition-opacity
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating link…' : 'Continue'}
            </button>
            
            <button 
              onClick={handleClose}
              className="w-full mt-3 px-4 py-2 text-xs text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors"
            >
              Skip for now
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[var(--v2-accent)]">✓</span>
              <span className="text-sm text-[var(--v2-text-secondary)]">Share snapshot created</span>
            </div>
            
            <h2 className="text-xl font-medium mb-2">Share this conversation</h2>
            <p className="text-sm text-[var(--v2-text-tertiary)] mb-6">
              Forward this fit brief to your team or save it for later.
            </p>

            {shareUrl ? (
              <input
                readOnly
                value={shareUrl}
                className="w-full bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)] rounded-xl px-4 py-2 text-xs mb-4"
              />
            ) : null}
            
            <div className="flex gap-3 mb-4">
              <button 
                onClick={handleCopyLink}
                disabled={!shareUrl}
                className="flex-1 px-4 py-3 border border-[var(--v2-border)] rounded-full text-sm
                           hover:border-[var(--v2-accent)]/60 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Copy link
              </button>
              <button 
                disabled
                className="flex-1 px-4 py-3 border border-[var(--v2-border)] rounded-full text-sm
                           opacity-50 cursor-not-allowed"
              >
                Download PDF
              </button>
            </div>
            
            <button 
              onClick={handleClose}
              className="w-full px-4 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

