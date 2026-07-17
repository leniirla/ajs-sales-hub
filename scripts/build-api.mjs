import * as esbuild from 'esbuild';

// Bundled through esbuild's JS API (not the CLI binary directly) so this
// works the same way on every platform -- on Linux, node_modules/esbuild/bin/esbuild
// is the native ELF binary itself and must be exec'd, not passed to `node`.
await esbuild.build({
  entryPoints: ['server/serverless.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  outfile: 'api/index.js',
});
