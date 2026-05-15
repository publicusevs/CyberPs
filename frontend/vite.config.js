import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(process.cwd(), '..'), '');
  const backendPort = env.BACKEND_PORT || '5174';
  const frontendPort = env.FRONTEND_PORT || '5173';

  return {
    plugins: [react()],
    server: {
      port: parseInt(frontendPort),
    },
    define: {
      __BACKEND_PORT__: JSON.stringify(backendPort),
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer(),
        ],
      },
    },
  };
})
