/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Fix for monorepo / subdirectory deployment
  experimental: {
    turbo: {
      root: __dirname,
    },
  },
};

module.exports = nextConfig;
