import React from 'react';
import { Button, Box } from '@mui/material';

const LoginButton: React.FC = () => {
    const handleLogin = () => {
        // Steam OpenID URL для ручного callback
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
            sx={{ 
                backgroundColor: '#171a21', 
                py: 2,
                px: 4,
                borderRadius: '15px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                '&:hover': {
                    backgroundColor: '#2a475e',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                    transform: 'translateY(-2px)'
                },
                transition: 'all 0.3s ease'
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ fontSize: '1.5rem' }}>🎮</span>
                Войти через Steam
            </Box>
        </Button>
    );
};

export default LoginButton;
