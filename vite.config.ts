import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'src', 'ui'),
  plugins: [react()],
  base: './',
  build: {
    outDir: resolve(__dirname, 'src', 'ui', 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 1420,
  },
});
