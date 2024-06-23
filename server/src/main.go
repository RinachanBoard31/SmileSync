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
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Server struct {
	clients   map[*websocket.Conn]bool
	broadcast chan string
	messages  []string
	mu        sync.Mutex
}

func NewServer() *Server {
	return &Server{
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan string),
		messages:  make([]string, 0),
	}
}

func (s *Server) handleClients(w http.ResponseWriter, r *http.Request) {
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
		if err := conn.WriteMessage(websocket.TextMessage, []byte(msg)); err != nil {
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
		log.Println("Received message: ", string(msg))
		// 全てのメッセージを履歴に保存
		s.mu.Lock()
		s.messages = append(s.messages, string(msg))
		s.mu.Unlock()
		// 他の全てのClientにメッセージを送信
		s.broadcast <- string(msg)
	}
}

func (s *Server) handleMessages() {
	// メッセージを待ち受け、全てのClientに送信
	for {
		msg := <-s.broadcast
		s.mu.Lock()
		for client := range s.clients {
			if err := client.WriteMessage(websocket.TextMessage, []byte(msg)); err != nil {
				log.Println(err)
				client.Close()
				return
			}
		}
		s.mu.Unlock()
		log.Println("Sent messageto all clients: ", string(msg))
	}
}

func main() {
	server := NewServer()

	http.HandleFunc("/ws", server.handleClients)
	go server.handleMessages()

	port := "8081"
	log.Printf("Server started on port %s", port)
	if err := http.ListenAndServe(fmt.Sprintf(":%v", port), nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
