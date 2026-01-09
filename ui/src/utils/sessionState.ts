import type { Message, ViewMode } from '../components/types';
import type { Artifacts } from './chatApi';

const SESSION_KEY = 'v2:conversationState';

export interface ConversationSessionState {
  conversationId: string;
  viewMode: Exclude<ViewMode, 'contact'>;
  lastNonContactView: Exclude<ViewMode, 'contact'>;
  messages: Message[];
  chips: string[];
  artifacts: Artifacts | null;
  activeTab: 'brief' | 'experience';
}

export function loadConversationSessionState(): ConversationSessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConversationSessionState;
  } catch {
    return null;
  }
}

export function saveConversationSessionState(state: ConversationSessionState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}


