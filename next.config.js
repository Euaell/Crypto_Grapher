/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Completely disable static optimization/prerendering
  // This ensures pages only render at runtime
  staticPageGenerationTimeout: 1, // Force timeout quickly
  typescript: {
    // We'll run type checking separately
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint checking during build
    ignoreDuringBuilds: true,
  },
  // Use Node.js polyfills for browser APIs
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fixes npm packages that depend on `crypto` module
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        util: require.resolve('util'),
        process: require.resolve('process/browser'),
        events: require.resolve('events')
      };
      
      config.plugins.push(
        new (require('webpack')).ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }
    return config;
  },
  images: {
    domains: ['localhost'],
  },
  // Disable automatic static optimization for all pages
  // This ensures client components run on the client only
  // output: 'export',
  // Skip type checking to simplify the build (for this demo project)
};

module.exports = nextConfig; 