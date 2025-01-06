import React, { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi"; // 三角アイコンを利用

interface ImageCarouselProps {
  imageUrls: string[];
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ imageUrls }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // 画像配列が更新されたら最新の画像（配列の末尾）に切り替える
  useEffect(() => {
    if (imageUrls.length > 0) {
      setCurrentIndex(imageUrls.length - 1);
    }
  }, [imageUrls]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < imageUrls.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left; // クリック位置のX座標
    if (clickX < rect.width / 2) {
      handlePrev(); // 左半分なら前の画像
    } else {
      handleNext(); // 右半分なら次の画像
    }
  };

  return (
    <div className="relative w-full h-full">
      {imageUrls.length > 0 ? (
        <div
          className="w-full h-full relative cursor-pointer"
          onClick={handleImageClick}
        >
          {/* 表示する画像 */}
          <img
            src={imageUrls[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="w-full h-full object-cover rounded-lg"
          />

          {/* 左三角アイコン */}
          <FiChevronLeft
            onClick={(e) => {
              e.stopPropagation(); // 画像クリックイベントと競合しないようにする
              handlePrev();
            }}
            className={`absolute top-1/2 left-4 transform -translate-y-1/2 text-5xl font-bold ${
              currentIndex === 0
                ? "text-gray-400 cursor-not-allowed text-6xl font-bold"
                : "text-purple-600 cursor-pointer hover:opacity-80 text-6xl font-bold"
            }`}
          />

          {/* 右三角アイコン */}
          <FiChevronRight
            onClick={(e) => {
              e.stopPropagation(); // 画像クリックイベントと競合しないようにする
              handleNext();
            }}
            className={`absolute top-1/2 right-4 transform -translate-y-1/2 text-5xl font-bold ${
              currentIndex === imageUrls.length - 1
                ? "text-gray-400 cursor-not-allowed text-6xl font-bold"
                : "text-purple-600 cursor-pointer hover:opacity-80 text-6xl font-bold"
            }`}
          />
        </div>
      ) : (
        <p className="text-center text-gray-500">No images available</p>
      )}
    </div>
  );
};

export default ImageCarousel;
