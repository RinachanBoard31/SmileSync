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
    NEXT_PUBLIC_CLIENT_ADDRESS: process.env.NEXT_PUBLIC_CLIENT_ADDRESS,
    NEXT_PUBLIC_CLIENT_WEBSOCKET: process.env.NEXT_PUBLIC_CLIENT_WEBSOCKET,
  },
};

export default nextConfig;
