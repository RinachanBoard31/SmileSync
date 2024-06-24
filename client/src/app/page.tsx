"use client";

import React, { useEffect, useState, useRef } from "react";
import ReconnectingWebsocket from "reconnecting-websocket";

const App = () => {
    const [messages, setMessages] = useState<string[]>([]); // 末尾が型らしい
    const [status, setStatus] = useState(0); // 0: 接続中, 1: 接続完了, 2: 接続終了, 3: 接続エラー
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
            setStatus(1);
        }
        websocket.onclose = () => {
            setStatus(2);
        }
        websocket.onerror = (error) => {
            setStatus(3);
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
            setStatus(3);
        }
    };

    const renderButton = () => {
        switch (status) {
            case 0:
                return (
                    <button disabled type="button" className="py-2.5 px-5 me-2 text-sm font-medium text-gray-900 rounded-full bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 inline-flex items-center">
                        <svg aria-hidden="true" role="status" className="inline w-4 h-4 me-3 text-gray-200 animate-spin dark:text-gray-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="#1C64F2"/>
                        </svg>
                        Connecting...
                    </button>
                );
            case 1:
                return (
                    <button type="button" className="text-green-700 rounded-full hover:text-white border border-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-green-500 dark:text-green-500 dark:hover:text-white dark:hover:bg-green-600 dark:focus:ring-green-800">
                        Connected
                    </button>
                );
            case 2:
                return(
                    <button type="button" className="text-gray-900 rounded-full hover:text-white border border-gray-800 hover:bg-gray-900 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-gray-600 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-800">
                        Disconnected
                    </button>
                );
            case 3:
                return (
                    <button type="button" className="text-red-700 rounded-full hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900">
                        Error
                    </button>
                );
        }
    }

    return (
        <>
            <h1>WebSocket Chat</h1>
            <div>
                {renderButton()}
            </div>
            <div className="max-w-sm">
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
                        className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 min-w-max"
                        disabled={!inputText.trim()}> {/* <- 標準のrequiredはボタン押したときにvalidateされるわけではないので、送信前にinputTextが空文字でないかチェックする */}
                        <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
                            送信
                        </span>
                    </button>
                </div>
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
