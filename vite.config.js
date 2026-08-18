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
    server: {
      port,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port,
      strictPort: true,
    },
  }
})
