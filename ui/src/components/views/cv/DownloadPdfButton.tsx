import { useEffect, useRef, useState } from 'react';

const PDF_PATH = '/jaan-sokk-cv.pdf';
const PDF_FILENAME = 'Jaan-Sokk-CV.pdf';

export function DownloadPdfButton() {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleDownload = () => {
    // Trigger a real file download without navigation.
    const a = document.createElement('a');
    a.href = PDF_PATH;
    a.download = PDF_FILENAME;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setIsDownloaded(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setIsDownloaded(false), 5000);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloaded}
      className="px-4 py-2 border border-[var(--v2-border)] rounded-full
                 text-xs text-[var(--v2-text-secondary)]
                 hover:text-[var(--v2-text)] hover:border-[var(--v2-accent)]/50
                 transition-all duration-200
                 disabled:opacity-60 disabled:cursor-default"
    >
      {isDownloaded ? 'Downloaded' : 'Download PDF'}
    </button>
  );
}


