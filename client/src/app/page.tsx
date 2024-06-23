"use client";

import React, { useEffect, useState, useRef } from "react";
import ReconnectingWebsocket from "reconnecting-websocket";

const App = () => {
    const [messages, setMessages] = useState<string[]>([]); // 末尾が型らしい
    const [status, setStatus] = useState<string>("");
    const [inputText, setInputText] = useState<string>("");
    const socketRef = useRef<ReconnectingWebsocket>();
    
    // websocket関連の処理は副作用のため、useEffectで実装
    useEffect(() => {
        // 1. websocketオブジェクトを生成し、サーバとの接続を開始
        const websocket = new ReconnectingWebsocket("ws://localhost:8081/ws");
        socketRef.current = websocket;
        // 2. メッセージ受信時のイベントハンドラを設定
        const onMessage = (event: MessageEvent<string>) => {
            setMessages((prevMessages) => [...prevMessages, event.data]);
        }
        websocket.onopen = () => {
            setStatus("接続完了");
        }
        websocket.onerror = (error) => {
            setStatus("接続エラー：" + error.toString());
            console.error("WebSocket error observed:", error);
        }
        websocket.addEventListener("message", onMessage);
        // 3. useEffectのクリーンアップの中で、websocketのクローズ処理を実行
        return () => {
            websocket.close();
            websocket.removeEventListener
        }
    }, []);

    const sendMessage = () => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(inputText);
            setInputText(""); // メッセージ送信後に入力欄をクリア
        } else {
            setStatus("接続エラー：WebSocketは開いていません");
        }
    };

    return (
        <>
            <h1>WebSocket Chat</h1>
            <div className="max-w-sm">
                <label htmlFor="messageBox" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Message</label>
                <div className="flex items-center space-x-2">
                    <input
                        type="text" 
                        id="message" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Message Here" 
                        required
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 mr-2" 
                    />
                    <button 
                        type="button" 
                        onClick={sendMessage} 
                        className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 min-w-max">
                        <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
                            送信
                        </span>
                    </button>
                </div>
            </div>
            <div>
                Status: {status}
            </div>
            <div>
                {messages.map((message, index) => (
                    <div key={index}>{message}</div>
                ))}
            </div>
        </>
    )
}

export default App;
