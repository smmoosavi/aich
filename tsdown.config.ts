import { defineConfig } from 'tsdown';

export default defineConfig({
  fromVite: 'vitest',
  entry: ['src/index.ts', 'src/jsx-runtime.ts', 'src/jsx-dev-runtime.ts', 'src/dom.ts'],
});
