/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    JWT_SECRET: process.env.JWT_SECRET,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_SECURE: process.env.SMTP_SECURE,
    BASEBASE_API_KEY: process.env.BASEBASE_API_KEY,
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
