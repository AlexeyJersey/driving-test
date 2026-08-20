import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Domain and storage-migration modules are pure functions, so the default
// node environment is all they need — no DOM, no browser.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
