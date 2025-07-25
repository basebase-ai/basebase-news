/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    BASEBASE_PROJECT: process.env.BASEBASE_PROJECT,
    BASEBASE_TOKEN: process.env.BASEBASE_TOKEN,
  },
  basePath: "",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "/api/:path*",
      },
    ];
  },
  images: {
    // Disable image optimization for external domains to avoid issues
    unoptimized: true,
    domains: ["firebasestorage.googleapis.com"],
  },
};

module.exports = nextConfig;
