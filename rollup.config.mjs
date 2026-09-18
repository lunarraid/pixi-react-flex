import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

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
        paths: (id) => id.endsWith('/src') || id === '..' ? '../index.js' : id
      },
      {
        file: 'dist/react-spring/index.es.js',
        format: 'esm',
        sourcemap: true,
        paths: (id) => id.endsWith('/src') || id === '..' ? '../index.es.js' : id
      },
    ],
    external: (id) => {
      if (id === '@react-spring/types' || id === '@react-spring/core' || id === '@react-spring/animated') return true;
      if (id === '..' || id.endsWith('/src') || id.endsWith('/src/index.ts')) return true;
      return false;
    },
    plugins
  },
];
