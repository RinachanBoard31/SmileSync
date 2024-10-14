import exp from 'constants';
import React, { useEffect } from 'react';

interface BorderEffectProps {
    smileProb: number;
}

const BorderEffect: React.FC<BorderEffectProps> = ({ smileProb }) => {
    useEffect(() => {
        if (smileProb > 0.5) {
            document.body.style.border = "20px solid limegreen";
        } else {
            document.body.style.border = "20px solid transparent";
        }
    }, [smileProb]);

    return null; // UIに何も表示しないのでnullを返す
};

export default BorderEffect;