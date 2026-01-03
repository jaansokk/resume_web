export type ChatApiRole = 'system' | 'user' | 'assistant';

export interface ChatApiMessage {
  role: ChatApiRole;
  text: string;
}

export interface ChatApiRequest {
  conversationId: string;
  client: {
    origin: string;
    page: {
      path: string;
      activeSlug: string | null;
    };
  };
  messages: ChatApiMessage[];
}

export type ChatClassification = 'new_opportunity' | 'general_talk';
export type ChatTone = 'warm' | 'direct' | 'neutral' | 'enthusiastic';

export interface ChatApiResponse {
  assistant: { text: string };
  classification?: ChatClassification;
  tone?: ChatTone;
  related?: Array<{ slug: string; reason?: string }>;
  citations?: Array<{ type: 'experience' | 'project' | 'background'; slug: string; chunkId: number }>;
  next?: {
    offerMoreExamples?: boolean;
    askForEmail?: boolean;
  };
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


