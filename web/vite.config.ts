import { copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * GitHub Pages serves a project site from a subpath; Cloudflare Pages, Netlify
 * and a plain static host serve from the root. One variable covers both, so
 * changing host is a deploy-time decision rather than a code change.
 */
const base = process.env.APP_BASE ?? '/'

/**
 * A static host has no router, so a direct hit on /study is a 404. Serving the
 * app from the 404 page is the standard fix on GitHub Pages, and harmless
 * everywhere else.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const dir = fileURLToPath(new URL('./dist', import.meta.url))
      const index = `${dir}/index.html`
      if (existsSync(index)) copyFileSync(index, `${dir}/404.html`)
    },
  }
}

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Ispitni testovi',
        short_name: 'Testovi',
        description: 'Pitanja za vozački ispit',
        lang: 'sr-Latn-ME',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs, including every question illustration: study
        // offline must not depend on which questions happened to be visited.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,webmanifest}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
    spaFallback(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
