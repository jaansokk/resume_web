export type ChatApiRole = 'system' | 'user' | 'assistant';

export interface ChatApiMessage {
  role: ChatApiRole;
  text: string;
}

// V2 contract types
export interface ClientUI {
  view: 'chat' | 'split';
  split?: {
    activeTab: 'brief' | 'experience';
  };
}

export interface ClientPage {
  path: string;
  referrerShareId?: string | null;
}

export interface ChatApiRequest {
  conversationId: string;
  client: {
    origin: string;
    page: ClientPage;
    ui: ClientUI;
    thinkingEnabled?: boolean;  // Extended thinking toggle (default: true)
  };
  messages: ChatApiMessage[];
}

export interface FitBriefSection {
  id: string;
  title: string;
  content: string;
}

export interface FitBrief {
  title: string;
  sections: FitBriefSection[];
}

export interface RelevantExperienceItem {
  slug: string;
  type: 'experience' | 'project';
  title: string;
  company?: string;
  role?: string;
  period?: string;
  bullets: string[];
  whyRelevant?: string;
}

export interface RelevantExperienceGroup {
  title: string;
  items: RelevantExperienceItem[];
}

export interface RelevantExperience {
  groups: RelevantExperienceGroup[];
}

export interface Artifacts {
  fitBrief?: FitBrief;
  relevantExperience?: RelevantExperience;
}

export interface UIDirective {
  view: 'chat' | 'split';
  split?: {
    activeTab: 'brief' | 'experience';
  };
}

export interface Hints {
  suggestShare?: boolean;
  suggestTab?: 'brief' | 'experience' | null;
}

export interface AgentUsage {
  outputTokens: number;
}

export interface Usage {
  outputTokens: number;
  byAgent?: Record<string, AgentUsage>;
}

export interface ChatApiResponse {
  assistant: { text: string };
  usage?: Usage;
  ui: UIDirective;
  hints?: Hints;
  chips?: string[];
  artifacts?: Artifacts;
  thinking?: string;  // Extended thinking summary (when enabled)
}

function getChatApiUrl(): string {
  // Preferred override: full endpoint (including /chat), e.g.
  // https://<your-domain>/api/chat (same-origin) OR https://api.example.com/chat (direct)
  const full = (import.meta.env.PUBLIC_CHAT_API_URL as string | undefined)?.trim();
  if (full) return full;

  // Optional: base URL (without /chat), e.g.
  // https://api.example.com
  const base = (import.meta.env.PUBLIC_CHAT_API_BASE_URL as string | undefined)?.trim();
  if (base) return `${base.replace(/\/$/, '')}/chat`;

  // Default (recommended): same-origin proxy (Astro dev proxy / reverse proxy in prod)
  return '/api/chat';
}

export async function postChat(payload: ChatApiRequest): Promise<ChatApiResponse> {
  const url = getChatApiUrl();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Chat API error (${res.status}): ${text || res.statusText}`);
  }

  const raw = await res.json();
  return raw as ChatApiResponse;
}

export async function postChatStream(
  payload: ChatApiRequest,
  onTextDelta: (delta: string) => void,
  onUiDirective: (ui: UIDirective, hints?: Hints) => void,
  onDone: (response: ChatApiResponse) => void,
  onError: (error: Error) => void,
  onThinkingDelta?: (delta: string) => void,
): Promise<void> {
  /**
   * Streaming version of postChat using Server-Sent Events (SSE).
   * 
   * Events:
   * - event: ui, data: {"ui": {view,...}, "hints": {...}} - Early UI directive (optional)
   * - event: thinking, data: {"delta": "..."} - Thinking chunks (when thinking enabled)
   * - event: text, data: {"delta": "..."} - Text chunks as they arrive
   * - event: done, data: {ChatApiResponse} - Complete response with artifacts
   * - event: error, data: {"error": "..."} - Error occurred
   */
  const url = getChatApiUrl().replace('/chat', '/chat/stream');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Chat API error (${res.status}): ${text || res.statusText}`);
    }

    if (!res.body) {
      throw new Error('Response body is null');
    }

    // Parse SSE stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE messages (terminated by double newline)
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete message in buffer

      for (const message of lines) {
        if (!message.trim()) continue;

        // Parse SSE format: "event: type\ndata: json"
        const eventMatch = message.match(/^event:\s*(.+)$/m);
        const dataMatch = message.match(/^data:\s*(.+)$/m);

        if (!eventMatch || !dataMatch) continue;

        const eventType = eventMatch[1].trim();
        const dataStr = dataMatch[1].trim();

        try {
          const data = JSON.parse(dataStr);

          if (eventType === 'thinking') {
            const delta = data.delta;
            if (typeof delta === 'string' && onThinkingDelta) {
              onThinkingDelta(delta);
            }
          } else if (eventType === 'text') {
            const delta = data.delta;
            if (typeof delta === 'string') {
              onTextDelta(delta);
            }
          } else if (eventType === 'ui') {
            // Accept either {"ui": {...}, "hints": {...}} or a raw ui object for compatibility.
            const maybeUi = (data && typeof data === 'object' && 'ui' in data) ? (data as any).ui : data;
            if (maybeUi && typeof maybeUi === 'object' && typeof (maybeUi as any).view === 'string') {
              onUiDirective(maybeUi as UIDirective, (data as any)?.hints as Hints | undefined);
            }
          } else if (eventType === 'done') {
            onDone(data as ChatApiResponse);
          } else if (eventType === 'error') {
            onError(new Error(data.error || 'Unknown error'));
            return;
          }
        } catch (parseError) {
          console.error('Failed to parse SSE data:', parseError, dataStr);
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}
