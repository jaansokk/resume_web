import { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [linkedinUrl, setLinkedinUrl] = useState('');

  if (!isOpen) return null;

  const handleLinkedInSubmit = () => {
    if (linkedinUrl.trim()) {
      setStep(2);
    }
  };

  const handleClose = () => {
    setStep(1);
    setLinkedinUrl('');
    onClose();
  };

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
              Drop your LinkedIn profile so we can stay in touch.
            </p>
            
            <input
              type="text"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLinkedInSubmit()}
              placeholder="linkedin.com/in/yourprofile"
              className="w-full bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)] 
                         rounded-xl px-5 py-3 text-sm mb-4
                         placeholder:text-[var(--v2-text-tertiary)]
                         focus:outline-none focus:border-[var(--v2-accent)]/50
                         transition-colors"
              autoFocus
            />
            
            <button 
              onClick={handleLinkedInSubmit}
              disabled={!linkedinUrl.trim()}
              className="w-full px-4 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium 
                         hover:opacity-90 transition-opacity
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
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
              <span className="text-sm text-[var(--v2-text-secondary)]">LinkedIn saved (Share feature coming soon)</span>
            </div>
            
            <h2 className="text-xl font-medium mb-2">Share this conversation</h2>
            <p className="text-sm text-[var(--v2-text-tertiary)] mb-6">
              Forward this fit brief to your team or save it for later.
            </p>
            
            <div className="flex gap-3 mb-4">
              <button 
                disabled
                className="flex-1 px-4 py-3 border border-[var(--v2-border)] rounded-full text-sm
                           opacity-50 cursor-not-allowed"
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

