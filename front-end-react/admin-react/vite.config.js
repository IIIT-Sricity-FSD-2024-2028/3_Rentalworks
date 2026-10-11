import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/users': 'http://localhost:3000',
      '/properties': 'http://localhost:3000',
      '/bookings': 'http://localhost:3000',
      '/payments': 'http://localhost:3000',
      '/notifications': 'http://localhost:3000',
      '/subscriptions': 'http://localhost:3000',
      '/complaints': 'http://localhost:3000'
    }
  }
})
