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
      '@tenant': path.resolve(__dirname, 'src/dashboards/tenant'),
      '@owner': path.resolve(__dirname, 'src/dashboards/owner'),
      '@admin': path.resolve(__dirname, 'src/dashboards/admin'),
      '@warden': path.resolve(__dirname, 'src/dashboards/warden'),
      '@super-admin': path.resolve(__dirname, 'src/dashboards/superadmin'),
      '@superadmin': path.resolve(__dirname, 'src/dashboards/superadmin'),
    },
  },
})

