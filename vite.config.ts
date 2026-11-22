import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    mode === 'portal' && {
      name: 'lex-portal',
      transformIndexHtml: {
        order: 'pre',
        handler: (html: string) => html.replace('src="/src/main.tsx"', 'src="/src/portal.tsx"'),
      },
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'LEX — Legislação para concursos',
        short_name: 'LEX',
        description: 'Lei seca, casos e simulados: aprenda, compreenda e memorize a legislação.',
        lang: 'pt-BR',
        theme_color: '#0e1324',
        background_color: '#0e1324',
        display: 'standalone',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        globIgnores: ['splash/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          { urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/data/'), handler: 'NetworkFirst', options: { cacheName: 'lex-data', networkTimeoutSeconds: 3, cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 90 } } },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          const course = /\/src\/content\/(constitutional|electoral|penal|processo-civil|processo-penal|civil|administrativo|consumidor)\/(?!index\.ts$)/.exec(id);
          if (course) return `curso-${course[1]}`;
        },
      },
    },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any));
