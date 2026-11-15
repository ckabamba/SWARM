import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // Forward /api to the FastAPI backend (python -m backend.manage run). changeOrigin stays off so
    // the Host header is still localhost or 127.0.0.1, the only hosts the backend accepts, and so
    // the Origin of a write matches the host the backend sees.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false },
    },
  },
})
