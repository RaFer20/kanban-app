import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api/auth': {
        target: 'http://auth:8000', // use service name, not localhost
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/auth/, ''),
      },
      '/api/board': {
        target: 'http://board:3000', // use service name, not localhost
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/board/, ''),
      },
    },
  },
})
