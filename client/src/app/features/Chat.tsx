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
    const { smileProb, userExpressions } = useSmileDetection(videoRef);

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
        if (smilePoint >= 30) {
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

    return (
        <>
            {isLoading ? ( <LoadingScreen /> ) : (
                <>
                    <h1>WebSocket Chat</h1>
                    <div>
                        <ConnectionStatusButton status={status}/>
                    </div>
                    <div>
                        <OnOffButton onClick={() => startWebSocket(socketRef, nickname, setMessages, setTotalSmilePoint, setTotalIdeas, setCurrentImage, setClientsList, setStatus)} disabled={status === 1}>Connect</OnOffButton>
                        <OnOffButton onClick={() => stopWebSocket(socketRef, setMessages, setClientsList, setStatus)} disabled={status !== 1}>Disconnect</OnOffButton>
                    </div>
                    <div>
                        <IdeasButton onClick={() => sendIdea(socketRef, clientId, nickname, setStatus)} totalIdeas={totalIdeas} disabled={status !== 1} />
                    </div>
                    <div>
                        <p>笑顔ポイント: {smilePoint}</p>
                    </div>
                    <div>
                        <p>合計笑顔ポイント：{totalSmilePoint}</p>
                    </div>
                    <div>
                        <p>合計アイデア数：{totalIdeas}</p>
                    </div>
                    <div>
                        <h2>Connected Clients:</h2>
                        {clientsList.map((client, index) => (
                            <div key={index}>{client}</div>
                        ))}
                    </div>
                    <Webcam videoRef={videoRef} />
                    <SmileStatus smileProb={smileProb} />
                    <UserExpressions userExpressions={userExpressions} />
                    <div>
                        <img src={currentImage} alt="Smile Level Image" />
                    </div>
                </>
            )}
        </>
    );
};

export default Chat;