"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import * as tf from "@tensorflow/tfjs";

import {
  startConnectWebSocket,
  sendMessage,
  sendSmilePoint,
  sendIdea,
  sendMeetingStatus,
  sendImageAnimalType,
} from "./hooks/useWebSocket";
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
import Heart from "./components/Heart";
import Food from "./components/Food";
import TimerDisplay from "./components/TimerDisplay";
import ConnectedClientsDisplay from "./components/ConnectedClientsDisplay";
import LevelUpCelebration from "./components/LevelUpCelebration";
import ImageCarousel from "./components/ImageCarousel";
import AnimalTypeChanger from "./components/AnimalTypeChanger";
import CurrentAnimalDisplay from "./components/CurrentAnimalDisplay";
import { createRoot } from "react-dom/client";

const Chat: React.FC = () => {
  const router = useRouter();
  const socketRef = useRef<ReconnectingWebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [messages, setMessages] = useState<string[]>([]); // websocketでやりとりしているmessage
  const [clientsList, setClientsList] = useState<string[]>([]); // websocketに接続しているclientのリスト
  const [status, setStatus] = useState(2); // 0: 接続待ち, 1: 接続完了, 2: 接続終了, 3: 接続エラー
  const [clientId, setClientId] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [smilePoint, setSmilePoint] = useState(0);
  const [totalSmilePoint, setTotalSmilePoint] = useState(0);
  const [totalIdeas, setTotalIdeas] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // ローディング状態を管理
  const [imageUrls, setImageUrls] = useState<string[]>(["/img/init.png"]);
  const [level, setLevel] = useState(1);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [hearts, setHearts] = useState<{ id: string }[]>([]);
  const [foods, setFoods] = useState<{ id: string; foodsIndex: number }[]>([]);
  const [isMeetingActive, setIsMeetingActive] = useState(false); // Serverサイドの会議開始/終了の制御
  const [timer, setTimer] = useState("00:00:00");
  const [lastCelebratedLevel, setLastCelebratedLevel] = useState(1); // 最後に祝ったレベル
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [imageAnimalType, setImageAnimalType] =
    useState<string>("golden retriever");

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
    };
    tfInit();
  }, []);

  // 初期化時にAudioオブジェクトを作成
  useEffect(() => {
    audioRef.current = new Audio();
  }, []);

  // ページ全体のクリックイベントで音声を初期化
  useEffect(() => {
    const handleUserInteraction = () => {
      initializeAudio();
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };

    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction);

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };
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
    };
  }, []);

  // nicknameがセットされたのち、webSocketにデフォルトで接続
  useEffect(() => {
    if (nickname) {
      startConnectWebSocket(
        socketRef,
        nickname,
        setTimer,
        setMessages,
        setTotalSmilePoint,
        setTotalIdeas,
        setImageUrls,
        setImageAnimalType,
        setLevel,
        setClientsList,
        setStatus
      );
    }
  }, [nickname]);

  // smilePointが変化したら発火
  useEffect(() => {
    if (smilePoint >= 10) {
      if (status === 1) {
        sendSmilePoint(
          socketRef,
          clientId,
          nickname,
          smilePoint,
          setSmilePoint,
          setStatus
        );
      } else {
        setSmilePoint(10); // 接続できていない場合は、smilePointを上限10に固定
      }
    }
  }, [smilePoint, clientId, nickname, status]); // useEffectフック内で使用している変数が外部の状態に依存しているため

  // smileProbが変化したら発火（処理をdetectSmileに書くと、非同期になり、smileProbが更新された後すぐにsmilePointをチェックしても、更新が反映されていない可能性があるため）
  useEffect(() => {
    if (smileProb > 0.5) {
      setSmilePoint((prevPoint) => prevPoint + 1);
    }
  }, [smileProb]);

  // totalSmilePointが変化したら発火してハート生成
  useEffect(() => {
    const handleAddHeart = () => {
      const newHeart = { id: uuidv4() };
      setHearts((prevHearts) => [...prevHearts, newHeart]);
    };
    if (totalSmilePoint > 0) {
      handleAddHeart();
    }
  }, [totalSmilePoint]);

  // Idea数が変化したら発火してエサ生成
  useEffect(() => {
    if (totalIdeas) {
      console.log("Total ideas updated: ", totalIdeas);
    }
    if (totalIdeas > 0) {
      const index = Math.floor(Math.random() * 9); // 9種のエサからランダムに選択
      const handleAddFoodSequentially = () => {
        for (let i = 0; i < 30; i++) {
          setTimeout(() => {
            const newFood = { id: uuidv4(), foodsIndex: index };
            setFoods((prevFoods) => [...prevFoods, newFood]);
            setTimeout(() => {
              setFoods((prevFoods) =>
                prevFoods.filter((food) => food.id !== newFood.id)
              );
            }, 5000);
          }, i * 100);
        }
      };
      handleAddFoodSequentially();
    }
  }, [totalIdeas]);

  // 画像のURLが更新されたら発火
  useEffect(() => {
    if (imageUrls) {
      console.log("Image urls updated: ", imageUrls);
      if (level > lastCelebratedLevel) {
        setLastCelebratedLevel(level);
        handleCelebrate(); // 画像が届き次第、お祝い処理を実行
      }
    }
  }, [imageUrls]);

  // Levelが上がったら発火
  useEffect(() => {
    console.log("Level up to : ", level);
  }, [level]);

  // ウィンドウサイズの切り替え
  const toggleFullScreen = () => {
    setIsSmallScreen(!isSmallScreen);
  };

  // ハートを削除
  const removeHeart = (id: string) => {
    setHearts((prevHearts) => prevHearts.filter((heart) => heart.id !== id));
  };

  // エサを削除
  const removeFood = (id: string) => {
    setFoods((prevFoods) => prevFoods.filter((food) => food.id !== id));
  };

  // Serverサイドの会議開始/終了の制御
  const handleMeetingStatus = (changeTo: boolean) => {
    if (socketRef.current) {
      sendMeetingStatus(socketRef, clientId, nickname, changeTo, setStatus);
      setIsMeetingActive(changeTo);
    }
  };

  // ON/OFFボタンの処理
  const handleOnOffButtonClick = () => {
    if (status === 1) {
      handleMeetingStatus(false);
    } else {
      handleMeetingStatus(true);
    }
  };

  // Audioオブジェクトの初期化
  const initializeAudio = () => {
    if (audioRef.current && !isAudioInitialized) {
      audioRef.current.src = "/sound/levelup.mp3"; // 音声ファイルのパスを設定
      audioRef.current
        .play()
        .then(() => {
          if (audioRef.current) {
            audioRef.current.pause(); // 再生が成功した場合に一時停止
            audioRef.current.currentTime = 0; // 再生位置をリセット
          }
          setIsAudioInitialized(true); // 初期化済みとしてフラグを立てる
        })
        .catch((error) => {
          console.error("Audio initialization failed:", error);
        });
    }
  };

  // LevelUpCelebrationの処理
  const handleCelebrate = () => {
    /* レベルアップ音声を再生 */
    if (audioRef.current && isAudioInitialized) {
      audioRef.current.play().catch((error) => {
        console.error("Failed to play level up sound:", error);
      });
    }

    /* LevelUpのお祝い画面を表示 */
    const celebrationRoot = document.createElement("div");
    document.body.appendChild(celebrationRoot);
    const root = createRoot(celebrationRoot);

    root.render(
      <LevelUpCelebration newImage={imageUrls[imageUrls.length - 1]} />
    );

    setTimeout(() => {
      root.unmount(); // コンポーネントをアンマウント
      document.body.removeChild(celebrationRoot); // DOM要素を削除
    }, 4000);
  };

  return (
    <>
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <>
          {/* 管理用UI */}
          <div className="flex flex-row items-center gap-14 fixed bottom-4 right-4 z-50">
            {/* 動物画像の変更フォーム（Adminのみ表示） */}
            {nickname === process.env.NEXT_PUBLIC_ADMIN_NICKNAME && (
              <AnimalTypeChanger
                onChange={(newAnimalType: string) =>
                  sendImageAnimalType(
                    socketRef,
                    clientId,
                    nickname,
                    newAnimalType,
                    setStatus
                  )
                }
                status={status}
              />
            )}
            {/* 現在の動物表示 */}
            <CurrentAnimalDisplay animalType={imageAnimalType} />
            {/* 最小表示切り替えボタン */}
            <ResizeButton
              onClick={toggleFullScreen}
              label={isSmallScreen ? "元に戻す" : "最小表示"}
            />
          </div>

          {/* ハート */}
          {hearts.map((heart) => (
            <Heart key={heart.id} id={heart.id} removeHeart={removeHeart} />
          ))}

          {/* 餌 */}
          {foods.map((food) => (
            <Food
              key={food.id}
              id={food.id}
              foodsIndex={food.foodsIndex}
              removeFood={removeFood}
            />
          ))}

          {/* 最小表示モード */}
          {isSmallScreen ? (
            <div className="h-screen w-screen flex items-center justify-center overflow-hidden box-border">
              {/* 外枠 */}
              <BorderEffect smileProb={smileProb} />

              <div className="grid grid-cols-3 grid-rows-1 gap-3 w-full h-full">
                {/* 左側 */}
                <div className="p-4 border rounded-lg space-y-4 h-full flex flex-col justify-center items-center">
                  <ConnectionStatusButton status={status} />
                  {nickname === process.env.NEXT_PUBLIC_ADMIN_NICKNAME && (
                    <OnOffButton
                      onClick={handleOnOffButtonClick}
                      currentStatus={status}
                    />
                  )}
                  <TimerDisplay timer={timer} />
                  <IdeasButton
                    onClick={() =>
                      sendIdea(socketRef, clientId, nickname, setStatus)
                    }
                    totalIdeas={totalIdeas}
                    disabled={status !== 1}
                  />
                </div>

                {/* 中央 */}
                <div className="p-4 border rounded-lg flex justify-center items-center h-full">
                  <Webcam videoRef={videoRef} stream={stream} />
                </div>

                {/* 右側 */}
                <div className="p-4 border rounded-lg h-full">
                  <ImageCarousel imageUrls={imageUrls} />
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
                <h2>※デモ用にペットの成長を本来より速く設定しています。</h2>
                <div className="flex items-center gap-2">
                  <ConnectionStatusButton status={status} />
                  <TimerDisplay timer={timer} />
                  {nickname === process.env.NEXT_PUBLIC_ADMIN_NICKNAME && (
                    <OnOffButton
                      onClick={handleOnOffButtonClick}
                      currentStatus={status}
                    />
                  )}
                </div>
                <ConnectedClientsDisplay clientsList={clientsList} />
              </div>

              {/* 右上 */}
              <div className="p-4 border rounded-lg flex justify-center items-center">
                <Webcam videoRef={videoRef} stream={stream} />
              </div>

              {/* 左下 */}
              <div className="p-4 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <SmileStatus smileProb={smileProb} />
                    <IdeasButton
                      onClick={() =>
                        sendIdea(socketRef, clientId, nickname, setStatus)
                      }
                      totalIdeas={totalIdeas}
                      disabled={status !== 1}
                    />
                  </div>
                  <UserExpressions userExpressions={userExpressions} />
                </div>
                <br />
                {nickname === process.env.NEXT_PUBLIC_ADMIN_NICKNAME && (
                  <div className="rounded-lg border border-gray-400 p-2">
                    <p>笑顔ポイント: {smilePoint}</p>
                    <p>合計笑顔ポイント: {totalSmilePoint}</p>
                    <p>合計アイデア数: {totalIdeas}</p>
                    <p>現在のレベル: {level}</p>
                  </div>
                )}
              </div>

              {/* 右下 */}
              <div className="p-4 border rounded-lg">
                <ImageCarousel imageUrls={imageUrls} />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default Chat;
