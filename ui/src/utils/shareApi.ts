export interface ShareSnapshotUI {
  view: 'chat' | 'split';
  split?: { activeTab: 'brief' | 'experience' };
}

export interface ShareSnapshotMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface ShareSnapshotArtifacts {
  fitBrief: {
    title: string;
    sections: Array<{ id: string; title: string; content: string }>;
  };
  relevantExperience: {
    groups: Array<{
      title: string;
      items: Array<{
        slug: string;
        type: 'experience' | 'project';
        title: string;
        role?: string;
        period?: string;
        bullets: string[];
        whyRelevant?: string;
      }>;
    }>;
  };
}

export interface ShareSnapshot {
  conversationId: string;
  createdAt: string;
  ui: ShareSnapshotUI;
  messages: ShareSnapshotMessage[];
  artifacts: ShareSnapshotArtifacts;
}

export interface CreateShareRequest {
  createdByContact: string;
  snapshot: ShareSnapshot;
}

export interface CreateShareResponse {
  shareId: string;
  path: string; // /c/{shareId}
}

export interface GetShareResponse {
  shareId: string;
  createdAt: string;
  snapshot: ShareSnapshot;
}

function getShareApiBase(): string {
  // Optional override: base URL (without /share), e.g. https://api.example.com
  const base = (import.meta.env.PUBLIC_CHAT_API_BASE_URL as string | undefined)?.trim();
  if (base) return base.replace(/\/$/, '');
  // Default: same-origin proxy
  return '/api';
}

export async function postShare(payload: CreateShareRequest): Promise<CreateShareResponse> {
  const url = `${getShareApiBase()}/share`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Share API error (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as CreateShareResponse;
}

export async function getShare(shareId: string): Promise<GetShareResponse> {
  const url = `${getShareApiBase()}/share/${encodeURIComponent(shareId)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Share API error (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as GetShareResponse;
}


