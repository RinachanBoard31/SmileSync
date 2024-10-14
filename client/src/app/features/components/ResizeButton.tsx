// components/ResizeButton.tsx
import React from 'react';

interface ResizeButtonProps {
    onClick: () => void;
    label: string;
}

const ResizeButton: React.FC<ResizeButtonProps> = ({ onClick, label }) => {
    return (
        <button 
            type="button"
            onClick={onClick}
            className="fixed bottom-4 right-4 z-50 inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-900 group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 min-w-max"
        >
            <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 group-hover:bg-opacity-0">
                {label}
            </span>
        </button>
    );
};

export default ResizeButton;
