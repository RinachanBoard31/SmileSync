import { Dispatch, SetStateAction } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";

export const startConnectWebSocket = (
  socketRef: React.MutableRefObject<ReconnectingWebSocket | null>,
  nickname: string,
  setTimer: Dispatch<SetStateAction<string>>,
  setMessages: Dispatch<SetStateAction<string[]>>,
  setTotalSmilePoint: Dispatch<SetStateAction<number>>,
  setTotalIdeas: Dispatch<SetStateAction<number>>,
  setCurrentImage: Dispatch<SetStateAction<string>>,
  setLevel: Dispatch<SetStateAction<number>>,
  setClientsList: Dispatch<SetStateAction<string[]>>,
  setStatus: Dispatch<SetStateAction<number>>, // 0: 接続待ち, 1: 接続完了, 2: 接続終了, 3: 接続エラー
) => {
  // 0. すでに接続されている場合は何もしない
  if (socketRef.current) {
    return;
  }
  // 1. websocketオブジェクトを生成し、サーバとの接続を開始
  const websocket = new ReconnectingWebSocket(
    `${process.env.NEXT_PUBLIC_SERVER_WEBSOCKET}/ws`,
  );
  socketRef.current = websocket;
  // 2. websocketに自分のnicknameを教える
  websocket.onopen = () => {
    setStatus(0);
    const initMessage = JSON.stringify({
      type: "init",
      nickname: nickname,
    });
    websocket.send(initMessage);
  };
  websocket.onclose = () => {
    setStatus(2);
  };
  websocket.onerror = (error) => {
    setStatus(3);
    console.error("WebSocket error observed:", error);
  };
  // 3. サーバからのメッセージを受信した際の処理
  websocket.addEventListener("message", (event: MessageEvent<string>) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        setMessages((prevMessages) => [
          ...prevMessages,
          `${data.timestamp} - ${data.nickname}: ${data.text}`,
        ]);
      } else if (data.type === "smilePoint") {
        setTotalSmilePoint(data.totalSmilePoint);
      } else if (data.type === "clientsList") {
        setClientsList(data.clientsList);
      } else if (data.type === "idea") {
        setTotalIdeas(data.totalIdeas);
      } else if (data.type === "imageUrl") {
        setCurrentImage(data.imageUrl);
      } else if (data.type === "level") {
        setLevel(data.level);
      } else if (data.type === "timer") {
        setTimer(data.timer);
      } else if (data.type == "meetingStatus") {
        if (data.isMeetingActive === true) {
          console.log("Meeting is now active");
          setStatus(1);
        } else {
          console.log("Meeting is now inactive");
          setStatus(0);
        }
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });
};

export const stopConnectWebSocket = (
  socketRef: React.MutableRefObject<ReconnectingWebSocket | null>,
  setMessages: Dispatch<SetStateAction<string[]>>,
  setClientsList: Dispatch<SetStateAction<string[]>>,
  setStatus: Dispatch<SetStateAction<number>>,
) => {
  if (socketRef.current) {
    socketRef.current.close();
    socketRef.current = null;
    setMessages([]); // メッセージ一覧をクリア
    setClientsList([]); // クライアント一覧をクリア
    setStatus(2);
  }
};

export const sendMessage = (
  socketRef: React.MutableRefObject<ReconnectingWebSocket | null>,
  clientId: string,
  nickname: string,
  text: string,
  setStatus: Dispatch<SetStateAction<number>>,
) => {
  if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
    const json = JSON.stringify({
      type: "message",
      client_id: clientId,
      nickname: nickname,
      text: text,
    });
    socketRef.current.send(json);
    console.log("Message sent!");
  } else {
    setStatus(3);
  }
};

export const sendSmilePoint = (
  socketRef: React.MutableRefObject<ReconnectingWebSocket | null>,
  clientId: string,
  nickname: string,
  smilePoint: number,
  setSmilePoint: Dispatch<SetStateAction<number>>,
  setStatus: Dispatch<SetStateAction<number>>,
) => {
  if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
    const json = JSON.stringify({
      type: "smilePoint",
      client_id: clientId,
      nickname: nickname,
      point: smilePoint,
    });
    socketRef.current.send(json);
    console.log("Smile point sent!");
    setSmilePoint(0);
  } else {
    setStatus(3);
  }
};

export const sendIdea = (
  socketRef: React.MutableRefObject<ReconnectingWebSocket | null>,
  clientId: string,
  nickname: string,
  setStatus: Dispatch<SetStateAction<number>>,
) => {
  if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
    const json = JSON.stringify({
      type: "idea",
      client_id: clientId,
      nickname: nickname,
    });
    socketRef.current.send(json);
    console.log("Idea sent!");
  } else {
    setStatus(3);
  }
};

export const sendMeetingStatus = (
  socketRef: React.MutableRefObject<ReconnectingWebSocket | null>,
  clientId: string,
  nickname: string,
  changeTo: boolean,
  setStatus: Dispatch<SetStateAction<number>>,
) => {
  if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
    const json = JSON.stringify({
      type: "meetingStatus",
      client_id: clientId,
      nickname: nickname,
      isMeetingActive: changeTo,
    });
    socketRef.current.send(json);
    console.log("Meeting status sent!");
  } else {
    setStatus(3);
  }
};
