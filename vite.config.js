import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist-vite', target: 'es2020' },
  server: { port: 5173, open: true },
});
