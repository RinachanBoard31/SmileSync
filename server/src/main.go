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

type Message struct {
	timestamp time.Time
	message   string
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
		fmtMsg := fmt.Sprintf("%s: %s", msg.timestamp.Format(time.RFC3339), msg.message)
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
		newMsg := Message{
			timestamp: time.Now(),
			message:   string(msg),
		}
		log.Printf("%s Received: %s", newMsg.timestamp.Format(time.RFC3339), newMsg.message)
		// 全てのメッセージを履歴に保存
		s.mu.Lock()
		s.messages = append(s.messages, newMsg)
		s.mu.Unlock()
		// 他の全てのClientにメッセージを送信
		s.broadcast <- newMsg
	}
}

func (s *Server) handleMessages() {
	// メッセージを待ち受け、全てのClientに送信
	for {
		newMsg := <-s.broadcast
		s.mu.Lock()
		fmtMsg := fmt.Sprintf("%s: %s", newMsg.timestamp.Format(time.RFC3339), newMsg.message)
		for client := range s.clients {
			if err := client.WriteMessage(websocket.TextMessage, []byte(fmtMsg)); err != nil {
				log.Println(err)
				client.Close()
				return
			}
		}
		s.mu.Unlock()
		log.Println("Sent messageto all clients: ", string(newMsg.message))
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
