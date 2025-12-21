/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-alt': 'var(--bg-alt)',
        'bg-card': 'var(--bg-card)',
        text: 'var(--text)',
        'text-mid': 'var(--text-mid)',
        'text-dim': 'var(--text-dim)',
        accent: 'var(--accent)',
        border: 'var(--border)',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

