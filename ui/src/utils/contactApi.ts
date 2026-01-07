export interface ContactApiRequest {
  contact: string;
  message: string;
  pagePath?: string;
  // Honeypot (should be empty)
  website?: string;
}

export interface ContactApiResponse {
  ok: boolean;
}

function getContactApiUrl(): string {
  // Optional override: full endpoint (including /contact), e.g.
  // https://<your-domain>/api/contact (same-origin) OR https://api.example.com/contact (direct)
  const full = (import.meta.env.PUBLIC_CONTACT_API_URL as string | undefined)?.trim();
  if (full) return full;

  // Optional: base URL (without /contact), e.g.
  // https://api.example.com
  const base = (import.meta.env.PUBLIC_CHAT_API_BASE_URL as string | undefined)?.trim();
  if (base) return `${base.replace(/\/$/, '')}/contact`;

  // Default: same-origin proxy (Astro dev proxy / reverse proxy in prod)
  return '/api/contact';
}

export async function postContact(payload: ContactApiRequest): Promise<ContactApiResponse> {
  const url = getContactApiUrl();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Contact API error (${res.status}): ${text || res.statusText}`);
  }

  const raw = await res.json();
  return raw as ContactApiResponse;
}


