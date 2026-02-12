import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Netlify optimization
  output: 'standalone',
  distDir: '.next',
  
  // Environment variables
  env: {
    // Add any environment variables that need to be exposed to the client
  },
  
  // Image optimization for Netlify
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
    ],
    // Disable image optimization for Netlify (can be enabled later)
    unoptimized: true,
  },
  
  // API routes configuration
  serverExternalPackages: [
    // Add any server-side packages that need external handling
  ],
};

export default nextConfig;
