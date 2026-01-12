export type ViewMode = 'handshake' | 'chat' | 'split' | 'contact';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export interface QuickReply {
  id: string;
  label: string;
  icon: string;
}

export const quickReplies: readonly QuickReply[] = [
  { id: 'product', label: 'We are Hiring for Product Manager / PO', icon: '◇' },
  { id: 'engineer', label: 'Looking for an AI-first Product Engineer', icon: '◇' },
  { id: 'browsing', label: 'Just browsing', icon: '◇' },
  { id: 'advising', label: 'I am looking for an Advisor / Consultant', icon: '◇' },
] as const;

