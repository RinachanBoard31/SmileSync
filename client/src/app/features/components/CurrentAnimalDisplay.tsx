import React from "react";

interface CurrentAnimalDisplayProps {
  animalType: string;
}

const CurrentAnimalDisplay: React.FC<CurrentAnimalDisplayProps> = ({
  animalType,
}) => {
  return (
    <div className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-900 group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 transform translate-x-[-110px]">
      <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900">
        育てる動物:{" "}
        <strong className="text-purple-700 dark:text-purple-300">
          {animalType}
        </strong>
      </span>
    </div>
  );
};

export default CurrentAnimalDisplay;
