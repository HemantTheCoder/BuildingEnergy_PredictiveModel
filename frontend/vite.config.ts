import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const port = Number(process.env.PORT) || 5173;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/predict': 'http://127.0.0.1:8000',
      '/materials': 'http://127.0.0.1:8000',
      '/cities': 'http://127.0.0.1:8000',
      '/fetch_climate': 'http://127.0.0.1:8000',
      '/upload_epw': 'http://127.0.0.1:8000',
      '/models': 'http://127.0.0.1:8000',
      '/recommend': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
      '/telemetry': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    }
  },
})
