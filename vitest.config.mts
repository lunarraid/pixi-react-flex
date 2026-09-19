import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      // The test renderer drives @pixi/react's own reconciler and helpers, which its exports map doesn't expose.
      {
        find: /^@pixi\/react\/lib\/(.*)$/,
        replacement: fileURLToPath(new URL('./node_modules/@pixi/react/lib/$1', import.meta.url))
      }
    ]
  },
  test: {
    environment: 'node',
    include: [ 'test/**/*.test.{ts,tsx}' ],
    // Bundled by vite rather than loaded by node, which can't resolve @pixi/react's extensionless imports.
    server: { deps: { inline: [ '@pixi/react' ] } }
  }
});
