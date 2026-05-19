import path from "path" //node helper for building files safely
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  resolve: { //telsl vite how to understand the imports
    alias:{ //creates shortcut name for folder
      "@":path.resolve(__dirname,"./src"),//@is shortcut for src folder
    },
  },
})
