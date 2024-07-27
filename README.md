## コード概要
client, serverそれぞれのディレクトリに、フロント, バックのコードがあります。
実装技術は下記です。
- client -> React + Next
- server -> Go

## docker
ルートディレクトリにて下記を実行することで、Client, Server両方立ち上がります。
```
docker-compose up --build
```

## debug
VSCodeにて、下記実行可能です。
- Clientサイドのみ
- Serverサイドのみ
- 両方