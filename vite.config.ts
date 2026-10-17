import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'portable' ? [viteSingleFile()] : [])],
  build: mode === 'portable' ? { outDir: '.local-build' } : {},
}));
