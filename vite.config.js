// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  server: {
    historyApiFallback: true,
  },

  resolve: {
    alias: {
      firebase: path.resolve(__dirname, 'node_modules/firebase'),
    },
  },

  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
  },

  build: {
    rollupOptions: {
      external: ['firebase/auth'],
    },
  },
})
