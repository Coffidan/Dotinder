import React from 'react';
import { Button } from '@mui/material';

// Корректный логотип Steam (simple-icons, viewBox 0 0 24 24)
const SteamIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}>
    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.825.923 1.479.923.9 0 1.63-.729 1.63-1.629s-.73-1.629-1.63-1.629c-.157 0-.309.023-.453.065l1.523.63c.52.215.767.812.552 1.332-.216.52-.812.766-1.328.55zm8.475-8.776c0-1.272-1.034-2.303-2.306-2.303-1.271 0-2.304 1.031-2.304 2.303 0 1.272 1.033 2.303 2.304 2.303 1.272 0 2.306-1.031 2.306-2.303zm-3.9 0c0-.879.714-1.593 1.594-1.593.879 0 1.594.714 1.594 1.593 0 .88-.715 1.594-1.594 1.594-.88 0-1.594-.714-1.594-1.594z" />
  </svg>
);

const LoginButton: React.FC = () => {
  const handleLogin = () => {
    const steamOpenIdUrl = 'https://steamcommunity.com/openid/login?' +
      'openid.ns=http://specs.openid.net/auth/2.0&' +
      'openid.mode=checkid_setup&' +
      'openid.return_to=http://localhost:8080/login/steam/callback&' +
      'openid.realm=http://localhost:8080&' +
      'openid.identity=http://specs.openid.net/auth/2.0/identifier_select&' +
      'openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select';
    window.location.href = steamOpenIdUrl;
  };

  return (
    <Button
      variant="contained"
      onClick={handleLogin}
      size="large"
      disableElevation
      startIcon={<SteamIcon />}
      sx={{
        width: '100%',
        maxWidth: 340,
        py: 1.6,
        px: 4,
        fontSize: '0.95rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        textTransform: 'none',
        background: '#c62828',
        color: '#fff',
        border: '1px solid #c62828',
        borderRadius: '10px',
        transition: 'background 0.2s ease, transform 0.2s ease',
        '&:hover': { background: '#e53935', borderColor: '#e53935', transform: 'translateY(-1px)' },
        '&:active': { background: '#b71c1c', transform: 'translateY(0)' },
      }}
    >
      Войти через Steam
    </Button>
  );
};

export default LoginButton;
