import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // If we are building for production (GitHub Pages), use the repo name.
    // If we are developing locally (serve), use the root path.
    base: command === 'build' ? '/Canvapp/' : '/',
    define: {
      // Vital for making process.env.API_KEY available in the client-side code
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    build: {
      outDir: 'dist',
    }
  }
})