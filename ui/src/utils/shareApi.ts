import type { CreateShareRequest, CreateShareResponse, GetShareResponse } from '@shared/contracts';

export type { CreateShareRequest, CreateShareResponse, GetShareResponse, ShareSnapshot, ShareType } from '@shared/contracts';

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

