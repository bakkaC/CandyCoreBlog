import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'url';
// @ts-check

import tailwindcss from '@tailwindcss/vite';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  site: 'https://cdhxr.github.io',
  base: '/CandyCoreBlog/',
  trailingSlash: 'never',
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': srcDir,
        '@components': `${srcDir}/components`,
        '@lib': `${srcDir}/lib`,
        '@styles': `${srcDir}/styles`,
      },
    },
  },
});