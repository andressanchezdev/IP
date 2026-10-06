import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveAppPort(env) {
  const parsed = Number.parseInt(String(env.PORT || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5173
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const port = resolveAppPort(env)

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      // El aviso de 500 kB es preventivo; priorizamos split real de vendors pesados.
      chunkSizeWarningLimit: 700,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              },
              {
                name: 'sweetalert',
                test: /node_modules[\\/]sweetalert2[\\/]/,
              },
              {
                name: 'jspdf',
                test: /node_modules[\\/](jspdf|html2canvas|dompurify)[\\/]/,
              },
              {
                name: 'xlsx',
                test: /node_modules[\\/]xlsx[\\/]/,
              },
            ],
          },
        },
      },
    },
    server: {
      port,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET,
          changeOrigin: true,
        },
        // Logos GCS → mismo origen (jsPDF/canvas necesita esto; <img> no).
        '/gcs-assets': {
          target: 'https://storage.googleapis.com',
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/gcs-assets/, ''),
        },
      },
    },
    preview: {
      port,
      strictPort: true,
      proxy: {
        '/gcs-assets': {
          target: 'https://storage.googleapis.com',
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/gcs-assets/, ''),
        },
      },
    },
  }
})
