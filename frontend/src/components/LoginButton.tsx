import React from 'react';
import { Button, Box } from '@mui/material';

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
            sx={{
                py: 2,
                px: 5,
                fontSize: '1rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: 'linear-gradient(180deg, #2a475e 0%, #1b2838 100%)',
                color: '#fff',
                border: '1px solid rgba(102, 192, 244, 0.45)',
                boxShadow:
                    '0 6px 20px rgba(42, 71, 94, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                transition: 'all 0.25s ease',
                borderRadius: 8,
                '&:hover': {
                    background: 'linear-gradient(180deg, #3a5a75 0%, #1f3045 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 10px 30px rgba(42, 71, 94, 0.6)',
                },
                '&:active': { transform: 'translateY(0)' },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.74 8.21 11.27l1.87-2.73c-.28-.1-.54-.23-.78-.38l-1.97-1.21-1.27-.69c-2.14-1.18-2.9-3.87-1.72-6 .6-1.12 1.67-1.8 2.85-1.54.3.07.59.18.85.32l1.57.85 2.15.38 2.54-.34 1.44-.78c1.25-.67 2.9-.5 3.93.42 1.03.92 1.28 2.43.65 3.68-.63 1.25-2.1 1.92-3.44 1.62l-1.32-.45-2.2 1.14-2.02 1.26c-.26.15-.52.27-.8.38l-.91 2.67C16.68 23.5 20.58 20.2 22.66 15.65 24.25 12.6 24 6.9 19.79 3.9 17.35 0.46 12.77-.61 8.45.8 5.72 1.67 3.32 3.84 2.18 6.65 1.2 9.67 1.66 12.89 4.08 15.28 6.88 17.1 10.3 17.25 12 17.25c-.2 0-.4 0-.6-.02-1-1.66-2.8-2.75-4.8-2.75-2.2 0-4.1 1.2-5.1 2.95l-.35-.2c.17-2.95 2.7-5.3 5.7-5.3 3.1 0 5.65 2.5 5.65 5.65 0 1.6-.68 3.05-1.77 4.07.17.05.35.08.52.08 3.31 0 6.25-2.1 7.2-5.15C25.4 11.8 24.5 6.9 21.1 4.15 18.5 2.1 15.2.88 12 0.88z" fill="#66c0f4" />
                    <circle cx="8.5" cy="13.5" r="1.8" fill="#1b2838" />
                    <circle cx="14.8" cy="12.8" r="1.8" fill="#1b2838" />
                </svg>
                Войти через STEAM
            </Box>
        </Button>
    );
};

export default LoginButton;
