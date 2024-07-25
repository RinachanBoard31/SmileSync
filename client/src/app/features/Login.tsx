import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const Login: React.FC = () => {
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async () => {
        try{
            const response = await fetch("http://localhost:8081/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: password }),
            });
            if (response.ok) {
                sessionStorage.setItem("jwt", "authorized"); // JWT(JSON Web Token)をsession storageに格納
                setError(null);
                router.push("/chat");
            } else {
                setError("Invalid password");
            }
        } catch (error) {
            setError("Error logging in");
        }
    };

    return (
        <div>
            <h1>三└(┐卍^o^)卍 ﾛｸﾞｨｨｲｲｲｲﾝﾝﾝ</h1>
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 mr-2" 
            />
            <button 
                type="button"
                onClick={handleLogin}
                className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 min-w-max"
                disabled={!password.trim()}> {/* <- 標準のrequiredはボタン押したときにvalidateされるわけではないので、送信前にinputTextが空文字でないかチェックする */}
                <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
                    Login
                </span>
            </button>
        </div>
    );
};

export default Login;