package websocket

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"

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
	ClientsList     []string  `json:"clientsList,omitempty"`
	ImageUrl        string    `json:"imageUrl,omitempty"`
}

type Server struct {
	clients         map[*websocket.Conn]string // Nicknameで接続中のclientsを管理
	broadcast       chan Message
	smileBroadcast  chan int
	imageBroadcast  chan string
	messages        []Message
	totalSmilePoint int
	currentImageUrl string
	mu              sync.Mutex
}

func NewServer() *Server {
	return &Server{
		clients:         make(map[*websocket.Conn]string),
		broadcast:       make(chan Message),
		smileBroadcast:  make(chan int),
		imageBroadcast:  make(chan string),
		messages:        make([]Message, 0),
		totalSmilePoint: 0,
		currentImageUrl: "",
	}
}

func (s *Server) HandleClients(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer func() {
		// HandleClients()終了時に実行、つまりwebsocketから切断されたときに実行
		s.mu.Lock()
		delete(s.clients, conn) // clientを削除
		s.mu.Unlock()
		s.broadcastClientsList()
		conn.Close()
	}()

	// Nicknameを受け取るまで待つ
	_, msg, err := conn.ReadMessage()
	if err != nil {
		log.Println("Error reading initial message: ", err)
		return
	}

	var initMsg Message
	if err := json.Unmarshal(msg, &initMsg); err != nil {
		log.Println("Error unmarshaling initial message: ", err)
		return
	}

	// 新しいClientを登録
	s.mu.Lock()
	s.clients[conn] = initMsg.Nickname
	s.mu.Unlock()

	// 現在のClientリストを全てのClientsに送信
	s.broadcastClientsList()

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
	// 全てのメッセージを履歴に保存
	s.mu.Lock()
	s.messages = append(s.messages, message)
	s.mu.Unlock()
	// 他の全てのClientにメッセージを送信
	s.broadcast <- message
}

func (s *Server) handleSmilePoint(message Message) {
	firestoreField := firebase.SmilePoint{
		Timestamp: message.Timestamp,
		ClientId:  message.ClientId,
		Nickname:  message.Nickname,
		Point:     message.Point,
	}
	if err := firebase.SaveSmilePoint(firestoreField); err != nil {
		log.Println("Error inserting message into Firestore: ", err)
		return
	}
	s.mu.Lock()
	s.totalSmilePoint += message.Point
	s.mu.Unlock()

	// 他の全てのClientにSmilePointを送信
	s.smileBroadcast <- s.totalSmilePoint

	if s.totalSmilePoint >= 100 && s.currentImageUrl == "" {
		imageUrl, err := generateImageUrl()
		if err == nil && imageUrl != "" {
			s.mu.Lock()
			s.currentImageUrl = imageUrl
			s.mu.Unlock()
			// 他の全てのClientに新しいImageUrlを送信
			log.Println(s.currentImageUrl)
			s.imageBroadcast <- s.currentImageUrl
		}
	}
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
		// ImageUrlが送信された場合
		case imageUrl := <-s.imageBroadcast:
			s.mu.Lock()
			imageUrlMsg := Message{
				Type:     "imageUrl",
				ImageUrl: imageUrl,
			}
			for client := range s.clients {
				s.sendMessage(client, imageUrlMsg)
			}
			s.mu.Unlock()
			log.Printf("Sent a new image url to all clients: %s\n", imageUrl)
		}
	}
}

func (s *Server) broadcastClientsList() {
	s.mu.Lock()
	clientNicknames := make([]string, 0, len(s.clients))
	for _, nickname := range s.clients {
		clientNicknames = append(clientNicknames, nickname)
	}
	s.mu.Unlock()
	clientListMsg := Message{
		Type:        "clientsList",
		ClientsList: clientNicknames,
	}
	s.mu.Lock()
	for client := range s.clients {
		s.sendMessage(client, clientListMsg)
	}
	s.mu.Unlock()
	log.Println("Broadcasting clients list:", clientNicknames)
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

func generateImageUrl() (string, error) {
	form, err := newFormData()
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", os.Getenv("DALLE_API_ENDPOINT"), form)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+os.Getenv("DALLE_API_KEY"))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		bodyString := string(bodyBytes)
		log.Printf("Failed to generate image: %s", bodyString)
		return "", err
	}

	var result struct {
		Data []struct {
			Url string `json:"url"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	log.Println(result.Data)
	if len(result.Data) > 0 {
		return result.Data[0].Url, nil
	}
	return "", nil
}

func newFormData() (*bytes.Buffer, error) {
	// imageFilePath := "../img/init.png"

	// file, err := os.Open(imageFilePath)
	// if err != nil {
	// 	log.Fatalf("Error opening init png: %v", err)
	// 	return nil, "", err
	// }
	// defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// bodyへの画像の設定
	// fileWriter, err := writer.CreateFormFile("image", filepath.Base(imageFilePath))
	// if err != nil {
	// 	log.Fatalf("Error creating form file: %v", err)
	// 	return nil, "", err
	// }
	// _, err = io.Copy(fileWriter, file)
	// if err != nil {
	// 	log.Fatalf("Error copying file content: %v", err)
	// 	return nil, "", err
	// }

	// その他のfieldの設定
	writer.WriteField("prompt", "A dog, high resolution, golden retriever, peaceful, pet, smile, warm atmosphere, not sick")
	writer.WriteField("model", "dall-e-3")
	writer.WriteField("n", "1")
	writer.WriteField("size", "1024x1024")
	writer.WriteField("quality", "standard")
	writer.WriteField("response_format", "url")
	writer.WriteField("style", "natural")

	err := writer.Close()
	if err != nil {
		log.Fatalf("Error closing writer: %v", err)
		return nil, err
	}

	return body, nil
}
