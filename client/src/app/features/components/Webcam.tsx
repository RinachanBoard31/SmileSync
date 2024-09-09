import React, { useEffect } from "react";

interface WebcamProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    stream: MediaStream | null; // ストリームを受け取る
}

export const Webcam: React.FC<WebcamProps> = ({ videoRef, stream }) => {
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream; // 取得したストリームを設定
        }
    }, [videoRef, stream]);

    return (
        <video
        ref={videoRef}
        autoPlay
        muted
        className="w-full h-full object-cover rounded-lg border border-gray-300 dark:border-gray-700"
    ></video>
    );
};
