import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  base: '/_console/',
  build: {
    outDir: path.resolve(__dirname, '../ministack/static/console'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  server: {
    port: 6655,
    strictPort: true,
    proxy: {
      '/_console/api': { target: 'http://localhost:5566', changeOrigin: true },
      '/_ministack':   { target: 'http://localhost:5566', changeOrigin: true },
      '/2015-03-31':   { target: 'http://localhost:5566', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    // jsdom default URL is http://localhost:3000/ — override so MSW handlers in Plan 05
    // can register against http://localhost/ (matches ky's resolution of bare '/' paths).
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: false,
    // Playwright owns e2e/ — keep vitest scoped to src/ so it does not try to
    // execute @playwright/test specs (which explode in jsdom).
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e/**'],
  },
})
