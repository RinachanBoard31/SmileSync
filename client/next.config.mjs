/** @type {import('next').NextConfig} */

const nextConfig = {
    webpack: (config, { dev, isServer }) => {
        if (dev && !isServer) {
            config.devtool = 'source-map'; // ソースマップを生成するためのオプション。開発環境（dev）でのみ有効。
        }
        return config;
    },
};

export default nextConfig;
