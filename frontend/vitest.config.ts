/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    react() as any, 
    tsconfigPaths() as any
  ],
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