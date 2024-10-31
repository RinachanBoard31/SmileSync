import React from 'react';

interface TimerDisplayProps {
    timer: string;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ timer }) => {
    return (
        <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg shadow-md flex items-center justify-center text-lg font-semibold text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
            <svg
                className="w-6 h-6 mr-2 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-7a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="leading-none">{timer}</span>
        </div>
    );
};

export default TimerDisplay;
