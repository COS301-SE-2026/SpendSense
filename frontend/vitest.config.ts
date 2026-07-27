import path from 'path'
import { defineConfig,InlineConfig,UserConfig } from 'vite'
import { configDefaults } from 'vitest/config'
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
    exclude: [...configDefaults.exclude, 'e2e/**'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    env: {
      VITE_SUPABASE_URL: 'https://placeholder.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'placeholder-anon-key',
      VITE_API_URL: 'http://localhost:3000/api/v1',
    },
    deps: {
      optimizer: {
        web: {
          include: ['react']
        }
      }
    }
  },
}as VitestUserConfig)
