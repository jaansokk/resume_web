import type { Message, ViewMode } from '../components/types';
import type { Artifacts } from './chatApi';

const STORAGE_KEY = 'v2:conversationState';

export interface ConversationState {
  conversationId: string;
  viewMode: Exclude<ViewMode, 'contact'>;
  messages: Message[];
  chips: string[];
  artifacts: Artifacts | null;
  activeTab: 'brief' | 'experience';
}

export function loadConversationState(): ConversationState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConversationState;
  } catch {
    return null;
  }
}

export function saveConversationState(state: ConversationState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

