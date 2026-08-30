import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: false,
    proxy: {
      // Proxy through Laravel's real virtual host. Sending the numeric IP with
      // a different Host header is rejected by the staging edge with HTTP 400.
      '/backend-api': {
        target: 'http://jstaging.system-11.net',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/backend-api/, ''),
      },
    },
  },
  build: {
    target: 'es2022',
    cssTarget: 'safari16',
    // Route-level code splitting comes from the dynamic imports in the router;
    // the bundler handles vendor chunking on its own.
    chunkSizeWarningLimit: 700,
  },
})
