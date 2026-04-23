// @ts-check
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

const rootDir = dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://jaan.sokkphoto.com',
  integrations: [react(), tailwind()],
  vite: {
    resolve: {
      alias: {
        '@shared': resolve(rootDir, '../shared'),
      },
    },
    server: {
      proxy: {
        // Same-origin dev proxy (streaming): UI calls /api/chat/stream, proxy forwards to FastAPI /chat/stream.
        '/api/chat/stream': {
          target: process.env.CHAT_API_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/chat\/stream$/, '/chat/stream'),
        },
        // Same-origin dev proxy (recommended): UI calls /api/chat, proxy forwards to FastAPI /chat.
        '/api/chat': {
          target: process.env.CHAT_API_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/chat$/, '/chat'),
        },
        // Same-origin dev proxy: UI calls /api/contact, proxy forwards to FastAPI /contact.
        '/api/contact': {
          target: process.env.CHAT_API_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/contact$/, '/contact'),
        },
        // Same-origin dev proxy: UI calls /api/share, proxy forwards to FastAPI /share (and /share/:id).
        '/api/share': {
          target: process.env.CHAT_API_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/share/, '/share'),
        },
      },
    },
  },
});
