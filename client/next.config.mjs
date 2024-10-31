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
    NEXT_PUBLIC_SERVER_ADDRESS: process.env.NEXT_PUBLIC_SERVER_ADDRESS,
    NEXT_PUBLIC_SERVER_WEBSOCKET: process.env.NEXT_PUBLIC_SERVER_WEBSOCKET,
    NEXT_PUBLIC_ADMIN_NICKNAME: process.env.NEXT_PUBLIC_ADMIN_NICKNAME,
  },
};

export default nextConfig;
