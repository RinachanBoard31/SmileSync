package websocket

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
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
	IsMeetingActive bool      `json:"isMeetingActive,omitempty"`
	Timer           string    `json:"timer,omitempty"`
	ClientId        string    `json:"client_id"`
	Nickname        string    `json:"nickname"`
	Text            string    `json:"text,omitempty"`
	Point           int       `json:"point,omitempty"`
	TotalSmilePoint int       `json:"totalSmilePoint,omitempty"`
	TotalIdeas      int       `json:"totalIdeas,omitempty"`
	Level           int       `json:"level,omitempty"`
	ClientsList     []string  `json:"clientsList,omitempty"`
	ImageUrls       []string  `json:"imageUrls,omitempty"`
	ImageAnimalType string    `json:"imageAnimalType,omitempty"`
}

type Server struct {
	isMeetingActive     bool                       // 会議の開始/終了を管理
	meetingStartTime    time.Time                  // 会議の開始時刻を管理
	clients             map[*websocket.Conn]string // Nicknameで接続中のclientsを管理
	broadcast           chan Message
	timerBroadcast      chan int64 // 経過時間[s]をClientに送信
	smileBroadcast      chan int
	ideaBroadcast       chan int
	imagesBroadcast     chan []string
	imageAnimalTypeBroadcast chan string
	levelBroadcast      chan int
	messages            []Message
	totalSmilePoint     int
	totalIdeas          int
	imageUrls           []string
	level               int
	levelThresholds     []int // レベルの閾値
	isLevelThresholdSet bool
	imageAnimalType	    string
	mu                  sync.Mutex
}

func NewServer() *Server {
	return &Server{
		isMeetingActive:     false,
		clients:             make(map[*websocket.Conn]string),
		broadcast:           make(chan Message),
		timerBroadcast:      make(chan int64),
		smileBroadcast:      make(chan int),
		ideaBroadcast:       make(chan int),
		imagesBroadcast:     make(chan []string),
		imageAnimalTypeBroadcast: make(chan string),
		levelBroadcast:      make(chan int),
		messages:            make([]Message, 0),
		totalSmilePoint:     0,
		totalIdeas:          0,
		imageUrls:           make([]string, 0),
		level:               1,
		levelThresholds:     make([]int, 9), // レベルが10段階なので、9つの閾値を設定
		isLevelThresholdSet: false,
		imageAnimalType:     "golden retriever",
	}
}

func (s *Server) handleMeetingStatus(message Message) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if message.IsMeetingActive == true {
		s.isMeetingActive = true
		s.meetingStartTime = time.Now()
		log.Println("Meeting started")

		// 経過時間を毎秒送信
		go func() {
			for s.isMeetingActive {
				// 会議開始後2分後に閾値を設定
				if !s.isLevelThresholdSet && int64(time.Since(s.meetingStartTime).Seconds()) >= 120 {
					s.mu.Lock()
					for i := 0; i < 9; i++ {
						s.levelThresholds[i] = s.totalSmilePoint * (1 << i) // 1, 2, 4, 8...倍
					}
					s.isLevelThresholdSet = true
					log.Printf("Level thresholds: %v\n", s.levelThresholds)
					s.mu.Unlock()
				}
				// カウントアップ
				elapsedTime := int64(time.Since(s.meetingStartTime).Seconds())
				s.timerBroadcast <- elapsedTime
				time.Sleep(1 * time.Second)
			}
		}()
	} else {
		s.isMeetingActive = false
		s.meetingStartTime = time.Time{}
		log.Println("Meeting ended")
	}

	meetingStatusMsg := Message{
		Type:            "meetingStatus",
		IsMeetingActive: s.isMeetingActive,
	}
	s.broadcast <- meetingStatusMsg
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

	// 現在のメッセージ履歴を新しいClientに送信
	for _, msg := range s.messages {
		s.sendMessage(conn, msg)
	}

	// 会議の状態を新しいClientに送信
	meetingStatusMsg := Message{
		Type:            "meetingStatus",
		IsMeetingActive: s.isMeetingActive,
	}
	s.sendMessage(conn, meetingStatusMsg)

	// 現在のSmilePointを新しいClientに送信
	initialSmilePoint := Message{
		Type:            "smilePoint",
		TotalSmilePoint: s.totalSmilePoint,
	}
	s.sendMessage(conn, initialSmilePoint)

	// 現在のIdea数を新しいClientに送信
	initialIdea := Message{
		Type:       "idea",
		TotalIdeas: s.totalIdeas,
	}
	s.sendMessage(conn, initialIdea)

	// 現在のImageUrlを新しいClientに送信
	if len(s.imageUrls) != 0 {
		imageUrls := Message{
			Type:     "imageUrls",
			ImageUrls: s.imageUrls,
		}
		s.sendMessage(conn, imageUrls)
	}

	// 現在のLevelを新しいClientに送信
	initialLevel := Message{
		Type:  "level",
		Level: s.level,
	}
	s.sendMessage(conn, initialLevel)

	// 現在のImageAnimalTypeを新しいClientに送信
	imageAnimalType := Message{
		Type:            "imageAnimalType",
		ImageAnimalType: s.imageAnimalType,
	}
	s.sendMessage(conn, imageAnimalType)

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
		log.Printf("Received: %v", receivedMsg)

		receivedMsg.Timestamp = time.Now()

		// 会議が開始されていない場合のみ更新を受け付ける
		if !s.isMeetingActive {
			if receivedMsg.Type == "imageAnimalType" {
				s.handleAnimalType(receivedMsg)
			}
		} else {
		// 会議が開始されている場合のみ更新を受け付ける
			if receivedMsg.Type == "message" {
				s.handleMessage(receivedMsg)
			} else if receivedMsg.Type == "smilePoint" {
				s.handleSmilePoint(receivedMsg)
			} else if receivedMsg.Type == "idea" {
				s.handleIdea(receivedMsg)
			}
		}

		// 会議の状態を更新
		if receivedMsg.Type == "meetingStatus" {
			s.handleMeetingStatus(receivedMsg)
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
	firestoreSmilePointField := firebase.SmilePoint{
		Timestamp:         message.Timestamp,
		SinceMeetingStart: int64(time.Since(s.meetingStartTime).Seconds()),
		ClientId:          message.ClientId,
		Nickname:          message.Nickname,
		Point:             message.Point,
		TotalSmilePoint:   s.totalSmilePoint,
	}
	if err := firebase.SaveSmilePoint(firestoreSmilePointField); err != nil {
		log.Println("Error inserting smile_point into Firestore: ", err)
	}
	s.mu.Lock()
	s.totalSmilePoint += message.Point
	s.mu.Unlock()

	// 他の全てのClientにSmilePointを送信
	s.smileBroadcast <- s.totalSmilePoint

	// レベルの処理
	s.mu.Lock()
	previousLevel := s.level
	if s.isLevelThresholdSet { // 閾値が設定されている場合に動的計算
		switch {
		case s.totalSmilePoint >= s.levelThresholds[8]:
			s.level = 10
		case s.totalSmilePoint >= s.levelThresholds[7]:
			s.level = 9
		case s.totalSmilePoint >= s.levelThresholds[6]:
			s.level = 8
		case s.totalSmilePoint >= s.levelThresholds[5]:
			s.level = 7
		case s.totalSmilePoint >= s.levelThresholds[4]:
			s.level = 6
		case s.totalSmilePoint >= s.levelThresholds[3]:
			s.level = 5
		case s.totalSmilePoint >= s.levelThresholds[2]:
			s.level = 4
		case s.totalSmilePoint >= s.levelThresholds[1]:
			s.level = 3
		case s.totalSmilePoint >= s.levelThresholds[0]:
			s.level = 2
		}
	} else {
		s.level = 1
	}
	s.mu.Unlock()

	// レベルが変化していたらFirestoreにLevelを保存
	if previousLevel != s.level {
		firestoreSmileLevelField := firebase.SmileLevel{
			Timestamp:         message.Timestamp,
			SinceMeetingStart: int64(time.Since(s.meetingStartTime).Seconds()),
			Level:             s.level,
		}
		if err := firebase.SaveSmileLevel(firestoreSmileLevelField); err != nil {
			log.Println("Error inserting smile_level into Firestore: ", err)
		}
		// 全てのClientに新しいLevelを送信
		s.levelBroadcast <- s.level

		// 新しいImageUrlを生成し、Firestoreに保存
		prompt, imageUrl, err := generateImageUrl(s.level, s.imageAnimalType)
		if err == nil && imageUrl != "" {
			firestoreSmileImageField := firebase.SmileImage{
				Timestamp:         message.Timestamp,
				SinceMeetingStart: int64(time.Since(s.meetingStartTime).Seconds()),
				TotalSmilePoint:   s.totalSmilePoint,
				Prompt:            prompt,
				ImageUrl:          imageUrl,
			}
			if err := firebase.SaveSmileImage(firestoreSmileImageField); err != nil {
				log.Println("Error inserting smile_image into Firestore: ", err)
			}
			s.mu.Lock()
			s.imageUrls = append(s.imageUrls, imageUrl)
			s.mu.Unlock()
			// 他の全てのClientに新しいImageUrlを送信
			s.imagesBroadcast <- s.imageUrls
		}
	}
}

func (s *Server) handleIdea(message Message) {
	firestoreIdeaField := firebase.SmileIdea{
		Timestamp:         message.Timestamp,
		SinceMeetingStart: int64(time.Since(s.meetingStartTime).Seconds()),
		ClientId:          message.ClientId,
		Nickname:          message.Nickname,
	}
	if err := firebase.SaveSmileIdea(firestoreIdeaField); err != nil {
		log.Println("Error inserting idea into Firestore: ", err)
	}
	s.mu.Lock()
	s.totalIdeas++
	s.mu.Unlock()

	// 他の全てのClientにIdea数を送信
	s.ideaBroadcast <- s.totalIdeas
}

func (s *Server) handleAnimalType(message Message) {
	s.mu.Lock()
	if !s.isMeetingActive {
		s.imageAnimalType = message.ImageAnimalType
		log.Printf("Image animal type is set to %s\n", s.imageAnimalType)
	} else {
		log.Println("Meeting is active, cannot change image animal type")
	}
	s.mu.Unlock()
	// 他の全てのClientに新しいImageAnimalTypeを送信
	s.imageAnimalTypeBroadcast <- s.imageAnimalType
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
		// Ideaが送信された場合
		case totalIdeas := <-s.ideaBroadcast:
			s.mu.Lock()
			totalIdeasMsg := Message{
				Type:       "idea",
				TotalIdeas: totalIdeas,
			}
			for client := range s.clients {
				s.sendMessage(client, totalIdeasMsg)
			}
			s.mu.Unlock()
			log.Printf("Sent total ideas to all clients: %d ideas\n", totalIdeas)
		// ImageUrlsが送信された場合
		case imageUrls := <-s.imagesBroadcast:
			s.mu.Lock()
			imageUrlsMsg := Message{
				Type:     "imageUrls",
				ImageUrls: imageUrls,
			}
			for client := range s.clients {
				s.sendMessage(client, imageUrlsMsg)
			}
			s.mu.Unlock()
			log.Printf("Sent a new image urls to all clients: %s\n", imageUrls)
		// ImageAnimalTypeが送信された場合
		case imageAnimalType := <-s.imageAnimalTypeBroadcast:
			s.mu.Lock()
			imageAnimalTypeMsg := Message{
				Type:            "imageAnimalType",
				ImageAnimalType: imageAnimalType,
			}
			for client := range s.clients {
				s.sendMessage(client, imageAnimalTypeMsg)
			}
			s.mu.Unlock()
			log.Printf("Sent a new image animal type to all clients: %s\n", imageAnimalType)
		// Levelが送信された場合
		case level := <-s.levelBroadcast:
			s.mu.Lock()
			levelMsg := Message{
				Type:  "level",
				Level: level,
			}
			for client := range s.clients {
				s.sendMessage(client, levelMsg)
			}
			s.mu.Unlock()
			log.Printf("Sent current level to all clients: %d\n", level)
		// Timerの経過時間が送信された場合
		case elapsedTime := <-s.timerBroadcast:
			s.mu.Lock()
			timerMsg := Message{
				Type:  "timer",
				Timer: fmt.Sprintf("%02d:%02d:%02d", int(elapsedTime)/3600, int(elapsedTime)%3600/60, int(elapsedTime)%60),
			}
			for client := range s.clients {
				s.sendMessage(client, timerMsg)
			}
			s.mu.Unlock()
			log.Printf("Sent elapsed time to all clients: %02d:%02d:%02d\n", int(elapsedTime)/3600, int(elapsedTime)%3600/60, int(elapsedTime)%60)
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

func generatePromptForLevel(level int, animalType string) string {
	if level < 1 {
		level = 1
	} else if level > 10 {
		level = 10
	}

	basePrompt := fmt.Sprintf(
        "high resolution, a single %s, no other animals, no duplicates, no extra figures, no humans, neutral plain background, focus on the animal, natural lighting",
        animalType,
    )

	descriptions := []string{
		"A small, tired animal, looking peaceful but weak, low energy,",
		"A young animal, slightly playful, starting to gain energy, healthy,",
		"A growing animal, happy and playful, starting to look confident,",
		"A medium-sized animal, cheerful and active, full of vitality,",
		"A young adult animal, energetic and happy, strong and confident,",
		"A well-grown animal, full of energy, playful and intelligent,",
		"A mature animal, very active, visibly healthy and muscular,",
		"A highly energetic animal, at peak vitality, very happy and alert,",
		"An adult animal, vibrant and radiant, full of life,",
		"A majestic adult animal, the epitome of health and happiness,",
	}

	growthEnergyPrompt := fmt.Sprintf(
		"Growth level is %d out of 10, Energy level is %d out of 10.",
		level, level,
	)

	prompt := fmt.Sprintf("%s %s %s", basePrompt, descriptions[level-1], growthEnergyPrompt)
	return prompt
}

func generateImageUrl(level int, animalType string) (prompt string, imageUrl string, err error) {
	generatedPrompt := generatePromptForLevel(level, animalType)

	reqBody := map[string]interface{}{
		"prompt":          generatedPrompt,
		"model":           "dall-e-3",
		"n":               1,
		"size":            "1024x1024",
		"quality":         "standard",
		"response_format": "url",
		"style":           "natural",
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", "", err
	}

	req, err := http.NewRequest("POST", os.Getenv("DALLE_API_ENDPOINT"), bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+os.Getenv("DALLE_API_KEY"))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		bodyString := string(bodyBytes)
		log.Printf("Failed to generate image: %s", bodyString)
		return "", "", err
	}

	var result struct {
		Data []struct {
			Url string `json:"url"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", err
	}

	if len(result.Data) > 0 {
		return generatedPrompt, result.Data[0].Url, nil
	}
	return generatedPrompt, "", nil
}
