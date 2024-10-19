import React from 'react';

interface ButtonProps {
    onClick: () => void;
    currentStatus: number;
}

const OnOffButton: React.FC<ButtonProps> = ({ onClick, currentStatus }) => (
    <button
        onClick={onClick} // コールバックを直接渡す
        className="py-2.5 px-5 me-2 text-sm font-medium text-gray-900 rounded-full bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 inline-flex items-center"
    >
        {/* 会議の開始 -> websocket上でのstatusをtrueにしてsmilePoint等を受付状態にする */}
        {currentStatus === 1 ? "会議を終了する" : "会議を開始する"}
    </button>
);

export default OnOffButton;
