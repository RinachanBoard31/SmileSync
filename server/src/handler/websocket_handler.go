package handler

import (
	"log"
	"net/http"
	"smile-sync/src/domain"

	"github.com/gorilla/websocket"
)

type WebsocketHandler struct {
	hub *domain.Hub
}

func NewWebsocketHandler(hub *domain.Hub) *WebsocketHandler {
	return &WebsocketHandler{
		hub: hub,
	}
}

func (wh *WebsocketHandler) Handle(w http.ResponseWriter, r *http.Request) {
	upgrader := &websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	client := domain.NewClient(ws)
	go client.RoadLoop(wh.hub.BroadcastCh, wh.hub.UnRegisterCh)
	go client.WhiteLoop()
	wh.hub.RegisterCh <- client
}
