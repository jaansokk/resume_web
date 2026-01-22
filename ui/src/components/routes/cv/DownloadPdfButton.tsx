import { useMemo, useState } from 'react';
import { Modal } from '../../ui/Modal';
import { trackCVPdfDownload, trackCVContactProvided } from '../../../utils/posthogTracking';
import { DownloadPdfIconButton } from '../../features/chat/DownloadPdfIconButton';

const PDF_PATH = '/jaan-sokk-cv.pdf';
const PDF_FILENAME = 'Jaan-Sokk-CV.pdf';

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

export function DownloadPdfButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contact, setContact] = useState('');
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isContactValid = useMemo(() => {
    return contact.trim().length === 0 || isValidContact(contact);
  }, [contact]);

  const canDownload = useMemo(() => {
    return contact.trim().length > 0 && isContactValid;
  }, [contact, isContactValid]);

  const handleDownload = () => {
    setError(null);

    if (!isContactValid) {
      setError('Please enter a valid email address or LinkedIn profile URL (e.g., linkedin.com/in/yourname)');
      return;
    }

    if (!canDownload) {
      setError('Please add your email or LinkedIn to continue.');
      return;
    }

    const contactValue = contact.trim();
    
    // Track contact provided
    const hasLinkedIn = contactValue.toLowerCase().includes('linkedin.com');
    const hasEmail = isValidEmail(contactValue);
    trackCVContactProvided({
      hasLinkedIn,
      hasEmail,
    });

    // Trigger download
    const a = document.createElement('a');
    a.href = PDF_PATH;
    a.download = PDF_FILENAME;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();

    // Track download
    trackCVPdfDownload();

    // Close modal and show downloaded state
    setIsModalOpen(false);
    setIsDownloaded(true);
    setContact('');
    setError(null);
    
    // Reset downloaded state after 3 seconds
    setTimeout(() => setIsDownloaded(false), 3000);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setContact('');
    setError(null);
  };

  return (
    <>
      <DownloadPdfIconButton 
        onClick={() => setIsModalOpen(true)}
        disabled={isDownloaded}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title="Let's stay in touch"
        buttonOrder="primary-first"
        primaryButton={{
          label: 'Download',
          onClick: handleDownload,
          disabled: !canDownload,
        }}
        secondaryButton={{
          label: 'Close',
          onClick: handleClose,
        }}
      >
        <p className="text-sm text-[var(--v2-text-tertiary)] mb-4">
          Share your LinkedIn or email to download the PDF.
        </p>
        
        <input
          type="text"
          value={contact}
          onChange={(e) => {
            setContact(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && canDownload && handleDownload()}
          placeholder="linkedin.com/in/yourprofile or email@example.com"
          className={`w-full bg-[var(--v2-bg)] border rounded-xl px-5 py-3 text-sm
                     placeholder:text-[var(--v2-text-tertiary)]
                     focus:outline-none transition-colors
                     ${!isContactValid && contact.trim().length > 0
                       ? 'border-red-500/50 focus:border-red-500'
                       : 'border-[var(--v2-border-subtle)] focus:border-[var(--v2-accent)]/50'
                     }`}
          autoFocus
        />
        
        {error && (
          <div className="text-xs text-red-400 mt-2">
            {error}
          </div>
        )}
      </Modal>
    </>
  );
}
