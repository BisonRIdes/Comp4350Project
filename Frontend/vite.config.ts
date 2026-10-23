import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Read backend/.env so local requests use the same API_KEY as the local backend.
  const backendEnv = loadEnv(mode, '../backend', '')
  // Which backend /api forwards to. Defaults to the local one; set API_TARGET in Frontend/.env.local
  // (e.g. https://bisonrides-api.onrender.com) to use the deployed backend instead.
  const frontendEnv = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: frontendEnv.API_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          headers: { 'x-key': backendEnv.API_KEY ?? '' },
        },
      },
    },
  }
})