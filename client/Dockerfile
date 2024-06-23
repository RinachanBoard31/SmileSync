# ベースイメージを指定
FROM node:18-alpine AS builder

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係をインストール
COPY package.json package-lock.json ./
RUN npm install

# ソースコードをコピー
COPY . .

# アプリケーションをビルド
RUN npm run build

# 実行ステージ
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# 必要なファイルをコピー
COPY --from=builder /app ./

# コンテナが起動時に実行するコマンド
CMD ["npm", "start"]
