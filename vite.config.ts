import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'demo-dist',
  },
  server: {
    port: 3333,
    open: true,
  },
  optimizeDeps: {
    exclude: ['@untangling/canis'],
  },
});
