const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@shikijs/twoslash'],
  outputFileTracingIncludes: {
    '/render': [
      path.relative(
        process.cwd(),
        path.resolve(require.resolve('typescript/package.json'), '..', 'lib', 'lib.*.d.ts')
      ),
      './node_modules/@types/node/**',
    ],
  },
};

module.exports = nextConfig;
