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
  { id: 'product', label: 'Hiring for Product / PO', icon: '◈' },
  { id: 'engineer', label: 'Product Engineer / AI', icon: '⬡' },
  { id: 'browsing', label: 'Just browsing', icon: '○' },
  { id: 'advising', label: 'Advisor / Consultant', icon: '◇' },
] as const;

