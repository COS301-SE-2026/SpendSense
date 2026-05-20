import path from 'path'
import { defineConfig } from 'vitest/config'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import react from '@vitejs/plugin-react'

export default defineConfig({
  // cast needed: project uses Vite 8 (rolldown) but Vitest bundles Vite 6 (rollup), causing plugin type mismatch
  plugins: [react() as any],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
})
