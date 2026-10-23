import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Local settings from Frontend/.env.local (see .env.example). Not prefixed with VITE_,
  // so they're only used by this dev server and never end up in the browser bundle.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Dev-only stand-in for api/proxy.ts, which does the same job on Vercel.
      proxy: {
        '/api': {
          target: env.API_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          headers: { 'x-key': env.API_KEY ?? '' },
        },
      },
    },
  }
})
