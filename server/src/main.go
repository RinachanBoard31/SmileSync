package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"smile-sync/src/firebase"
	"smile-sync/src/handler"
	"smile-sync/src/middleware"
	"smile-sync/src/utils"
	"smile-sync/src/websocket"
	"time"

	"github.com/joho/godotenv"
)

func init() {
	envPath := ".env"
	// debug時の.envファイルのパス指定
	if _, err := os.Stat(envPath); os.IsNotExist(err) {
		envPath = "../.env"
	}
	err := godotenv.Load(envPath)
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}
}

func main() {
	// FirestoreのドキュメントIDを生成
	firebase.DocId = utils.ConvertYYYYMMDDHHMMSS(time.Now())
	// Firestore初期化
	firebase.InitFirestore()
	defer firebase.CloseFirestore()

	s := websocket.NewServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/login", handler.LoginHandler)
	mux.HandleFunc("/ws", s.HandleClients)
	go s.HandleMessages()

	port := os.Getenv("PORT")
	log.Printf("Server started on port %s", port)
	if err := http.ListenAndServe(fmt.Sprintf(":%v", port), middleware.EnableCORS(mux)); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
