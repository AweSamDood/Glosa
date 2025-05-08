import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load the .env file based on mode
  // This allows --mode dataset1 to load .env.dataset1
  const env = loadEnv(mode, process.cwd(), '');

  console.log(`Running in ${mode} mode with data source: ${env.VITE_DATA_URL || 'default'}`);

  return {
    plugins: [react()],
    // Configure dev server to allow accessing from local network if needed
    server: {
      host: true,
    }
  }
})