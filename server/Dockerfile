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
FROM alpine:latest

# 必要なバイナリのみをコピー
COPY --from=builder /app/main /main

# ポートを開放
EXPOSE 8081

# コンテナが起動時に実行するコマンド
CMD ["/main"]