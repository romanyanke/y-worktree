import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.tsx'],
  format: 'esm',
  platform: 'node',
  target: 'node18',
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
});
