import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths so it works deployed anywhere (subdirectory, CDN, etc.)
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: true,
    target: 'es2020',
  },
});
