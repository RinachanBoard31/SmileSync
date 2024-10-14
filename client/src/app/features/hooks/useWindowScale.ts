import { useState, useEffect } from "react";

export const useWindowScale = (minHeight=640) => {
    const [scale, setScale] = useState(1);

    const handleResize = () => {
        const height = window.innerHeight;
        
        const newScale = height < minHeight ? height / minHeight : 1;
        setScale(newScale);
    };

    useEffect(() => {
        window.addEventListener("resize", handleResize);
        handleResize(); // 初回レンダリング時にも実行
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [minHeight]);

    return scale;
}