const HAS_SEEN_SPLIT_KEY = 'v2:hasSeenSplit';
const NAV_EVENT_NAME = 'v2:navStateChanged';

export type ResumeNavLabel = 'Chat' | 'Fit Brief & Experience';

export function getResumeNavLabel(): ResumeNavLabel {
  if (typeof window === 'undefined') return 'Chat';
  try {
    return window.localStorage.getItem(HAS_SEEN_SPLIT_KEY) === '1'
      ? 'Fit Brief & Experience'
      : 'Chat';
  } catch {
    return 'Chat';
  }
}

export function markHasSeenSplit(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HAS_SEEN_SPLIT_KEY, '1');
  } catch {
    // ignore
  }

  window.dispatchEvent(new Event(NAV_EVENT_NAME));
}

export function subscribeNavStateChanged(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => cb();
  window.addEventListener(NAV_EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(NAV_EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}


