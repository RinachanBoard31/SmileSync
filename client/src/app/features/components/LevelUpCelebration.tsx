import React, { useEffect, useState } from "react";

const celebrationEmojis = [
  "🎉",
  "✨",
  "🎊",
  "🔥",
  "🌟",
  "💥",
  "🎈",
  "💫",
  "⭐",
  "💪",
];

interface Emoji {
  id: string;
  emoji: string;
  left: number;
  top: number;
}

interface LevelUpCelebrationProps {
  newImage: string; // レベルアップで表示する新しい画像
}

const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({
  newImage,
}) => {
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 絵文字を動的に追加
    const interval = setInterval(() => {
      setEmojis((prev) => [
        ...prev,
        ...Array.from({ length: 2 }).map(() => ({
          id: Math.random().toString(36).substring(7),
          emoji:
            celebrationEmojis[
              Math.floor(Math.random() * celebrationEmojis.length)
            ],
          left: Math.random() * 100,
          top: Math.random() * 100,
        })),
      ]);
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setVisible(false);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className={`level-up-background ${visible ? "fade-in" : "fade-out"}`}>
      {/* Level Up!! の文字 */}
      <h1
        className={`text-6xl font-bold text-center text-white mb-8 ${
          visible ? "fade-in" : "fade-out"
        }`}
      >
        Level Up!
      </h1>

      {/* 新しい画像 */}
      <div
        className={`relative w-4/5 max-w-screen-md mx-auto mb-4 ${
          visible ? "fade-in" : "fade-out"
        }`}
      >
        <img
          src={newImage}
          alt="Level Up!!"
          className="w-full h-auto object-cover rounded-lg shadow-lg"
        />
      </div>

      {/* 絵文字のエフェクト */}
      <div className="absolute inset-0 pointer-events-none">
        {emojis.map((emoji) => (
          <span
            key={emoji.id}
            className="absolute text-10xl emoji-burst"
            style={{
              left: `${emoji.left}%`,
              top: `${emoji.top}%`,
            }}
          >
            {emoji.emoji}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LevelUpCelebration;
