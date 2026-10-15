import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, Stack, Divider } from '@mui/material';
import LoginButton from '../components/LoginButton';

const FEATURES = [
  { icon: '🎯', text: 'Точный подбор по медали, MMR и винрейту' },
  { icon: '💬', text: 'Приватные чаты с тиммейтами через WebSocket' },
  { icon: '⚡', text: 'Автосинхронизация статистики с OpenDota' },
  { icon: '🏆', text: 'Фильтры по роли: Carry / Mid / Offlane / Support' },
];

const LoginPage: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Box className="login-page">
      <Box className="login-grid" />

      <Box
        className={`login-content ${mounted ? 'login-visible' : ''}`}
        sx={{ width: '100%', maxWidth: 'none', px: { xs: 1, sm: 2, md: 3 }, py: 6 }}
      >
        <Box className="dota-panel login-panel" sx={{ px: { xs: 3, sm: 5, md: 6 }, py: { xs: 4, sm: 5, md: 6 } }}>
          <span className="dota-card-corner tl" />
          <span className="dota-card-corner tr" />
          <span className="dota-card-corner bl" />
          <span className="dota-card-corner br" />

          <Box className="login-bar login-bar-top" />
          <Box className="login-bar login-bar-bottom" />

          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box className="login-international">
              <Box className="login-line login-line-left" />
              <span>THE INTERNATIONAL</span>
              <Box className="login-line login-line-right" />
            </Box>

            <Box className="dota-logo">
              <Box className="dota-logo-glow" />
              <Box className="dota-logo-inner">
                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'flex-end' }}>
                  {['D', 'O', 'T', 'A'].map((ch, i) => (
                    <Typography
                      key={i}
                      variant="h1"
                      component="span"
                      className={`dota-logo-letter ${i < 2 ? 'dire' : 'radiant'}`}
                    >
                      {ch}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            </Box>

            <Typography variant="h2" component="h1" className="login-title">
              DOTINDER
            </Typography>
            <Typography variant="subtitle1" className="login-subtitle">
              Find Your Team. Rule The Battle.
            </Typography>

            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 0 }}>
              <Chip label="DIRE" size="small" className="dota-chip dire-chip" />
              <Chip label="⚔" size="small" className="dota-chip sword-chip" />
              <Chip label="RADIANT" size="small" className="dota-chip radiant-chip" />
            </Stack>
          </Box>

          <Divider className="login-divider" />

          <Typography variant="body1" className="login-description">
            Найди своих <span className="gold-text">идеальных тиммейтов</span> по MMR, роли и стилю игры.
            Прокачайся вместе до Immortal и стань легендой плей-офф.
          </Typography>

          <Stack spacing={1.2} sx={{ mb: 4 }}>
            {FEATURES.map((t, i) => (
              <Box
                key={i}
                className={`login-feature ${i % 2 === 0 ? 'dire' : 'radiant'}`}
                sx={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateX(0)' : 'translateX(-16px)',
                  transition: `all 0.5s ease ${0.2 + i * 0.1}s`,
                }}
              >
                <Typography sx={{ fontSize: 18 }}>{t.icon}</Typography>
                <Typography variant="body2" className="login-feature-text">
                  {t.text}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <LoginButton />
          </Box>
        </Box>
      </Box>

      <style>{`
        @keyframes crestSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default LoginPage;
