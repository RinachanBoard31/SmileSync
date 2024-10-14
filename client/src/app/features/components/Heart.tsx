import React, { useEffect, useState } from "react";

interface HeartProps {
    id: string;
    removeHeart: (id: string) => void;
}

const Heart: React.FC<HeartProps> = ({ id, removeHeart }) => {
    const [positionX] = useState<number>(Math.random() * 100); // ランダムなx座標
    const [color] = useState<string>(`rgba(255, ${Math.floor(Math.random() * 100 + 100)}, ${Math.floor(Math.random() * 150 + 100)}, 1)`); // 生成時にランダムな色を決定

    useEffect(() => {
        // 5秒後にハートを消す
        const timer = setTimeout(() => {
            removeHeart(id);
        }, 5000);

        return () => clearTimeout(timer);
    }, [id, removeHeart]);

    return (
        <div
            className="heart"
            style={{
                left: `${positionX}vw`,
                color: color, // 生成された色を持続
            }}
        >
            ❤︎
        </div>
    );
};

export default Heart;
