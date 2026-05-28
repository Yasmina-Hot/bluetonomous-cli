import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'lib',
  target: 'node18',
  splitting: false,
  shims: false,
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.jsxImportSource = 'react'
  },
})
