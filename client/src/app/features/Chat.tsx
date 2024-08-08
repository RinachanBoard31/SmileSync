"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import * as tf from '@tensorflow/tfjs';

import { startWebSocket, stopWebSocket, sendMessage, sendSmilePoint } from "./hooks/useWebSocket";
import { useSmileDetection } from "./hooks/useSmileDetection";
import { useUserAuthentication } from "./hooks/useUserAuthentication";

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
    const [nickname , setNickname] = useState<string>("");
    const [smilePoint, setSmilePoint] = useState(0);
    const [totalSmilePoint, setTotalSmilePoint] = useState(0);
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

    return (
        <>
            <h1>WebSocket Chat</h1>
            <div>
                <ConnectionStatusButton status={status}/>
            </div>
            <div>
                <OnOffButton onClick={() => startWebSocket(socketRef, setMessages, setTotalSmilePoint, setStatus)} disabled={status === 1}>Connect</OnOffButton>
                <OnOffButton onClick={() => stopWebSocket(socketRef, setMessages, setStatus)} disabled={status !== 1}>Disconnect</OnOffButton>
            </div>
            <MessageInput onSendMessage={(message) => sendMessage(socketRef, clientId, nickname, message, setStatus)} />
            <div>
                <p>笑顔ポイント: {smilePoint}</p>
            </div>
            <div>
                <p>合計笑顔ポイント：{totalSmilePoint}</p>
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