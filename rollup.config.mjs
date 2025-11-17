import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcFolder = path.resolve(__dirname, 'src');

const plugins = [
  peerDepsExternal(),
  resolve(),
  commonjs(),
  typescript({ useTsconfigDeclarationDir: true })
];

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/index.es.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    external: [ 'yoga-layout', 'yoga-layout/load' ],
    plugins
  },
  {
    input: 'src/react-spring/index.ts',
    output: [
      {
        file: 'dist/react-spring/index.js',
        format: 'cjs',
        sourcemap: true,
        paths: (id) => id === srcFolder ? '../index.js' : id
      },
      {
        file: 'dist/react-spring/index.es.js',
        format: 'esm',
        sourcemap: true,
        paths: (id) => id === srcFolder ? '../index.es.js' : id
      },
    ],
    external: [ '@react-spring/types', '@react-spring/core', '@react-spring/animated', '..' ],
    plugins
  },
];
