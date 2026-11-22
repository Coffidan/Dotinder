import React, { useEffect, useState } from 'react';
import { Box, Typography, Stack, Divider } from '@mui/material';
import LoginButton from '../components/LoginButton';
import LogoMark from '../components/LogoMark';

const FEATURES = [
  { icon: '🎯', text: 'Подбор тиммейтов по MMR, роли и винрейту' },
  { icon: '💬', text: 'Приватные чаты с тиммейтами в реальном времени' },
  { icon: '⚡', text: 'Автосинхронизация статистики через OpenDota' },
  { icon: '🏆', text: 'Фильтры по роли: Carry / Mid / Offlane / Support' },
];

const LoginPage: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Бэкенд может вернуть ?error=invalid, если вход через Steam не подтверждён
    setAuthError(new URLSearchParams(window.location.search).get('error') === 'invalid');
  }, []);

  return (
    <Box className="login-page">
      <Box className={`login-content ${mounted ? 'login-visible' : ''}`}>
        <Box className="dota-panel login-panel" sx={{ px: { xs: 3, sm: 4.5 }, py: { xs: 4, sm: 5 } }}>
          <Stack alignItems="center" spacing={0}>
            <LogoMark size={60} />

            <Box className="login-international" sx={{ mt: 2.5 }}>
              <Box className="login-line login-line-left" />
              <span>Dota 2 Team Finder</span>
              <Box className="login-line login-line-right" />
            </Box>

            <Typography variant="h1" component="h1" className="login-logo-text">
              DOTINDER
            </Typography>

            <Typography variant="subtitle1" className="login-subtitle">
              Найди своих. Побеждай вместе.
            </Typography>

            <Divider sx={{ width: '100%', my: 3, borderColor: 'rgba(255,255,255,0.08)' }} />

            <Typography variant="body1" className="login-description">
              Найди <span className="gold-text">идеальных тиммейтов</span> по MMR, роли и стилю игры.
              Собери состав, который выведет тебя к Immortal.
            </Typography>

            <Stack spacing={1.2} sx={{ width: '100%', mb: 3.5 }}>
              {FEATURES.map((t, i) => (
                <Box
                  key={i}
                  className="login-feature"
                  sx={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateX(0)' : 'translateX(-14px)',
                    transition: `all 0.5s ease ${0.15 + i * 0.08}s`,
                  }}
                >
                  <Typography sx={{ fontSize: 17 }}>{t.icon}</Typography>
                  <Typography variant="body2" className="login-feature-text">
                    {t.text}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <LoginButton />

            {authError && (
              <Typography
                variant="body2"
                sx={{ mt: 2.5, color: '#e57373', fontWeight: 600, textAlign: 'center' }}
              >
                Не удалось подтвердить вход через Steam. Попробуйте ещё раз.
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
