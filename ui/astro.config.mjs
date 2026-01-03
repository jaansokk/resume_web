// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  vite: {
    server: {
      proxy: {
        // Same-origin dev proxy (recommended): UI calls /api/chat, proxy forwards to FastAPI /chat.
        '/api/chat': {
          target: process.env.CHAT_API_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/chat$/, '/chat'),
        },
      },
    },
  },
});
