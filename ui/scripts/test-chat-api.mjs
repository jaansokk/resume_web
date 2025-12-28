/* eslint-disable no-console */

import process from 'node:process';

const url =
  (process.env.PUBLIC_CHAT_API_URL && process.env.PUBLIC_CHAT_API_URL.trim()) ||
  (process.env.PUBLIC_CHAT_API_BASE_URL && `${process.env.PUBLIC_CHAT_API_BASE_URL.trim().replace(/\/$/, '')}/chat`);

if (!url) {
  console.error(
    'Missing env. Set PUBLIC_CHAT_API_URL=https://.../prod/chat (or PUBLIC_CHAT_API_BASE_URL=https://.../prod) before running.',
  );
  process.exit(1);
}

const payload = {
  conversationId: `test_${Date.now()}`,
  client: { origin: 'http://localhost:4321', page: { path: '/', activeSlug: null } },
  messages: [{ role: 'user', text: 'hello from ui smoke test' }],
};

console.log(`POST ${url}`);
const postRes = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

console.log('POST status:', postRes.status);
const postText = await postRes.text();
console.log('POST body (first 800 chars):', postText.slice(0, 800));

if (!postRes.ok) process.exit(2);

let postJson;
try {
  postJson = JSON.parse(postText);
} catch {
  console.error('POST response is not valid JSON.');
  process.exit(3);
}

if (!postJson?.assistant?.text) {
  console.error('Missing expected field: assistant.text');
  process.exit(4);
}

console.log('✓ assistant.text present');

// Browser preflight simulation (many browsers will do this for application/json)
console.log(`\nOPTIONS ${url} (preflight simulation)`);
const optRes = await fetch(url, {
  method: 'OPTIONS',
  headers: {
    Origin: 'http://localhost:4321',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type',
  },
});

console.log('OPTIONS status:', optRes.status);
console.log('OPTIONS ACAO:', optRes.headers.get('access-control-allow-origin'));
console.log('OPTIONS ACAM:', optRes.headers.get('access-control-allow-methods'));
console.log('OPTIONS body:', (await optRes.text()).slice(0, 200));


