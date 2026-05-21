import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  // @ts-expect-error tyoes are diff
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    deps: {
      optimizer: {
        web: {
          include: ['react']
        }
      }
    }
  },
})