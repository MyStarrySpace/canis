import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    worker: 'src/worker.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@xyflow/react'],
  esbuildOptions(options) {
    options.loader = { ...options.loader, '.wasm': 'file' };
  },
});
