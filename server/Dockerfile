# syntax=docker/dockerfile:1

# ベースイメージを指定
FROM golang:1.22-alpine AS builder

# 作業ディレクトリを設定
WORKDIR /app

# Goの依存関係をコピー
COPY go.mod go.sum ./
RUN go mod download

# ソースコードをコピー
COPY . .

# Goのバイナリをビルド
RUN go build -o main ./src/main.go

# 実行ステージ
FROM golang:1.22-alpine

# 作業ディレクトリを設定
WORKDIR /app

# 必要なファイルをコピー
COPY --from=builder /app/main /app/main

# ポートを開放
EXPOSE 8081

# コンテナが起動時に実行するコマンド
CMD ["/app/main"]