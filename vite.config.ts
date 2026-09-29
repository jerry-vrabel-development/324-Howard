import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

// BASE_PATH is set by the GitHub Pages workflow ("/324-Howard/").
// Locally the app is served from the root.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [tailwindcss()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
