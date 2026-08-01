import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves from /ppmkit/, Netlify from the domain root.
  // The Pages workflow sets GITHUB_PAGES=true at build time.
  base: process.env.GITHUB_PAGES ? '/ppmkit/' : '/',
  plugins: [react()],
})
