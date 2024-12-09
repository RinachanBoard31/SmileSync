import React from "react";

interface SmileStatusProps {
  smileProb: number;
}

export const SmileStatus: React.FC<SmileStatusProps> = ({ smileProb }) => (
  <div className="text-9xl">{smileProb > 0.5 ? "😊" : "😐"}</div>
);
