package websocket

import (
	"encoding/json"
	"log"
	"net/http"

	"smile-sync/src/firebase"
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

// GoでJSONエンコードを行う場合、フィールド名はエクスポート（大文字で始まる必要があります）されている必要がある
type Message struct {
	Type            string    `json:"type"`
	Timestamp       time.Time `json:"timestamp"`
	ClientId        string    `json:"client_id"`
	Nickname        string    `json:"nickname"`
	Text            string    `json:"text,omitempty"`
	Point           int       `json:"point,omitempty"`
	TotalSmilePoint int       `json:"totalSmilePoint,omitempty"`
}

type Server struct {
	clients         map[*websocket.Conn]bool
	broadcast       chan Message
	smileBroadcast  chan int
	messages        []Message
	totalSmilePoint int
	mu              sync.Mutex
}

func NewServer() *Server {
	return &Server{
		clients:         make(map[*websocket.Conn]bool),
		broadcast:       make(chan Message),
		smileBroadcast:  make(chan int),
		messages:        make([]Message, 0),
		totalSmilePoint: 0,
	}
}

func (s *Server) HandleClients(w http.ResponseWriter, r *http.Request) {
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
		s.sendMessage(conn, msg)
	}

	// これまでのSmilePointを新しいClientに送信
	initialSmilePoint := Message{
		Type:            "smilePoint",
		TotalSmilePoint: s.totalSmilePoint,
	}
	s.sendMessage(conn, initialSmilePoint)

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
		var receivedMsg Message
		if err := json.Unmarshal(msg, &receivedMsg); err != nil {
			log.Println("Error unmarshaling message: ", err)
			continue
		}

		receivedMsg.Timestamp = time.Now()
		if receivedMsg.Type == "message" {
			s.handleMessage(receivedMsg)
		} else if receivedMsg.Type == "smilePoint" {
			s.handleSmilePoint(receivedMsg)
		}
		log.Printf("Received: %v", receivedMsg)
	}
}

func (s *Server) handleMessage(message Message) {
	firestoreMsg := firebase.Message{
		Timestamp: message.Timestamp,
		ClientId:  message.ClientId,
		Nickname:  message.Nickname,
		Text:      message.Text,
	}
	if err := firebase.InsertMessage(firestoreMsg); err != nil {
		log.Println("Error inserting message into Firestore: ", err)
		return
	}
	// 全てのメッセージを履歴に保存
	s.mu.Lock()
	s.messages = append(s.messages, message)
	s.mu.Unlock()
	// 他の全てのClientにメッセージを送信
	s.broadcast <- message
}

func (s *Server) handleSmilePoint(message Message) {
	s.mu.Lock()
	s.totalSmilePoint += message.Point
	s.mu.Unlock()
	// 他の全てのClientにSmilePointを送信
	s.smileBroadcast <- s.totalSmilePoint
}

func (s *Server) HandleMessages() {
	// メッセージを待ち受け、全てのClientに送信
	for {
		select {
		// メッセージが送信された場合
		case newMsg := <-s.broadcast:
			s.mu.Lock()
			for client := range s.clients {
				s.sendMessage(client, newMsg)
			}
			s.mu.Unlock()
			log.Printf("Sent message from" + newMsg.Nickname + "to all clients: " + newMsg.Text + "\n")
		// SmilePointが送信された場合
		case totalSmilePoint := <-s.smileBroadcast:
			s.mu.Lock()
			totalSmilePointMsg := Message{
				Type:            "smilePoint",
				TotalSmilePoint: totalSmilePoint,
			}
			for client := range s.clients {
				s.sendMessage(client, totalSmilePointMsg)
			}
			s.mu.Unlock()
			log.Printf("Sent total smile point to all clients: %dpt\n", totalSmilePoint)
		}
	}
}

func (s *Server) sendMessage(conn *websocket.Conn, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Println("Error marshaling message: ", err)
		return
	}
	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		log.Println("Error sending message: ", err)
		return
	}
}
