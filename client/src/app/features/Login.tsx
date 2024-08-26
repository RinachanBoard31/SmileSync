import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from './components/LoadingScreen';

const Login: React.FC = () => {
    const [password, setPassword] = useState<string>("");
    const [nickname, setNickname] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false); // ローディング状態を管理
    const router = useRouter();

    // 以前アクセスしててlocalStorageにあるなら、そのnicknameをセットする
    useEffect(() => {
        let storedNickname = localStorage.getItem("nickname");
        if (storedNickname) {
            setNickname(storedNickname);
        }
    }, []);

    const handleLogin = async () => {
        try{
            // const response = await fetch(`https://${process.env.NEXT_PUBLIC_CLIENT_IP}:${process.env.NEXT_PUBLIC_PORT}/login`, {
            const response = await fetch(`https://${process.env.NEXT_PUBLIC_CLIENT_IP}/login`, {

                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: password }),
            });
            if (response.ok) {
                sessionStorage.setItem("login_password", password); // JWT(JSON Web Token)をsession storageに格納
                localStorage.setItem("nickname", nickname);
                setError(null);
                setIsLoading(true); //　ローディング開始
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
            {isLoading ? ( <LoadingScreen /> ) : (
                <>
                    <div>
                        <h1>三└(┐卍^o^)卍 ﾛｸﾞｨｨｲｲｲｲﾝﾝﾝ</h1>
                        {error && <p style={{ color: "red" }}>{error}</p>} {/* errorに値がある場合、エラーメッセージを赤色で表示する */}
                        <h2>Nickname</h2>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Enter your nickname"
                            required
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-half p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 mr-2" 
                        />
                        <h2>Room Password</h2>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-half p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 mr-2" 
                        />
                        <button 
                            type="button"
                            onClick={handleLogin}
                            className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 min-w-max"
                            disabled={!password.trim() || !nickname.trim()}> {/* <- 標準のrequiredはボタン押したときにvalidateされるわけではないので、送信前にinputTextが空文字でないかチェックする */}
                            <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
                                Login
                            </span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default Login;