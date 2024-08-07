"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import * as tf from '@tensorflow/tfjs';

import { startWebSocket, stopWebSocket, sendMessage, sendSmilePoint } from "./hooks/useWebSocket";
import { useSmileDetection } from "./hooks/useSmileDetection";
import { userUserAuthentication } from "./hooks/useUserAuthentication";

import { Webcam } from "./components/Webcam";
import { SmileStatus } from "./components/SmileStatus";
import { UserExpressions } from "./components/UserExpressions";
import OnOffButton from "./components/OnOffButton";
import ReconnectingWebSocket from "reconnecting-websocket";
import MessageInput from "./components/MessageInput";
import ConnectionStatusButton from "./components/ConnectionStatusButton";

const Chat: React.FC = () => {
    const router = useRouter();
    const socketRef = useRef<ReconnectingWebSocket | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [messages, setMessages] = useState<string[]>([]); // websocketでやりとりしているmessage
    const [status, setStatus] = useState(2); // 0: 接続中, 1: 接続完了, 2: 接続終了, 3: 接続エラー
    const [clientId, setClientId] = useState<string>("");
    const [smilePoint, setSmilePoint] = useState(0);
    const { smileProb, userExpressions, } = useSmileDetection(videoRef);

    // 認証通ってなかったらloginページにリダイレクト
    userUserAuthentication(router);

    // ClientIDを取得or生成してローカルストレージに保存
    useEffect(() => {
        let storedClientId = localStorage.getItem("clientId") ?? "";
        if (!storedClientId) {
            storedClientId = uuidv4();
            localStorage.setItem("clientId", storedClientId);
        }
        setClientId(storedClientId);
    }, []);

    // TensorFlowのバックエンドを初期化
    useEffect(() => {
        const tfInit = async () => {
            await tf.setBackend("webgl");
            await tf.ready();
        }
        tfInit();
    }, []);

    // smilePointが変化したら発火
    useEffect(() => {
        if (smilePoint >= 30) {
            sendSmilePoint(socketRef, clientId, setSmilePoint, setStatus);
        }
    }, [smilePoint]);

    // smileProbが変化したら発火（処理をdetectSmileに書くと、非同期になり、smileProbが更新された後すぐにsmilePointをチェックしても、更新が反映されていない可能性があるため）
    useEffect(() => {
        if (smileProb > 0.5) {  
            setSmilePoint((prevPoint) => prevPoint + 1);
        }
    }, [smileProb]);

    return (
        <>
            <h1>WebSocket Chat</h1>
            <div>
                <ConnectionStatusButton status={status}/>
            </div>
            <div>
                <OnOffButton onClick={() => startWebSocket(socketRef, setMessages, setStatus)} disabled={status === 1}>Connect</OnOffButton>
                <OnOffButton onClick={() => stopWebSocket(socketRef, setMessages, setStatus)} disabled={status !== 1}>Disconnect</OnOffButton>
            </div>
            <MessageInput onSendMessage={(message) => sendMessage(socketRef, clientId, message, setStatus)} />
            <div>
                <p>笑顔ポイント: {smilePoint}</p>
            </div>
            <SmileStatus smileProb={smileProb} />
            <UserExpressions userExpressions={userExpressions} />
            <Webcam videoRef={videoRef} />
            <div>
                {messages.map((message, index) => (
                    <div key={index}>{message}</div>
                ))}
            </div>
        </>
    );
};

export default Chat;

// "use client";

// import React, { useEffect, useState, useRef } from "react";
// import { useRouter } from "next/navigation";    
// import ReconnectingWebsocket from "reconnecting-websocket";
// import { v4 as uuidv4 } from "uuid";
// import * as faceapi from "face-api.js";
// import * as tf from '@tensorflow/tfjs';

// const Chat: React.FC = () => {
//     const [messages, setMessages] = useState<string[]>([]); // 末尾が型らしい
//     const [status, setStatus] = useState(2); // 0: 接続中, 1: 接続完了, 2: 接続終了, 3: 接続エラー
//     const [inputText, setInputText] = useState<string>("");
//     const socketRef = useRef<ReconnectingWebsocket | null>(null);
//     const [clientId, setClientId] = useState<string>("");
//     const videoRef = useRef<HTMLVideoElement | null>(null);
//     const [userExpressions, setUserExpressions] = useState<object | null>(null);
//     const [smileProb, setSmileProb] = useState(0);
//     const [smilePoint, setSmilePoint] = useState(0); // 笑顔ポイント、10ポイント(1秒)貯まると送信(暫定)
//     const router = useRouter();

//     チャットページにアクセスする前に、認証トークンがなかったらloginページにリダイレクトする
//     useEffect(() => {
//         const token = sessionStorage.getItem("login_password");
//         if (!token) {
//             router.push("/login");
//         }
//     }, [router]); 

//     ClientIDを取得or生成してローカルストレージに保存
//     useEffect(() => {
//         let storedClientId = localStorage.getItem("clientId") ?? ""; // getItem()がnullを返したら""をセットする
//         if (!storedClientId) {
//             storedClientId = uuidv4();
//             localStorage.setItem("clientId", storedClientId);
//         }
//         setClientId(storedClientId);
//     }, []);

//     カメラ映像の取得と笑顔検出
//     useEffect(() => {
//         TensorFlowのバックエンドを初期化
//         const initTensorFlowBackend = async () => {
//             await tf.setBackend("webgl");
//             await tf.ready();
//         };

//         faceapiのモデルダウンロード
//         const loadModels = async () => {
//             const MODEL_URL = "/models";
//             await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
//             await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
//         };

//         ユーザのカメラ映像を取得
//         const getMedia = async () => {
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: true });
//                 if (videoRef.current) {
//                     videoRef.current.srcObject = stream;
//                 }
//             } catch (err) {
//                 console.error("Error accessing camera:", err);
//             }
//         };

//         初期化処理
//         const initialize = async () => {
//             await initTensorFlowBackend();
//             await loadModels();
//             await getMedia();
//         }

//         initialize();

//         笑顔の検出
//         const detectSmile = async () => {
//             if (videoRef.current) {
//                 const options = new faceapi.TinyFaceDetectorOptions();
//                 const result = await faceapi.detectSingleFace(videoRef.current, options).withFaceExpressions();
//                 if (result && result.expressions) {
//                     setUserExpressions(result.expressions);
//                     setSmileProb(result.expressions.happy);
//                 } else {
//                     setSmileProb(0);
//                 }
//             }
//         };

//         1秒ごとに笑顔検出を実行
//         const intervalId = setInterval(detectSmile, 100);
//         return () => clearInterval(intervalId);
//     }, []);

//     smileProbが変化したら発火（処理をdetectSmileに書くと、非同期になり、smileProbが更新された後すぐにsmilePointをチェックしても、更新が反映されていない可能性があるため）
//     useEffect(() => {
//         if (smileProb > 0.5) {  
//             setSmilePoint((prevPoint) => prevPoint + 1);
//         }
//     }, [smileProb]);

//     smilePointが変化したら発火
//     useEffect(() => {
//         if (smilePoint >= 30) {
//             sendSmilePoint();
//         }
//     }, [smilePoint]);
    
//     const startWebSocket = () => {
//         0. すでに接続されている場合は何もしない
//         if (socketRef.current) {
//             return;
//         }
//         1. websocketオブジェクトを生成し、サーバとの接続を開始
//         const websocket = new ReconnectingWebsocket(`ws://${process.env.NEXT_PUBLIC_CLIENT_IP}:${process.env.NEXT_PUBLIC_PORT}/ws`);
//         socketRef.current = websocket;
//         2. メッセージ受信時のイベントハンドラを設定
//         websocket.onopen = () => {
//             setStatus(1);
//         }
//         websocket.onclose = () => {
//             setStatus(2);
//         }
//         websocket.onerror = (error) => {
//             setStatus(3);
//             console.error("WebSocket error observed:", error);
//         }
//         websocket.addEventListener("message", (event: MessageEvent<string>) => {
//             setMessages((prevMessages) => [...prevMessages, event.data]);
//         });
//     };

//     const stopWebSocket = () => {
//         if (socketRef.current) {
//             socketRef.current.close();
//             socketRef.current = null;
//             setMessages([]);
//             setStatus(2);
//         }
//     };

//     const sendMessage = () => {
//         if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
//             const message = JSON.stringify({ clientId: clientId, text: inputText });
//             socketRef.current.send(message);
//             setInputText(""); // メッセージ送信後に入力欄をクリア
//         } else {
//             setStatus(3);
//         }
//     };

//     const sendSmilePoint = () => {
//         if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
//             const message = JSON.stringify({ clientId: clientId, text: "笑顔ポイントが30ポイント貯まりました！" });
//             socketRef.current.send(message);
//             console.log("Smile point sent!");
//             setSmilePoint(0);
//         } else {
//             setStatus(3);
//         }
//     };

//     const renderButton = () => {
//         switch (status) {
//             case 0:
//                 return (
//                     <button disabled type="button" className="py-2.5 px-5 me-2 text-sm font-medium text-gray-900 rounded-full bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 inline-flex items-center">
//                         <svg aria-hidden="true" role="status" className="inline w-4 h-4 me-3 text-gray-200 animate-spin dark:text-gray-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
//                             <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
//                             <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="#1C64F2"/>
//                         </svg>
//                         Connecting...
//                     </button>
//                 );
//             case 1:
//                 return (
//                     <button type="button" className="text-green-700 rounded-full hover:text-white border border-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-green-500 dark:text-green-500 dark:hover:text-white dark:hover:bg-green-600 dark:focus:ring-green-800">
//                         Connected
//                     </button>
//                 );
//             case 2:
//                 return(
//                     <button type="button" className="text-gray-900 rounded-full hover:text-white border border-gray-800 hover:bg-gray-900 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-gray-600 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-800">
//                         Disconnected
//                     </button>
//                 );
//             case 3:
//                 return (
//                     <button type="button" className="text-red-700 rounded-full hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900">
//                         Error
//                     </button>
//                 );
//         }
//     }

//     return (
//         <>
//             <h1>WebSocket Chat</h1>
//             <div>
//                 {renderButton()}
//             </div>
            // <div>
            //     <button onClick={startWebSocket} className="py-2.5 px-5 me-2 text-sm font-medium text-gray-900 rounded-full bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 inline-flex items-center">
            //         Connect
            //     </button>
            //     <button onClick={stopWebSocket} className="py-2.5 px-5 text-sm font-medium text-gray-900 rounded-full bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 inline-flex items-center">
            //         Disconnect
            //     </button>
            // </div>
            // <div className="max-w-sm">
            //     <div className="flex items-center space-x-2">
            //         <input
            //             type="text" 
            //             id="message" 
            //             value={inputText}
            //             onChange={(e) => setInputText(e.target.value)}
            //             placeholder="Message Here" 
            //             required
            //             className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 mr-2" 
            //         />
            //         <button 
            //             type="button" 
            //             onClick={sendMessage} 
            //             className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 min-w-max"
            //             disabled={!inputText.trim()}> {/* <- 標準のrequiredはボタン押したときにvalidateされるわけではないので、送信前にinputTextが空文字でないかチェックする */}
            //             <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
            //                 送信
            //             </span>
            //         </button>
            //     </div>
            // </div>
//             <div>
//                 <p>笑顔ポイント: {smilePoint}</p>
//             </div>
//             <div className = "text-9xl">
//                 {smileProb > 0.5 ? "😊" : "😐"}
//             </div>
//             <div>
//                 {userExpressions && (
//                     <pre>
//                         {Object.entries(userExpressions).map(([key, value]) => (
//                             <span key={key} style={{ color: value > 0.5 ? 'cyan' : ' inherit'}}>
//                                 {key}: {value.toFixed(4)}{"\n"}
//                             </span>
//                         ))}
//                     </pre>
//                 )}
//             </div>
//             <div>
//                 <video ref={videoRef} autoPlay muted className="w-full h-auto rounded-lg border border-gray-300 dark:border-gray-700"></video>
//             </div>
//             <div>
//                 {messages.map((message, index) => (
//                     <div key={index}>{message}</div>
//                 ))}
//             </div>
//         </>
//     )
// }

// export default Chat;
