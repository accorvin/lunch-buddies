import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
    build: {
      cssCodeSplit: false, // This will combine all CSS into one file
      rollupOptions: {
        output: {
          manualChunks: undefined // This ensures CSS is not split into chunks
        }
      }
    },
    server: {
      port: 3000,
      proxy: {
        '^/api/.*': {
          target: env.VITE_BACKEND_URL || 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          ws: true,
          logLevel: 'debug'
        },
        '^/auth/.*': {
          target: env.VITE_BACKEND_URL || 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          ws: true,
          logLevel: 'debug'
        }
      }
    }
  }
})
