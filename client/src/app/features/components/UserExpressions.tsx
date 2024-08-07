import React from "react";

interface UserExpressionsProps {
    userExpressions: object | null;
}

export const UserExpressions: React.FC<UserExpressionsProps> = ({ userExpressions }) => (
    <div>
        {userExpressions && (
            <pre>
                {Object.entries(userExpressions).map(([expression, prob]) => (
                    <span key={expression} style={{ color: prob > 0.5 ? 'cyan' : 'inherit' }}>
                        {expression}: {prob.toFixed(4)}{"\n"}
                    </span>
                ))}
            </pre>
        )}
    </div>
);