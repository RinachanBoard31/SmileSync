package main

// import (
// 	"fmt"
// 	"log"
// 	"net/http"

// 	domain "smile-sync/src/domain"
// 	handler "smile-sync/src/handler"
// )

// func main() {
// 	hub := domain.NewHub()
// 	go hub.RunLoop()

// 	http.HandleFunc("/ws", handler.NewWebsocketHandler(hub).Handle)

// 	port := "8081"
// 	log.Printf("Server started on port %s", port)
// 	if err := http.ListenAndServe(fmt.Sprintf(":%v", port), nil); err != nil {
// 		log.Fatalf("Server failed to start: %v", err)
// 	}
// }

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var creds map[string]string
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
	}

	var validPassword = "test"
	if creds["password"] != validPassword {
		http.Error(w, "Invalid password", http.StatusUnauthorized)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// GoでJSONエンコードを行う場合、フィールド名はエクスポート（大文字で始まる必要があります）されている必要がある
type Message struct {
	Timestamp time.Time `json:"timestamp"`
	ClientId  string    `json:"clientId"`
	Text      string    `json:"text"`
}

type Server struct {
	clients   map[*websocket.Conn]bool
	broadcast chan Message
	messages  []Message
	mu        sync.Mutex
}

func NewServer() *Server {
	return &Server{
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan Message),
		messages:  make([]Message, 0),
	}
}

func ConvertHHMMSS(t time.Time) string {
	return t.Format("15:04:05") // このレイアウトって具体的で良いらしい
}

func (s *Server) handleClients(w http.ResponseWriter, r *http.Request) {
	// authHeader := r.Header.Get("Authorization")
	// if authHeader != "Bearer valid-token" {
	// 	http.Error(w, "Unauthorized", http.StatusUnauthorized)
	// 	return
	// }

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	// 新しいClientを登録
	s.mu.Lock()
	s.clients[conn] = true

	// これまでのメッセージ履歴を新しいClientに送信
	for _, msg := range s.messages {
		fmtMsg := fmt.Sprintf("%s: %s\nby %s", ConvertHHMMSS(msg.Timestamp), msg.Text, msg.ClientId)
		if err := conn.WriteMessage(websocket.TextMessage, []byte(fmtMsg)); err != nil {
			log.Println(err)
			return
		}
	}
	s.mu.Unlock()

	// Clientからのメッセージを待ち受ける
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			s.mu.Lock()
			delete(s.clients, conn)
			s.mu.Unlock()
			break
		}
		// 受信したメッセージを構造体に変換
		var receivedMsg Message
		if err := json.Unmarshal(msg, &receivedMsg); err != nil {
			log.Println("Error unmarshaling message: ", err)
			continue
		}
		receivedMsg.Timestamp = time.Now()
		log.Printf("Received: %s %s %s", ConvertHHMMSS(receivedMsg.Timestamp), receivedMsg.ClientId, receivedMsg.Text)
		// 全てのメッセージを履歴に保存
		s.mu.Lock()
		s.messages = append(s.messages, receivedMsg)
		s.mu.Unlock()
		// 他の全てのClientにメッセージを送信
		s.broadcast <- receivedMsg
	}
}

func (s *Server) handleMessages() {
	// メッセージを待ち受け、全てのClientに送信
	for {
		newMsg := <-s.broadcast
		s.mu.Lock()
		fmtMsg := fmt.Sprintf("%s: %s\nby %s", ConvertHHMMSS(newMsg.Timestamp), newMsg.Text, newMsg.ClientId)
		for client := range s.clients {
			if err := client.WriteMessage(websocket.TextMessage, []byte(fmtMsg)); err != nil {
				log.Println(err)
				client.Close()
				return
			}
		}
		s.mu.Unlock()
		log.Printf("Sent message from" + newMsg.ClientId + "to all clients: " + newMsg.Text + "\n")
	}
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	server := NewServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/login", loginHandler)
	mux.HandleFunc("/ws", server.handleClients)
	go server.handleMessages()

	port := "8081"
	log.Printf("Server started on port %s", port)
	if err := http.ListenAndServe(fmt.Sprintf(":%v", port), enableCORS(mux)); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
