import React, { useEffect, useState } from "react";

interface FoodProps {
  id: string;
  foodsIndex: number;
  removeFood: (id: string) => void;
}

const Food: React.FC<FoodProps> = ({ id, foodsIndex, removeFood }) => {
  const [positionX] = useState<number>(Math.random() * 100);
  const foodsOptions = ["🦴", "🍖", "🐟", "🍎", "🍌", "🍓", "🍈", "🥕", "🥩"];

  // 🦴が5秒後に消えるように設定
  useEffect(() => {
    const timer = setTimeout(() => {
      removeFood(id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, removeFood]);

  return (
    <div
      className="food"
      style={{
        left: `${positionX}vw`,
      }}
    >
      {foodsOptions[foodsIndex]}
    </div>
  );
};

export default Food;
