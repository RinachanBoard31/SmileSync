package domain

import (
	"log"

	"github.com/gorilla/websocket"
)

type Client struct {
	ws     *websocket.Conn
	sendCh chan Message
}

type Message []byte

func NewClient(ws *websocket.Conn) *Client {
	return &Client{
		ws:     ws,
		sendCh: make(chan Message),
	}
}

func (c *Client) RoadLoop(broadcast chan<- Message, unregister chan<- *Client) {
	defer func() { // ReadLoopが終了する際に呼ばれる
		c.disconnect(unregister)
	}()
	for {
		_, jsonMsg, err := c.ws.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("unexpected close error: %v", err)
			}
			break
		}
		broadcast <- jsonMsg
	}
}

func (c *Client) WhiteLoop() {
	defer func() {
		c.ws.Close()
	}()
	for {
		msg := <-c.sendCh
		w, err := c.ws.NextWriter(websocket.TextMessage) // websocketレスポンスを行うWriterを発行
		if err != nil {
			return
		}
		w.Write(msg)                      // Writerにmsgを書き込む
		if err := w.Close(); err != nil { // w.Close()によって、websocketコネクションを確立しているブラウザにレスポンスを返す
			return
		}
	}
}

func (c *Client) disconnect(unregister chan<- *Client) {
	unregister <- c
	c.ws.Close()
}
