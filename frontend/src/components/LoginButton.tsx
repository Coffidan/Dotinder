import React from 'react';
import { Button } from '@mui/material';

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
            sx={{ backgroundColor: '#171a21', '&:hover': { backgroundColor: '#2a475e' } }}
        >
            Войти через Steam
        </Button>
    );
};

export default LoginButton;
