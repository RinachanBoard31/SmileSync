## コード概要
client, serverそれぞれのディレクトリに、フロント, バックのコードがあります。
実装技術は下記です。
- client -> React + Next
- server -> Go

本番環境では、clientをVercelで、serverをCloud Runでデプロイしています。

## docker
ルートディレクトリにて下記を実行することで、Client, Server両方のコンテナが立ち上がります。
```
docker compose up --build
```

## debug
VSCodeにて、下記実行可能です。
- Clientサイドのみ
- Serverサイドのみ
- 両方

## .env
/client, /server配下に、それぞれ`.env`ファイルが必要です。
記載すべき環境変数は、`.env.example`を参照ください。