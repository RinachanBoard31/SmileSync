import { Dispatch, SetStateAction } from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';

export const startWebSocket = (
    socketRef: React.MutableRefObject<ReconnectingWebSocket | null>,
    setMessages: Dispatch<SetStateAction<string[]>>,
    setStatus: Dispatch<SetStateAction<number>>,  // 0: 接続中, 1: 接続完了, 2: 接続終了, 3: 接続エラー
) => {
    // 0. すでに接続されている場合は何もしない
    if (socketRef.current) {
        return;
    }
    // 1. websocketオブジェクトを生成し、サーバとの接続を開始
    const websocket = new ReconnectingWebSocket(`ws://${process.env.NEXT_PUBLIC_CLIENT_IP}:${process.env.NEXT_PUBLIC_PORT}/ws`);
    socketRef.current = websocket;
    // 2. メッセージ受信時のイベントハンドラを設定
    websocket.onopen = () => {
        setStatus(1);
    }
    websocket.onclose = () => {
        setStatus(2);
    }
    websocket.onerror = (error) => {
        setStatus(3);
        console.error("WebSocket error observed:", error);
    }
    websocket.addEventListener("message", (event: MessageEvent<string>) => {
        setMessages((prevMessages) => [...prevMessages, event.data]);
    });
};

export const stopWebSocket = (
    socketRef: React.MutableRefObject<ReconnectingWebSocket | null>,
    setMessages: Dispatch<SetStateAction<string[]>>,
    setStatus: Dispatch<SetStateAction<number>>,
) => {
    if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setMessages([]); // メッセージ一覧をクリア
        setStatus(2);
    }
};

export const sendMessage = (
    socketRef: React.MutableRefObject<ReconnectingWebSocket | null>,
    clientId: string,
    text: string,
    setStatus: Dispatch<SetStateAction<number>>,
) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ clientId, text }));
    } else {
        setStatus(3);
    }
};

export const sendSmilePoint = (
    socketRef: React.MutableRefObject<ReconnectingWebSocket | null>,
    clientId: string,
    setSmilePoint: Dispatch<SetStateAction<number>>,
    setStatus: Dispatch<SetStateAction<number>>,
) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({ clientId: clientId, text: "笑顔ポイントが30ポイント貯まりました！" });
        socketRef.current.send(message);
        console.log("Smile point sent!");
        setSmilePoint(0);
    } else {
        setStatus(3);
    }
};