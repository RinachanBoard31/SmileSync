import React, { useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';

export const useSmileDetection = (
    videoRef: React.RefObject<HTMLVideoElement>,
) => {
    const [smileProb, setSmileProb] = useState(0);
    const [userExpressions, setUserExpressions] = useState<object | null>(null);

    useEffect(() => {
        const loadModels = async () => {
            await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
            await faceapi.nets.faceExpressionNet.loadFromUri("/models");
        };

        const getMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
            }
        };

        const detectSmile = async () => {
            if (videoRef.current) {
                const options = new faceapi.TinyFaceDetectorOptions();
                const result = await faceapi.detectSingleFace(videoRef.current, options).withFaceExpressions();
                if (result && result.expressions) {
                    setUserExpressions(result.expressions);
                    setSmileProb(result.expressions.happy);
                } else {
                    setSmileProb(0);
                }
            }
        };

        // 初期化処理
        const initialize = async () => {
            await loadModels();
            await getMedia();
            const intervalId = setInterval(detectSmile, 1000);
            return () => clearInterval(intervalId);
        };

        initialize();
    }, [videoRef]);

    return { smileProb, userExpressions };
};