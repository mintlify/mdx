/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@shikijs/twoslash', '@typescript/vfs', 'typescript'],
};

module.exports = nextConfig;
