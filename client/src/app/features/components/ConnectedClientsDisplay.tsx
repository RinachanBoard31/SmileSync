import React from "react";

// 絵文字リスト
const emojiList = [
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
  "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦉",
  "🦄", "🐴", "🐢", "🐍", "🦖", "🦕", "🐙", "🦀", "🐠", "🐟",
  "🐬", "🐳", "🐋", "🦭", "🐧", "🦩", "🦚", "🦜", "🦡", "🦦",
  "🦥", "🐿", "🦔", "🦘", "🐓", "🦃", "🦆", "🦢", "🦉", "🦇",
  "🐞", "🐜", "🐝", "🪲", "🦋", "🐌", "🐛", "🦂", "🐍", "🦎"
];

interface ConnectedClientsDisplayProps {
  clientsList: string[];
}

// 名前から一意の絵文字を選択する関数
const getEmojiForName = (name: string): string => {
  const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return emojiList[hash % emojiList.length];
};

const ConnectedClientsDisplay: React.FC<ConnectedClientsDisplayProps> = ({
  clientsList,
}) => {
  return (
    <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg shadow-md dark:bg-gray-800 dark:border-gray-600">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
        参加者一覧 ({clientsList.length})
      </h2>
      <div className="overflow-y-auto max-h-40 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-700">
        {clientsList.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No clients connected</p>
        ) : (
          <ul className="space-y-1">
            {clientsList.map((client, index) => (
              <li
                key={index}
                className="flex items-center px-2 py-1 bg-gray-200 rounded dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-bold"
              >
                <span className="mr-2">{getEmojiForName(client)}</span>
                <span>{client}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConnectedClientsDisplay;
