import React from 'react';

interface IdeasButtonProps {
    onClick: () => void;
    totalIdeas: number;
    disabled?: boolean;
}

const IdeasButton: React.FC<IdeasButtonProps> = ({ onClick, totalIdeas, disabled }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-white rounded-lg 
                        group bg-gradient-to-br from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 
                        focus:ring-4 focus:outline-none focus:ring-blue-100 dark:focus:ring-blue-800
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transform transition-all duration-200 ease-in-out'}`}
            style={{ padding: '10px 15px', borderRadius: '30px', border: '2px solid transparent', minWidth: 'auto' }}
        >
            <span className="relative px-1 py-2.5 transition-all ease-in duration-75 bg-transparent text-lg">
                💡エサをあげる
            </span>
            <span className="ml-3 bg-black text-white rounded-full px-3 py-1.5 text-sm font-bold">
                {totalIdeas}
            </span>
        </button>
    );
};

export default IdeasButton;