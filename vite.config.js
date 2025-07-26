// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dit is een standaard, schone configuratie voor een React + Vite project.
// De onnodige en incorrecte configuraties voor 'resolve', 'optimizeDeps' en 'build' zijn verwijderd.
export default defineConfig({
  plugins: [react()],
})
