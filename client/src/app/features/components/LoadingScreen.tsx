import React from 'react';

const LoadingScreen: React.FC = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
        }}>
            <div style={{
                width: '100px',
                height: '100px',
                border: '10px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite, colorChange 1s linear infinite',
            }}></div>
            <h2 style={{ marginTop: '20px' }}>SmileSync Now Loading...</h2>
            <style>
                {`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @keyframes colorChange {
                    0% { border-top-color: #9f75ff; }
                    50% { border-top-color: #61b2ff; }
                    100% { border-top-color: #9f75ff; }
                }
                `}
            </style>
        </div>
    );
};

export default LoadingScreen;
