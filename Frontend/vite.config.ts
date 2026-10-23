import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Read backend/.env so local requests use the same API_KEY as the local backend.
  const backendEnv = loadEnv(mode, '../backend', '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          headers: { 'x-key': backendEnv.API_KEY ?? '' },
        },
      },
    },
  }
})