import React, { useState } from "react";

interface AnimalTypeChangerProps {
  onChange: (newAnimalType: string) => void;
}

const AnimalTypeChanger: React.FC<AnimalTypeChangerProps> = ({ onChange }) => {
  const [animalType, setAnimalType] = useState<string>("");

  const handleSubmit = () => {
    if (animalType.trim()) {
      onChange(animalType);
      setAnimalType(""); // フォームをクリア
    }
  };

  return (
    <div className="fixed bottom-16 right-4 z-50">
      <input
        type="text"
        value={animalType}
        onChange={(e) => setAnimalType(e.target.value)}
        placeholder="Enter animal type"
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
      />
      <button
        onClick={handleSubmit}
        className="relative inline-flex items-center justify-center p-0.5 mt-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 min-w-max"
      >
        <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
          Change Animal
        </span>
      </button>
    </div>
  );
};

export default AnimalTypeChanger;
