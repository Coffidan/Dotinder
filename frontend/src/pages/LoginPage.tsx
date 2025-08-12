import React from 'react';
import LoginButton from '../components/LoginButton';

const LoginPage: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',  
      textAlign: 'center' 
    }}>
      <h1>Вход в Dotinder</h1>
      <LoginButton />
    </div>
  );
};

export default LoginPage;
