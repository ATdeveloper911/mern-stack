import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        // Force IPv4 to avoid IPv6 connection issues
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('[Vite Proxy] Error proxying request:', {
              url: req.url,
              error: err.message,
              code: err.code
            })
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json'
              })
              res.end(JSON.stringify({ 
                error: 'Proxy error', 
                message: 'Backend server may not be running. Please check if the backend is running on port 3001.',
                details: err.message 
              }))
            }
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Vite Proxy] Proxying ${req.method} ${req.url} to backend`)
          })
        },
        // Ensure all /api routes are proxied, including /api/uploads/*
        rewrite: (path) => path,
      },
    },
  }
})