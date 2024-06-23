package domain

type Hub struct {
	Clients      map[*Client]bool // 現在のチャット参加者一覧
	RegisterCh   chan *Client     // Clientの参照をやり取りするchannel, 入室時に利用
	UnRegisterCh chan *Client     // Clientの参照をやり取りするchannel, 退室時に利用
	BroadcastCh  chan Message     // messageをやり取りするchannel, ユーザがチャットを送信した時に利用
}

func NewHub() *Hub {
	return &Hub{
		Clients:      make(map[*Client]bool),
		RegisterCh:   make(chan *Client),
		UnRegisterCh: make(chan *Client),
		BroadcastCh:  make(chan Message),
	}
}

func (h *Hub) RunLoop() {
	for {
		select {
		case client := <-h.RegisterCh:
			h.register(client)
		case client := <-h.UnRegisterCh:
			h.unregister(client)
		case msg := <-h.BroadcastCh: // BroadcastChに[]byteが送信されると発火する
			h.broadcastToAllClient(msg)
		}
	}
}

/* HubフィールドにあるClientsに追加する */
func (h *Hub) register(c *Client) {
	h.Clients[c] = true
}

/* HubフィールドにあるClientsから削除する */
func (h *Hub) unregister(c *Client) {
	if ok := h.Clients[c]; ok {
		delete(h.Clients, c)
	}
}

/* Clietnsフィールドで保持しているすべてのClitentの、SendChにmsgを送信する */
func (h *Hub) broadcastToAllClient(msg []byte) {
	for c := range h.Clients {
		c.sendCh <- msg
	}
}

// chanは、ゴルーチン間でデータをやり取りするためのGo言語の組み込み型
// <-は、チャネルの送受信の演算子
