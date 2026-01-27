export type ViewMode = 'handshake' | 'chat' | 'split' | 'contact';

export interface MessageMetrics {
  /** End-to-end latency for the assistant response (ms) */
  elapsedMs: number;
  /** Total output tokens for the turn (best-effort, from backend) */
  outputTokens: number;
}

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  thinking?: string;  // Extended thinking summary (assistant messages only)
  metrics?: MessageMetrics; // Latency + cost metrics (assistant messages only)
}

export interface QuickReply {
  id: string;
  label: string;
  icon: string;
}

export const quickReplies: readonly QuickReply[] = [
  { id: 'product', label: "We're hiring a Product Manager / PO", icon: '◇' },
  { id: 'engineer', label: "We're looking for an AI-first Product Engineer", icon: '◇' },
  { id: 'philosophy', label: "How do you make product decisions under uncertainty?", icon: '◇' },
  { id: 'how-it-works', label: 'Cool site — how does it work?', icon: '◇' },
] as const;

