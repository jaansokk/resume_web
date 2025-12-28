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
  citations?: Array<{ type: 'experience' | 'background'; slug: string; chunkId: number }>;
  next?: {
    offerMoreExamples?: boolean;
    askForEmail?: boolean;
  };
}

function getChatApiUrl(): string {
  // Preferred: full endpoint (including /chat), e.g.
  // https://<api-id>.execute-api.<region>.amazonaws.com/prod/chat
  const full = (import.meta.env.PUBLIC_CHAT_API_URL as string | undefined)?.trim();
  if (full) return full;

  // Fallback: base URL (without /chat), e.g.
  // https://<api-id>.execute-api.<region>.amazonaws.com/prod
  const base = (import.meta.env.PUBLIC_CHAT_API_BASE_URL as string | undefined)?.trim();
  if (base) return `${base.replace(/\/$/, '')}/chat`;

  throw new Error(
    'Chat API URL missing. Set PUBLIC_CHAT_API_URL (preferred) or PUBLIC_CHAT_API_BASE_URL in ui/.env',
  );
}

function unwrapApiGatewayResponse(maybeWrapped: unknown): unknown {
  if (
    maybeWrapped &&
    typeof maybeWrapped === 'object' &&
    'body' in maybeWrapped &&
    typeof (maybeWrapped as any).body === 'string'
  ) {
    try {
      return JSON.parse((maybeWrapped as any).body);
    } catch {
      return maybeWrapped;
    }
  }
  return maybeWrapped;
}

export async function postChat(payload: ChatApiRequest): Promise<ChatApiResponse> {
  const url = getChatApiUrl();

  // IMPORTANT: In browsers, `Content-Type: application/json` triggers a CORS preflight (OPTIONS).
  // If API Gateway is missing OPTIONS on /chat, the browser fails with "TypeError: Failed to fetch".
  // `text/plain` is a "simple" request content-type and avoids preflight, while still sending JSON.
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Chat API error (${res.status}): ${text || res.statusText}`);
  }

  const raw = await res.json();
  const data = unwrapApiGatewayResponse(raw);
  return data as ChatApiResponse;
}


