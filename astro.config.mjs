import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://granit.dp.ua',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
  integrations: [sitemap()],
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
