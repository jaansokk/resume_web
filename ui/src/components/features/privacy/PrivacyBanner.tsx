import { useEffect, useState } from 'react';
import { Modal } from '../../ui/Modal';

const PRIVACY_MODE_KEY = 'privacy:posthog_mode';
const PRIVACY_MODE_ALL = 'all';
const PRIVACY_MODE_ANALYTICS_ONLY = 'analytics_only';
const BANNER_DELAY_MS = 2000;

function getStoredPrivacyMode(): string | null {
  try {
    return window.localStorage.getItem(PRIVACY_MODE_KEY);
  } catch {
    return null;
  }
}

function storePrivacyMode(mode: string) {
  try {
    window.localStorage.setItem(PRIVACY_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

function applyReplayPreference(mode: string) {
  const posthog = (window as any)?.posthog;
  if (!posthog) return;
  if (mode === PRIVACY_MODE_ALL && typeof posthog.startSessionRecording === 'function') {
    posthog.startSessionRecording();
  }
  if (mode === PRIVACY_MODE_ANALYTICS_ONLY && typeof posthog.stopSessionRecording === 'function') {
    posthog.stopSessionRecording();
  }
}

export function PrivacyBanner() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (getStoredPrivacyMode()) return;

    const timer = window.setTimeout(() => {
      if (!getStoredPrivacyMode()) {
        setIsOpen(true);
      }
    }, BANNER_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  const handleChoice = (mode: string) => {
    storePrivacyMode(mode);
    applyReplayPreference(mode);
    setIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Data & analytics"
      buttonOrder="primary-first"
      secondaryButton={{
        label: 'No, thanks',
        onClick: () => handleChoice(PRIVACY_MODE_ANALYTICS_ONLY),
      }}
      primaryButton={{
        label: 'Understood',
        onClick: () => handleChoice(PRIVACY_MODE_ALL),
      }}
    >
      <p className="text-sm text-[var(--v2-text-tertiary)]">
        I use PostHog to analyze and improve user experience on the site. Are you OK with that?
      </p>
    </Modal>
  );
}
