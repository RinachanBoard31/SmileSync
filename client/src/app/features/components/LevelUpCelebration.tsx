import React, { useEffect, useState } from "react";

// レベルアップ時の絵文字リスト
const celebrationEmojis = [
  "🎉",
  "✨",
  "🎊",
  "🔥",
  "🌟",
  "💥",
  "🎵",
  "🎈",
  "💫",
  "⭐",
];

interface LevelUpCelebrationProps {
  onEnd: () => void; // アニメーション終了時のコールバック
}

const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({ onEnd }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // アニメーションを3秒後に終了
    const timer = setTimeout(() => {
      setShow(false);
      onEnd();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onEnd]);

  if (!show) return null;

  return (
    <div className="level-up-background">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-white drop-shadow-lg mb-4 animate-pulse">
          Level up!
        </h1>
        <div className="text-4xl flex justify-center gap-4 animate-bounce">
          {celebrationEmojis.map((emoji, index) => (
            <span
              key={index}
              className="level-up-emoji" // なんか虹色で戻らない
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LevelUpCelebration; // 修正
