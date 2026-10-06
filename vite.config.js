import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const manualMediaRoot = path.resolve(__dirname, '../manualusoClienteIP/contenidomanual')

function manualMediaPlugin() {
  function serve(req, res, next) {
    const url = req.url || ''
    if (!url.startsWith('/contenidomanual/')) {
      next()
      return
    }

    let decoded = ''
    try {
      decoded = decodeURIComponent(url.split('?')[0].slice('/contenidomanual/'.length))
    } catch {
      next()
      return
    }

    const filePath = path.resolve(manualMediaRoot, decoded)
    const relative = path.relative(manualMediaRoot, filePath)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      res.statusCode = 403
      res.end()
      return
    }

    fs.stat(filePath, (error, stat) => {
      if (error || !stat.isFile()) {
        next()
        return
      }

      const size = stat.size
      const range = req.headers.range
      res.setHeader('Content-Type', 'video/mp4')
      res.setHeader('Accept-Ranges', 'bytes')

      if (range) {
        const match = /bytes=(\d+)-(\d*)/.exec(range)
        const start = match ? Number(match[1]) : 0
        const end = match && match[2] ? Number(match[2]) : size - 1
        res.statusCode = 206
        res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
        res.setHeader('Content-Length', String(end - start + 1))
        fs.createReadStream(filePath, { start, end }).pipe(res)
        return
      }

      res.setHeader('Content-Length', String(size))
      fs.createReadStream(filePath).pipe(res)
    })
  }

  return {
    name: 'manual-media',
    configureServer(server) {
      server.middlewares.use(serve)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve)
    },
  }
}

function resolveAppPort(env) {
  const parsed = Number.parseInt(String(env.PORT || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5173
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const port = resolveAppPort(env)

  return {
    plugins: [react(), manualMediaPlugin()],
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
