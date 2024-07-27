import 'dotenv/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devtool = 'source-map'; // ソースマップを生成するためのオプション。開発環境（dev）でのみ有効。
    }
    return config;
  },
  env: {
    NEXT_PUBLIC_CLIENT_IP: process.env.NEXT_PUBLIC_CLIENT_IP,
    NEXT_PUBLIC_PORT: process.env.NEXT_PUBLIC_PORT,
  },
};

export default nextConfig;
