import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
  resolve: {
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      '@tenant': path.resolve(__dirname, '../tenant-dashboard-react/src'),
      '@owner': path.resolve(__dirname, '../owner-react/src'),
      '@admin': path.resolve(__dirname, '../admin-react/src'),
      '@warden': path.resolve(__dirname, '../warden-dashboard-react/src'),
      '@super-admin': path.resolve(__dirname, '../super-admin-react/src'),
    },
  },
})

