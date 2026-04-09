// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  output: 'server',
  security: { checkOrigin: false },
  integrations: [react()],

  adapter: node({
    mode: 'standalone'
  }),

  vite: {
    plugins: [tailwindcss()],
    server: {
      // Don't reload the dev server when autosave writes to data/*.json
      watch: {
        ignored: ['**/data/**'],
      },
    },
  },
});