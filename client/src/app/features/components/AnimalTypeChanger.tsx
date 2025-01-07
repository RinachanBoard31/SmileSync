import React, { useState } from "react";

interface AnimalTypeChangerProps {
  onChange: (newAnimalType: string) => void;
  status: number; // status を追加
}

const AnimalTypeChanger: React.FC<AnimalTypeChangerProps> = ({
  onChange,
  status,
}) => {
  const [animalType, setAnimalType] = useState<string>("");

  const handleSubmit = () => {
    if (animalType.trim() && status === 0) {
      onChange(animalType);
      setAnimalType(""); // フォームをクリア
    }
  };

  return (
    <div className="flex items-center gap-2 translate-x-[-65px]">
      {/* 動物タイプの入力フォーム */}
      <input
        type="text"
        value={animalType}
        onChange={(e) => setAnimalType(e.target.value)}
        placeholder="動物を入力"
        className={`p-2.5 text-sm ${
          status === 0
            ? "text-gray-900 bg-gray-50"
            : "text-gray-400 bg-gray-200"
        } border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 backdrop-blur-md dark:${
          status === 0
            ? "bg-gray-900 border-gray-600 text-white"
            : "bg-gray-800 border-gray-700 text-gray-500"
        }`}
        disabled={status !== 0} // 入力を無効化
      />
      {/* 動物タイプ送信ボタン */}
      <button
        onClick={handleSubmit}
        disabled={status !== 0} // ボタンを無効化
        className={`relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium ${
          status === 0
            ? "text-gray-900 bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white"
            : "text-gray-400 bg-gray-200 cursor-not-allowed dark:text-gray-500"
        } focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800`}
      >
        <span
          className={`relative px-5 py-2.5 transition-all ease-in duration-75 ${
            status === 0
              ? "bg-white dark:bg-gray-900 group-hover:bg-opacity-0"
              : "bg-gray-200 dark:bg-gray-800"
          }`}
        >
          変更
        </span>
      </button>
    </div>
  );
};

export default AnimalTypeChanger;
