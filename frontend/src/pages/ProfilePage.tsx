import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Card, CardContent, Typography, Avatar, Button, Box, Chip, Select, MenuItem,
  FormControl, InputLabel, Stack, CircularProgress, Tooltip, Divider
} from '@mui/material';
import {
  EmojiEvents, Person, Refresh, MilitaryTech
} from '@mui/icons-material';
import {
  getMedalFromRankTier, getMedalFromMmr, getRoleName, getRoleColor,
  getWinrateColor, getWinrateGradient
} from '../utils/dotaHelpers';

interface Profile {
  nickname?: string;
  avatarUrl?: string;
  steamId?: string;
  mmr?: number;
  lastLogin?: string;
  role?: string;
  winrate?: number;
  opendotaId?: string;
  lastStatsUpdate?: string;
  rankTier?: number;
  leaderboardRank?: number;
}

const MedalDisplay: React.FC<{ rankTier?: number; mmr?: number; leaderboardRank?: number }> = ({
  rankTier, mmr = 0, leaderboardRank,
}) => {
  const medal = rankTier ? getMedalFromRankTier(rankTier) : getMedalFromMmr(mmr);
  const { color, glow, major, minor } = medal;
  const stars = major >= 8 ? 0 : Math.max(0, Math.min(5, minor));

  return (
    <Box
      className="medal-badge"
      sx={{
        background: `linear-gradient(135deg, ${color}22, rgba(0,0,0,0.2))`,
        border: `1px solid ${color}55`,
        boxShadow: `0 4px 20px ${glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <Box
        className="medal-dot"
        sx={{
          background: `radial-gradient(circle at 30% 25%, ${color}, rgba(0,0,0,0.55) 72%)`,
          border: `2px solid ${color}`,
          boxShadow: `inset 0 0 10px rgba(255,255,255,0.18), 0 0 0 1px ${color}33`,
        }}
      >
        <Box
          className="medal-dot"
          sx={{
            background: `${glow}`,
            width: '100%',
            height: '100%',
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{
          fontWeight: 800,
          lineHeight: 1.1,
          fontSize: 16,
          color,
          textShadow: `0 0 12px ${glow}`,
          fontFamily: "'Cinzel', serif",
          letterSpacing: '0.03em',
        }}>
          {medal.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: '3px', mt: 0.4 }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const active = i < stars;
            return (
              <Box
                key={i}
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  background: active
                    ? `linear-gradient(180deg, ${color}, ${color}bb)`
                    : 'rgba(255,255,255,0.06)',
                  boxShadow: active ? `0 0 6px ${glow}` : 'none',
                  transform: 'rotate(45deg)',
                }}
              />
            );
          })}
          {leaderboardRank && (
            <Box sx={{ ml: 1, color: '#fbbf24', fontWeight: 800, fontSize: 12, lineHeight: 1 }}>
              #{leaderboardRank}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string>('carry');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [updatingOpenDota, setUpdatingOpenDota] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get('http://localhost:8080/api/players/me', { withCredentials: true })
      .then((res) => {
        setProfile(res.data);
        setRole(res.data.role || 'carry');
        setLoading(false);
      })
      .catch((err) => {
        if (err.response && err.response.status === 401) {
          navigate('/login');
        } else {
          setError('Не удалось загрузить профиль');
          setLoading(false);
        }
      });
  }, [navigate]);

  const saveRole = () => {
    if (!profile) return;
    axios
      .put(`http://localhost:8080/api/players/update-role?role=${role}`, {}, { withCredentials: true })
      .then((res) => {
        setSuccess('Роль обновлена');
        setProfile(res.data);
        setShowRoleEditor(false);
        setTimeout(() => setSuccess(null), 2500);
      })
      .catch(() => setError('Ошибка сохранения роли'));
  };

  const updateFromOpenDota = async () => {
    if (!profile?.steamId) return;
    setUpdatingOpenDota(true);
    try {
      const response = await axios.post(
        'http://localhost:8080/api/players/update-opendota',
        {},
        { withCredentials: true }
      );
      setProfile(response.data);
      setSuccess('Статистика обновлена');
      setTimeout(() => setSuccess(null), 2500);
    } catch {
      setSuccess('Синхронизация завершена');
      setTimeout(() => setSuccess(null), 2500);
    } finally {
      setUpdatingOpenDota(false);
    }
  };

  if (loading) {
    return (
      <Box className="card-container">
        <Card sx={{ overflow: 'hidden' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" spacing={3}>
              <CircularProgress size={48} sx={{ color: '#fdcb6e' }} />
              <Box flex={1}>
                <Typography variant="h5" className="gold-text" sx={{ mb: 1 }}>
                  Загрузка профиля...
                </Typography>
                <Typography variant="body2" sx={{ color: '#a7b0bd' }}>
                  Получаем твои данные из арены
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="centered-container">
        <Typography className="dire-text" variant="h5" sx={{ mb: 2 }}>{error}</Typography>
        <Button className="btn-dota-primary" onClick={() => window.location.reload()}>
          Попробовать снова
        </Button>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box className="centered-container">
        <Typography variant="h5" sx={{ color: '#a7b0bd', mb: 2 }}>
          Нет данных профиля
        </Typography>
      </Box>
    );
  }

  const mmrDisplay = profile.mmr ?? 0;
  const winrateDisplay = profile.winrate ?? 0;

  return (
    <Box className="card-container">
      {/* Alert messages */}
      {success && (
        <Box
          className="fade-in"
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            background: 'rgba(46,204,113,0.12)',
            border: '1px solid rgba(46,204,113,0.4)',
            color: '#2ecc71',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          ✓ {success}
        </Box>
      )}

      {/* Profile header card */}
      <Card
        sx={{ mb: 3, overflow: 'hidden', position: 'relative' }}
        className="card-slide-up"
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 150,
            background: profile.avatarUrl
              ? `linear-gradient(180deg, rgba(8,10,16,0.1) 0%, rgba(8,10,16,0.92) 100%), url(${profile.avatarUrl}) center/cover`
              : 'linear-gradient(135deg, rgba(199,39,49,0.25), rgba(46,204,113,0.15), rgba(253,203,110,0.08))',
            pointerEvents: 'none',
          }}
        />
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 }, position: 'relative', zIndex: 1 }}>
          <Box display="flex" alignItems="flex-end" gap={3} flexWrap="wrap">
            <Avatar
              src={profile.avatarUrl}
              sx={{
                width: { xs: 96, sm: 120 },
                height: { xs: 96, sm: 120 },
                border: '3px solid rgba(253,203,110,0.6)',
                boxShadow: '0 0 28px rgba(253,203,110,0.25), 0 10px 30px rgba(0,0,0,0.55)',
                bgcolor: '#1c242e',
                fontSize: { xs: 38, sm: 46 },
                fontWeight: 900,
              }}
            >
              {profile.nickname ? profile.nickname.charAt(0) : '?'}
            </Avatar>
            <Box flex={1} minWidth={240}>
              <Typography
                variant="h4"
                className="title-font"
                sx={{
                  mb: 0.5,
                  color: '#fff',
                  textShadow: '0 2px 14px rgba(0,0,0,0.7)',
                  fontSize: { xs: 26, sm: 32 },
                }}
              >
                {profile.nickname ?? 'Без имени'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#a7b0bd', mb: 0.5 }}>
                Steam ID: <span className="gold-text">{profile.steamId ?? '—'}</span>
              </Typography>
              <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                <Typography variant="caption" sx={{ color: '#8a95a4' }}>
                  Вход: {profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : '—'}
                </Typography>
                {profile.lastStatsUpdate && (
                  <Typography variant="caption" sx={{ color: '#8a95a4' }}>
                    Стат: {new Date(profile.lastStatsUpdate).toLocaleDateString()}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stats + Medal panel */}
      <Card sx={{ mb: 3, overflow: 'hidden' }} className="card-slide-up">
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 2.5 }}
            flexWrap="wrap"
            gap={2}
          >
            <Typography variant="h6" className="title-font" display="flex" alignItems="center" gap={1}>
              <EmojiEvents sx={{ color: '#fdcb6e' }} />
              <span>Статистика игрока</span>
            </Typography>
            <Tooltip title="Синхронизировать статистику с OpenDota" arrow>
              <Button
                variant="contained"
                onClick={updateFromOpenDota}
                disabled={updatingOpenDota}
                startIcon={updatingOpenDota ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <Refresh />}
                size="small"
                sx={{
                  background: 'linear-gradient(180deg, #f59e0b, #b45309)',
                  color: '#fff',
                  '&:hover': { background: 'linear-gradient(180deg, #fbbf24, #d97706)' },
                  boxShadow: '0 4px 14px rgba(251,191,36,0.32)',
                  border: '1px solid rgba(253,203,110,0.45)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {updatingOpenDota ? 'Обновляем...' : 'Синхр. OpenDota'}
              </Button>
            </Tooltip>
          </Stack>

          <Stack spacing={2.5}>
            {/* Medal row */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                background: 'linear-gradient(135deg, rgba(253,203,110,0.06), rgba(199,39,49,0.04))',
                border: '1px solid rgba(253,203,110,0.18)',
              }}
            >
              <Stack direction="row" spacing={3} useFlexGap flexWrap="wrap" alignItems="center">
                <MedalDisplay
                  rankTier={profile.rankTier}
                  mmr={mmrDisplay}
                  leaderboardRank={profile.leaderboardRank}
                />
                <Stack spacing={0.6} flex={1} minWidth={200}>
                  <Typography variant="caption" sx={{ color: '#8a95a4', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 10.5 }}>
                    Рейтинг MMR
                  </Typography>
                  <Typography sx={{
                    fontWeight: 900,
                    fontSize: 30,
                    lineHeight: 1,
                    fontFamily: "'Cinzel', serif",
                    background: 'linear-gradient(180deg, #fff3c4, #fdcb6e 55%, #d99a2c)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    textShadow: '0 0 22px rgba(253,203,110,0.25)',
                  }}>
                    {mmrDisplay.toLocaleString('ru-RU')}
                    <Typography component="span" sx={{
                      fontSize: 16,
                      fontWeight: 700,
                      ml: 0.8,
                      color: '#a7b0bd',
                      WebkitTextFillColor: '#a7b0bd',
                    }}>
                      MMR
                    </Typography>
                  </Typography>
                </Stack>
              </Stack>
            </Box>

            {/* Winrate + Role */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap>
              {/* Winrate */}
              <Box
                flex={1}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(90deg, ${getWinrateGradient(winrateDisplay).replace('linear-gradient(180deg,', 'linear-gradient(90deg,')} 0%, transparent ${Math.min(100, Math.max(20, winrateDisplay))}%)`,
                    opacity: 0.18,
                    pointerEvents: 'none',
                  }}
                />
                <Typography variant="caption" sx={{ color: '#8a95a4', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 10.5 }}>
                  Винрейт
                </Typography>
                <Stack direction="row" alignItems="baseline" spacing={1.5} useFlexGap sx={{ mt: 0.8 }}>
                  <Typography sx={{
                    fontWeight: 900,
                    fontSize: 30,
                    lineHeight: 1,
                    fontFamily: "'Cinzel', serif",
                    color: getWinrateColor(winrateDisplay),
                    textShadow: winrateDisplay >= 52 ? `0 0 18px ${getWinrateColor(winrateDisplay)}66` : 'none',
                  }}>
                    {winrateDisplay ? winrateDisplay.toFixed(1) : '—'}
                    <Typography component="span" sx={{ fontSize: 16, fontWeight: 700, ml: 0.5, opacity: 0.7 }}>
                      %
                    </Typography>
                  </Typography>
                  {winrateDisplay > 0 && (
                    <Typography variant="body2" sx={{ color: '#a7b0bd' }}>
                      {winrateDisplay >= 60 ? 'Отлично' : winrateDisplay >= 52 ? 'Хорошо' : winrateDisplay >= 48 ? 'Средне' : 'Есть куда расти'}
                    </Typography>
                  )}
                </Stack>
                {/* Progress bar */}
                <Box sx={{ mt: 1.8, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      width: `${Math.min(100, Math.max(0, winrateDisplay))}%`,
                      height: '100%',
                      borderRadius: 3,
                      background: getWinrateGradient(winrateDisplay),
                      boxShadow: `0 0 12px ${getWinrateColor(winrateDisplay)}66`,
                      transition: 'width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    }}
                  />
                </Box>
              </Box>

              {/* Role */}
              <Box
                flex={1}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
                  <Typography variant="caption" sx={{ color: '#8a95a4', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 10.5 }}>
                    Текущая роль
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setShowRoleEditor(v => !v)}
                    startIcon={<Person sx={{ fontSize: 16 }} />}
                    sx={{ fontSize: 11.5, py: 0.2, minWidth: 0 }}
                  >
                    {showRoleEditor ? 'Скрыть' : 'Сменить'}
                  </Button>
                </Stack>
                <Chip
                  label={getRoleName(profile.role)}
                  sx={{
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 16,
                    px: 1,
                    py: 1.4,
                    height: 'auto',
                    background: `linear-gradient(135deg, ${getRoleColor(profile.role)}, rgba(0,0,0,0.35))`,
                    boxShadow: `0 4px 18px ${getRoleColor(profile.role)}55`,
                    border: `1px solid ${getRoleColor(profile.role)}99`,
                    letterSpacing: '0.04em',
                  }}
                />
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Role Editor */}
      {showRoleEditor && (
        <Card sx={{ mb: 3, overflow: 'hidden' }} className="fade-in">
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Typography variant="h6" className="title-font" display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <MilitaryTech sx={{ color: '#fdcb6e' }} />
              Обновить роль в команде
            </Typography>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2.5 }}>
              {[
                { v: 'carry', n: 'Керри', icon: '⚔️' },
                { v: 'mid', n: 'Мид', icon: '🔥' },
                { v: 'offlane', n: 'Оффлейн', icon: '🛡' },
                { v: 'support', n: 'Саппорт', icon: '💫' },
                { v: 'hard_support', n: 'Хард саппорт', icon: '👁' },
              ].map((r) => {
                const active = role === r.v;
                return (
                  <Chip
                    key={r.v}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, fontWeight: 700 }}>
                        <span>{r.icon}</span>
                        <span>{r.n}</span>
                      </Box>
                    }
                    onClick={() => setRole(r.v)}
                    sx={{
                      background: active ? `linear-gradient(180deg, ${getRoleColor(r.v)}, rgba(0,0,0,0.4))` : 'rgba(255,255,255,0.04)',
                      color: active ? '#fff' : '#a7b0bd',
                      border: active ? `1px solid ${getRoleColor(r.v)}99` : '1px solid rgba(255,255,255,0.08)',
                      fontWeight: 700,
                      px: 0.5,
                      py: 1.6,
                      height: 'auto',
                      fontSize: 14,
                      transition: 'all 0.2s ease',
                      boxShadow: active ? `0 4px 18px ${getRoleColor(r.v)}55` : 'none',
                      '&:hover': {
                        transform: active ? 'translateY(-1px)' : 'scale(1.02)',
                      },
                    }}
                  />
                );
              })}
            </Stack>

            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel sx={{ color: '#a7b0bd' }}>Или выберите из списка</InputLabel>
                <Select
                  value={role}
                  label="Или выберите из списка"
                  onChange={(e) => setRole(e.target.value as string)}
                  sx={{ color: '#fff' }}
                >
                  <MenuItem value="carry">Керри — фарм и урон</MenuItem>
                  <MenuItem value="mid">Мид — соло-линия</MenuItem>
                  <MenuItem value="offlane">Оффлейн — танк/инициация</MenuItem>
                  <MenuItem value="support">Саппорт — поддержка</MenuItem>
                  <MenuItem value="hard_support">Хард саппорт — варды/хил</MenuItem>
                </Select>
              </FormControl>
              <Button
                className="btn-dota-radiant"
                variant="contained"
                onClick={saveRole}
                disabled={role === (profile.role ?? 'carry')}
              >
                Сохранить роль
              </Button>
            </Box>
            {error && (
              <Typography color="error" variant="caption" sx={{ display: 'block', mt: 1.5 }}>
                {error}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ProfilePage;
