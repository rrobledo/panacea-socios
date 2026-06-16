import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = 'https://panacea-socios-backend-o9awt0img-rauls-projects-d37b0ed8.vercel.app'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/socios-api': {
        target: BACKEND,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/socios-api/, ''),
      },
    },
  },
})
