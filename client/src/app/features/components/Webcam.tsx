import React from "react";

interface WebcamProps {
    videoRef: React.RefObject<HTMLVideoElement>;
}

export const Webcam: React.FC<WebcamProps> = ({ videoRef }) => (
    <video ref={videoRef} autoPlay muted className="w-full h-auto rounded-lg border border-gray-300 dark:border-gray-700"></video>
);