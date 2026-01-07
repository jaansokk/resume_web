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

export interface ChatApiResponse {
  assistant: { text: string };
  ui: UIDirective;
  hints?: Hints;
  chips?: string[];
  artifacts?: Artifacts;
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
