import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    dirs: ['pages', 'components', 'lib', 'hooks', 'stores']
  },
  webpack(config) {
    // Optimize for new dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  }
};

export default nextConfig;
