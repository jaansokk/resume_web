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
  { id: 'engineer', label: "We're hiring a Product Engineer / FDE", icon: '◇' },
  { id: 'zero-to-mvp', label: 'How do you take a product from zero to MVP?', icon: '◇' },
  { id: 'ai-agents', label: 'How do you build with AI coding agents?', icon: '◇' },
] as const;

