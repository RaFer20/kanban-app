import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://auth:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api/board': {
        target: 'http://board:3000',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/api\/board/, '/api'),
      },
    },
  },
})
