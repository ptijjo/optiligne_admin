import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['react-leaflet', 'leaflet'],
};

export default nextConfig;
