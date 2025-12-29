import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/dwesk-webchat.js',
        format: 'umd',
        name: 'DweskWebChatSDK',
        sourcemap: true
      },
      {
        file: 'dist/dwesk-webchat.min.js',
        format: 'umd',
        name: 'DweskWebChatSDK',
        sourcemap: true,
        plugins: [terser()]
      }
    ],
    plugins: [
      resolve({ browser: true }),
      commonjs()
    ]
  },
  
  {
    input: 'src/index.js',
    output: {
      file: 'dist/dwesk-webchat.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  },
  
  {
    input: 'src/webhook-server.js',
    output: {
      file: 'dist/webhook-server.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'default'
    },
    external: ['express'],
    plugins: [
      resolve(),
      commonjs()
    ]
  }
];