package websocket

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"smile-sync/src/firebase"
	"smile-sync/src/utils"
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
	Timestamp time.Time `json:"timestamp"`
	ClientId  string    `json:"client_id"`
	Nickname  string    `json:"nickname"`
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
		fmtMsg := fmt.Sprintf("%s: %s\n >> %s", utils.ConvertHHMMSS(msg.Timestamp), msg.Nickname, msg.Text)
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
		log.Printf("Received: %s %s %s %s", utils.ConvertHHMMSS(receivedMsg.Timestamp), receivedMsg.Text, receivedMsg.Nickname, receivedMsg.ClientId)
		// Firestoreにメッセージを保存
		firestoreMsg := firebase.Message{
			Timestamp: receivedMsg.Timestamp,
			ClientId:  receivedMsg.ClientId,
			Nickname:  receivedMsg.Nickname,
			Text:      receivedMsg.Text,
		}
		if err := firebase.InsertMessage(firestoreMsg); err != nil {
			log.Println("Error inserting message into Firestore: ", err)
			continue
		}
		// 全てのメッセージを履歴に保存
		s.mu.Lock()
		s.messages = append(s.messages, receivedMsg)
		s.mu.Unlock()
		// 他の全てのClientにメッセージを送信
		s.broadcast <- receivedMsg
	}
}

func (s *Server) HandleMessages() {
	// メッセージを待ち受け、全てのClientに送信
	for {
		newMsg := <-s.broadcast
		s.mu.Lock()
		fmtMsg := fmt.Sprintf("%s: %s\n >> %s", utils.ConvertHHMMSS(newMsg.Timestamp), newMsg.Nickname, newMsg.Text)
		for client := range s.clients {
			if err := client.WriteMessage(websocket.TextMessage, []byte(fmtMsg)); err != nil {
				log.Println(err)
				client.Close()
				return
			}
		}
		s.mu.Unlock()
		log.Printf("Sent message from" + newMsg.Nickname + "to all clients: " + newMsg.Text + "\n")
	}
}
