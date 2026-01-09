import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  primaryButton?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive';
    disabled?: boolean;
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
  };
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  primaryButton,
  secondaryButton,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in" 
      style={{ animationFillMode: 'forwards' }}
    >
      <div 
        className="bg-[var(--v2-bg-card)] border border-[var(--v2-border)] rounded-2xl p-8 max-w-md w-full mx-4 animate-scale-in" 
        style={{ animationFillMode: 'forwards' }}
      >
        <h2 className="text-xl font-medium mb-2">{title}</h2>
        
        <div className="mb-6">
          {children}
        </div>
        
        {/* Buttons */}
        <div className="flex gap-3">
          {secondaryButton && (
            <button 
              onClick={secondaryButton.onClick}
              className="flex-1 px-4 py-3 border border-[var(--v2-border)] rounded-full text-sm
                         hover:border-[var(--v2-accent)]/50 transition-colors"
            >
              {secondaryButton.label}
            </button>
          )}
          
          {primaryButton && (
            <button 
              onClick={primaryButton.onClick}
              disabled={primaryButton.disabled}
              className={`flex-1 px-4 py-3 rounded-full text-sm font-medium transition-opacity
                         disabled:opacity-50 disabled:cursor-not-allowed
                         ${primaryButton.variant === 'destructive' 
                           ? 'bg-red-500 text-white hover:bg-red-600' 
                           : 'bg-[var(--v2-accent)] text-[var(--v2-bg)] hover:opacity-90'
                         }`}
            >
              {primaryButton.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

