import path from 'path'
import { defineConfig,InlineConfig,UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

interface VitestUserConfig extends UserConfig{
  test?:InlineConfig
}

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths()
  ],
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
}as VitestUserConfig)