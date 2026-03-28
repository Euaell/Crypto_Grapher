/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 1,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
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

    // Three.js needs this for proper tree-shaking
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    return config;
  },
  images: {
    domains: ['localhost'],
  },
  // Transpile three.js related packages
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

module.exports = nextConfig;
