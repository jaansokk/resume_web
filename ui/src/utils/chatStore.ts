export type StoredRole = 'user' | 'assistant';

export interface StoredMessage {
  role: StoredRole;
  text: string;
  showEmailInput?: boolean;
}

export interface ChatStoreStateV1 {
  v: 1;
  conversationId: string;
  messages: StoredMessage[];
  relatedSlugs: string[];
  updatedAt: number;
}

const STORAGE_KEY = 'chat_state_v1';

function makeConversationId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadChatState(): ChatStoreStateV1 | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = safeParse(raw) as Partial<ChatStoreStateV1> | null;
  if (!parsed || parsed.v !== 1 || typeof parsed.conversationId !== 'string') return null;
  return {
    v: 1,
    conversationId: parsed.conversationId,
    messages: Array.isArray(parsed.messages) ? (parsed.messages as StoredMessage[]) : [],
    relatedSlugs: Array.isArray(parsed.relatedSlugs) ? (parsed.relatedSlugs as string[]) : [],
    updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
  };
}

export function saveChatState(state: ChatStoreStateV1): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function initOrLoadChatState(): ChatStoreStateV1 {
  const existing = loadChatState();
  if (existing) return existing;
  const created: ChatStoreStateV1 = {
    v: 1,
    conversationId: makeConversationId(),
    messages: [],
    relatedSlugs: [],
    updatedAt: Date.now(),
  };
  saveChatState(created);
  return created;
}

export function setMessages(messages: StoredMessage[]): ChatStoreStateV1 {
  const current = initOrLoadChatState();
  const next: ChatStoreStateV1 = { ...current, messages, updatedAt: Date.now() };
  saveChatState(next);
  return next;
}

export function appendMessages(toAppend: StoredMessage[]): ChatStoreStateV1 {
  const current = initOrLoadChatState();
  const next: ChatStoreStateV1 = {
    ...current,
    messages: [...(current.messages || []), ...toAppend],
    updatedAt: Date.now(),
  };
  saveChatState(next);
  return next;
}

export function mergeRelatedSlugs(slugs: string[]): ChatStoreStateV1 {
  const current = initOrLoadChatState();
  const merged = Array.from(new Set([...(current.relatedSlugs || []), ...(slugs || [])])).slice(0, 12);
  const next: ChatStoreStateV1 = { ...current, relatedSlugs: merged, updatedAt: Date.now() };
  saveChatState(next);
  return next;
}

export function clearChatState(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}


