"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import * as tf from '@tensorflow/tfjs';

import { startWebSocket, stopWebSocket, sendMessage, sendSmilePoint, sendIdea } from "./hooks/useWebSocket";
import { useSmileDetection } from "./hooks/useSmileDetection";
import { useUserAuthentication } from "./hooks/useUserAuthentication";

import { Webcam } from "./components/Webcam";
import { SmileStatus } from "./components/SmileStatus";
import { UserExpressions } from "./components/UserExpressions";
import OnOffButton from "./components/OnOffButton";
import ReconnectingWebSocket from "reconnecting-websocket";
import ConnectionStatusButton from "./components/ConnectionStatusButton";
import LoadingScreen from "./components/LoadingScreen";
import IdeasButton from "./components/IdeasButton";
import ResizeButton from "./components/ResizeButton";
import BorderEffect from "./components/BorderEffect";

const Chat: React.FC = () => {
    const router = useRouter();
    const socketRef = useRef<ReconnectingWebSocket | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [messages, setMessages] = useState<string[]>([]); // websocketでやりとりしているmessage
    const [clientsList, setClientsList] = useState<string[]>([]); // websocketに接続しているclientのリスト
    const [status, setStatus] = useState(2); // 0: 接続中, 1: 接続完了, 2: 接続終了, 3: 接続エラー
    const [clientId, setClientId] = useState<string>("");
    const [nickname , setNickname] = useState<string>("");
    const [smilePoint, setSmilePoint] = useState(0);
    const [totalSmilePoint, setTotalSmilePoint] = useState(0);
    const [totalIdeas, setTotalIdeas] = useState(0);
    const [isLoading, setIsLoading] = useState(true); // ローディング状態を管理
    const [currentImage, setCurrentImage] = useState<string>("/img/init.png");
    const [level, setLevel] = useState(1);
    const [isSmallScreen, setIsSmallScreen] = useState(false);

    const { smileProb, userExpressions, stream } = useSmileDetection(videoRef);

    // 認証通ってなかったらloginページにリダイレクト
    useUserAuthentication(router);

    // ClientIDを取得or生成してローカルストレージに保存
    useEffect(() => {
        let storedClientId = localStorage.getItem("clientId") ?? "";
        if (!storedClientId) {
            storedClientId = uuidv4();
            localStorage.setItem("clientId", storedClientId);
        }
        setClientId(storedClientId);
    }, []);

    // ローカルストレージからnicknameを取得
    useEffect(() => {
        let storedNickname = localStorage.getItem("nickname") ?? "";
        if (!storedNickname) {
            storedNickname = "名無しさん";
            localStorage.setItem("nickname", storedNickname);
        }
        setNickname(storedNickname);
    }, []);

    // TensorFlowのバックエンドを初期化
    useEffect(() => {
        const tfInit = async () => {
            await tf.setBackend("webgl");
            await tf.ready();
        }
        tfInit();
    }, []);

    // ページ読み込み完了時にローディングを停止
    useEffect(() => {
        if (document.readyState === "complete") {
            setIsLoading(false);
        } else {
            window.addEventListener("load", () => setIsLoading(false));
        }
        return () => {
            window.removeEventListener("load", () => setIsLoading(false));
        }
    }, []);

    // smilePointが変化したら発火
    useEffect(() => {
        if (smilePoint >= 10) {
            sendSmilePoint(socketRef, clientId, nickname, smilePoint, setSmilePoint, setStatus);
        }
    }, [smilePoint, clientId, nickname]); // useEffectフック内で使用している変数が外部の状態に依存しているため、clientIdも依存配列必要

    // smileProbが変化したら発火（処理をdetectSmileに書くと、非同期になり、smileProbが更新された後すぐにsmilePointをチェックしても、更新が反映されていない可能性があるため）
    useEffect(() => {
        if (smileProb > 0.5) {  
            setSmilePoint((prevPoint) => prevPoint + 1);
        }
    }, [smileProb]);

    // Idea数が変化したら発火
    useEffect(() => {
        if (totalIdeas) {
            console.log("Total ideas updated: ", totalIdeas);
        }
    }, [totalIdeas]);

    // 画像のURLが更新されたら発火
    useEffect(() => {
        if (currentImage) {
            console.log("Image updated: ", currentImage);
        }
    }, [currentImage]);

    // Levelが上がったら発火
    useEffect(() => {
        if (level) {
            console.log("Level up to : ", level);
        }
    }, [level]);

    // ウィンドウサイズの切り替え
    const toggleFullScreen = () => {
        setIsSmallScreen(!isSmallScreen);
    }

    // WebSocket接続と切断のハンドラー
    const handleWebSocket = () => {
        if (status === 1) {
            stopWebSocket(socketRef, setMessages, setClientsList, setStatus);
        } else {
            startWebSocket(socketRef, nickname, setMessages, setTotalSmilePoint, setTotalIdeas, setCurrentImage, setLevel, setClientsList, setStatus);
        }
    };

    return (
        <>
            {isLoading ? (
                <LoadingScreen />
            ) : (
                <>
                    {/* ウィンドウサイズ切り替えボタン */}
                    <ResizeButton
                        onClick={toggleFullScreen}
                        label={isSmallScreen ? "元のサイズに戻す" : "最小表示"}
                    />

                    {/* 最小表示モード */}
                    {isSmallScreen ? (
                        <div className="h-screen w-screen flex items-center justify-center overflow-hidden box-border">
                            {/* 外枠 */}
                            <BorderEffect smileProb={smileProb} />

                            <div className="grid grid-cols-3 grid-rows-1 gap-3 w-full h-full">
                                {/* 左側 */}
                                <div className="p-4 border rounded-lg space-y-4 h-full flex flex-col justify-center items-center">
                                    <ConnectionStatusButton status={status} />
                                    <OnOffButton onClick={handleWebSocket} isConnected={status === 1} />
                                    <IdeasButton onClick={() => sendIdea(socketRef, clientId, nickname, setStatus)} totalIdeas={totalIdeas} disabled={status !== 1} />
                                </div>

                                {/* 中央 (Webcam) */}
                                <div className="p-4 border rounded-lg flex justify-center items-center h-full">
                                    <Webcam videoRef={videoRef} stream={stream} />
                                </div>

                                {/* 右側 (currentImage) */}
                                <div className="p-4 border rounded-lg h-full">
                                    <img src={currentImage} alt="Smile Level Image" className="w-full h-full object-cover rounded-lg" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 grid-rows-2 gap-4 h-screen w-screen overflow-hidden flex box-boe">
                            {/* 外枠 */}
                            <BorderEffect smileProb={smileProb} />

                            {/* 左上 */}
                            <div className="p-4 border rounded-lg space-y-4">
                                <h1>SmileSync</h1>
                                <ConnectionStatusButton status={status}/>
                                <OnOffButton onClick={handleWebSocket} isConnected={status === 1} />
                                <div>
                                    <IdeasButton onClick={() => sendIdea(socketRef, clientId, nickname, setStatus)} totalIdeas={totalIdeas} disabled={status !== 1} />
                                </div>
                                <h2>Connected Clients:</h2>
                                {clientsList.map((client, index) => (
                                    <div key={index}>{client}</div>
                                ))}
                            </div>

                            {/* 右上 */}
                            <div className="p-4 border rounded-lg flex justify-center items-center">
                                <Webcam videoRef={videoRef} stream={stream} />
                            </div>

                            {/* 左下 */}
                            <div className="p-4 border rounded-lg">
                                <div>
                                    <SmileStatus smileProb={smileProb} />
                                    <UserExpressions userExpressions={userExpressions} />
                                </div>
                                <br />
                                <div className="rounded-lg border border-gray-400 p-2">
                                    <p>笑顔ポイント: {smilePoint}</p>
                                    <p>合計笑顔ポイント: {totalSmilePoint}</p>
                                    <p>合計アイデア数: {totalIdeas}</p>
                                    <p>現在のレベル: {level}</p>
                                </div>
                            </div>

                            {/* 右下 */}
                            <div className="p-4 border rounded-lg">
                                <img src={currentImage} alt="Smile Level Image" className="w-full h-full object-cover rounded-lg" />
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default Chat;