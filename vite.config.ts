import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { dataApiPlugin } from './vite-data-api-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  // dataApiPlugin only registers its middleware during `vite dev` (via
  // configureServer) — it's a no-op for `vite build`/`vite preview`, so
  // production builds are unaffected and just use the bundled JSON as a
  // read-only snapshot.
  plugins: [react(), dataApiPlugin()],
})
