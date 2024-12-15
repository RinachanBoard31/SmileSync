import React, { useEffect, useState } from "react";

const celebrationEmojis = [
  "🎉",
  "✨",
  "🎊",
  "🔥",
  "🌟",
  "💥",
  "💪",
  "🎈",
  "💫",
  "⭐",
];

interface LevelUpCelebrationProps {
  newImage: string; // レベルアップで表示する新しい画像
  onEnd: () => void; // アニメーション終了時のコールバック
}

const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({
  newImage,
  onEnd,
}) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onEnd();
    }, 5000); // 5秒で終了

    return () => clearTimeout(timer);
  }, [onEnd]);

  if (!show) return null;

  console.log("LevelUpCelebration rendered"); // なぜか無限に呼ばれる

  return (
    <div className="level-up-overlay pointer-events-auto">
      {" "}
      {/* クリックを透過 */}
      <div className="level-up-content">
        {/* Level Up! の文字 */}
        <h1 className="text-6xl font-bold animate-pulse mb-8 text-center text-white">
          Level Up!
        </h1>

        {/* 新しい画像を中央に大きく表示 */}
        <div className="relative w-4/5 max-w-screen-md mx-auto">
          <img
            src={newImage}
            alt="New Level Image"
            className="w-full h-auto object-cover rounded-lg shadow-lg animate-popIn"
          />
        </div>

        {/* キラキラエフェクト */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, index) => (
            <span
              key={index}
              className="absolute text-6xl animate-slowEmojiFloat"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              {celebrationEmojis[index % celebrationEmojis.length]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LevelUpCelebration;
