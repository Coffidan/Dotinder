import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Box, Typography, CardContent, IconButton, Chip, Stack, Alert, Snackbar,
  Button, Slider, FormControl, InputLabel, Select, MenuItem, Avatar, Tooltip,
  Divider
} from '@mui/material';
import {
  Favorite, Close, EmojiEvents, FilterList, ArrowBack, MilitaryTech,
  TrackChanges
} from '@mui/icons-material';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useNavigate } from 'react-router-dom';
import {
  getMedalFromRankTier, getMedalFromMmr, getRoleName, getRoleColor,
  getWinrateColor, getWinrateGradient, MEDAL_COLORS, MEDAL_GLOW, API_BASE, WS_URL
} from '../utils/dotaHelpers';

interface Player {
  steamId: string;
  nickname: string;
  mmr: number;
  avatarUrl?: string;
  role?: string;
  winrate?: number;
  rankTier?: number;
  leaderboardRank?: number;
}

interface ProfileLite {
  steamId: string;
  nickname: string;
}

const MedalDisplay: React.FC<{ rankTier?: number; mmr?: number; leaderboardRank?: number; size?: 'sm' | 'md' | 'lg' }> = ({
  rankTier, mmr = 0, leaderboardRank, size = 'md',
}) => {
  const medal = rankTier ? getMedalFromRankTier(rankTier) : getMedalFromMmr(mmr);
  const { color, glow, major, minor } = medal;
  const stars = major >= 8 ? 0 : Math.max(0, Math.min(5, minor));
  const dotSize = size === 'sm' ? 22 : size === 'lg' ? 42 : 30;

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
          width: dotSize,
          height: dotSize,
          background: `radial-gradient(circle at 30% 25%, ${color}, rgba(0,0,0,0.55) 72%)`,
          border: `2px solid ${color}`,
          boxShadow: `inset 0 0 10px rgba(255,255,255,0.18), 0 0 0 1px ${color}33`,
        }}
      >
        <Box
          sx={{
            background: `${glow}`,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            filter: 'blur(6px)',
            opacity: 0.6,
            position: 'absolute',
            inset: -4,
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{
          fontWeight: 800,
          lineHeight: 1.1,
          fontSize: size === 'sm' ? 12.5 : size === 'lg' ? 18 : 15,
          color,
          textShadow: `0 0 12px ${glow}`,
          fontFamily: "'Cinzel', serif",
          letterSpacing: '0.03em',
        }}>
          {medal.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: '3px', mt: 0.3 }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const active = i < stars;
            return (
              <Box
                key={i}
                sx={{
                  width: size === 'sm' ? 5 : 7,
                  height: size === 'sm' ? 5 : 7,
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
            <Box sx={{ ml: 1, color: '#fbbf24', fontWeight: 800, fontSize: size === 'sm' ? 10 : 12, lineHeight: 1 }}>
              #{leaderboardRank}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const SwipePage: React.FC = () => {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showMatch, setShowMatch] = useState<boolean>(false);
  const [notification, setNotification] = useState<any | null>(null);
  const [_connected, setConnected] = useState(false);
  void _connected;
  const [showFilter, setShowFilter] = useState<boolean>(true);
  const [mmrRange, setMmrRange] = useState<[number, number]>([0, 10000]);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [minWinrate, setMinWinrate] = useState<number>(0);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [cardKey, setCardKey] = useState(0);
  const navigate = useNavigate();
  const clientRef = useRef<Client | null>(null);

  const roles = useMemo(() => ([
    { v: null, n: 'Все роли', icon: '♾' },
    { v: 'carry', n: 'Керри', icon: '⚔️' },
    { v: 'mid', n: 'Мид', icon: '🔥' },
    { v: 'offlane', n: 'Оффлейн', icon: '🛡' },
    { v: 'support', n: 'Саппорт', icon: '💫' },
    { v: 'hard_support', n: 'Хард саппорт', icon: '👁' },
  ]), []);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/players/me`, { withCredentials: true });
        if (cancelled) return;
        setProfile({ steamId: res.data.steamId, nickname: res.data.nickname });

        const socket = new SockJS(WS_URL);
        const client = new Client({
          webSocketFactory: () => socket,
          reconnectDelay: 5000,
          debug: () => {},
          connectHeaders: { login: res.data.steamId },
          onConnect: () => {
            setConnected(true);
            client.subscribe('/user/queue/notifications', (msg) => {
              const notif = JSON.parse(msg.body);
              if (notif.type === 'MATCH') setNotification(notif);
            });
          },
          onStompError: (frame) => {
            console.warn('STOMP error', frame.headers.message);
            setConnected(false);
          },
        });
        client.activate();
        clientRef.current = client;

        await fetchNextPlayer();
      } catch (err: any) {
        if (!cancelled) {
          if (err.response?.status === 401) navigate('/login');
          else setError('Не удалось инициализировать сессию');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => {
      cancelled = true;
      if (clientRef.current) clientRef.current.deactivate();
    };
    // eslint-disable-next-line
  }, []);

  const fetchNextPlayer = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        minMmr: mmrRange[0],
        maxMmr: mmrRange[1],
      };
      if (roleFilter) params.role = roleFilter;
      if (minWinrate > 0) params.minWinrate = minWinrate;
      const response = await axios.get(`${API_BASE}/api/swipe/next`, {
        withCredentials: true,
        params,
      });
      setCurrentPlayer(response.data.hasMore ? response.data.player : null);
      setCardKey(k => k + 1);
    } catch {
      setError('Не удалось загрузить игроков');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (isLike: boolean) => {
    if (!currentPlayer) return;
    try {
      const response = await axios.post(`${API_BASE}/api/swipe/action`, {
        targetSteamId: currentPlayer.steamId,
        isLike
      }, { withCredentials: true });
      if (response.data.isMatch) {
        setShowMatch(true);
        setTimeout(() => setShowMatch(false), 3200);
      }
      await fetchNextPlayer();
    } catch {
      setError('Ошибка свайпа');
    }
  };

  const handleMmrRangeChange = (_event: Event, newValue: number | number[]) => {
    setMmrRange(newValue as [number, number]);
  };

  const applyFilter = () => { fetchNextPlayer(); };

  if (loading) return (
    <Box className="centered-container">
      <Typography variant="h4" className="gold-text" sx={{ mb: 2 }}>⚔ Поиск тиммейтов...</Typography>
      <Typography variant="body1" sx={{ color: '#a7b0bd' }}>Скоро на арене появятся герои</Typography>
    </Box>
  );
  if (error) return (
    <Box className="centered-container">
      <Typography className="dire-text" variant="h5" sx={{ mb: 2 }}>{error}</Typography>
      <Button className="btn-dota-primary" onClick={() => window.location.reload()}>Попробовать снова</Button>
    </Box>
  );
  if (!currentPlayer) return (
    <Box className="centered-container">
      <Typography variant="h3" className="gold-text" sx={{ mb: 2 }}>✦ ИГРОКИ ЗАКОНЧИЛИСЬ ✦</Typography>
      <Typography variant="body1" sx={{ color: '#a7b0bd', mb: 4, maxWidth: 440 }}>
        Вы просмотрели всех доступных героев в выбранных фильтрах. Попробуйте расширить диапазон MMR,
        снять фильтр по роли или загляните позже — пул постоянно обновляется.
      </Typography>
      <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" justifyContent="center">
        <Button className="btn-dota-primary" onClick={() => navigate('/profile')}>Вернуться в базу</Button>
        <Button className="btn-dota-radiant" variant="contained" onClick={() => { setRoleFilter(null); setMinWinrate(0); setMmrRange([0, 10000]); fetchNextPlayer(); }}>
          Сбросить фильтры
        </Button>
      </Stack>
    </Box>
  );

  const mmrDisplay = currentPlayer.mmr ?? 0;
  const winrateDisplay = currentPlayer.winrate ?? 0;

  return (
    <Box className="card-container">
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/profile')}>Назад</Button>
        <Chip
          label={profile ? `Вы: ${profile.nickname}` : 'Загрузка...'}
          size="small"
          sx={{ background: 'rgba(46,204,113,0.1)', color: '#55efc4', border: '1px solid rgba(46,204,113,0.3)', fontWeight: 700 }}
        />
      </Box>

      {showMatch && (
        <Box className="fade-in" sx={{ textAlign: 'center', mb: 2 }}>
          <Alert
            severity="success"
            icon={<EmojiEvents />}
            sx={{
              border: '1px solid rgba(253,203,110,0.5)',
              background: 'linear-gradient(90deg, rgba(46,204,113,0.18), rgba(253,203,110,0.15), rgba(231,76,60,0.18))',
              boxShadow: '0 0 24px rgba(253,203,110,0.25)',
              '& .MuiAlert-message': { width: '100%' },
            }}
          >
            <Typography variant="h5" className="title-font" sx={{ color: '#fdcb6e', textAlign: 'center' }}>
              ⚔ ЭТО МЭТЧ! ⚔
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', mt: 0.5 }}>
              Вы и <b>{currentPlayer.nickname}</b> лайкнули друг друга — время общаться!
            </Typography>
            <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center', gap: 1.5 }}>
              <Button size="small" className="btn-dota-radiant" variant="contained" onClick={() => navigate('/matches')}>
                К чату →
              </Button>
            </Box>
          </Alert>
        </Box>
      )}

      <Snackbar open={!!notification} autoHideDuration={6000} onClose={() => setNotification(null)}>
        <Alert
          severity="success"
          sx={{ width: '100%', border: '1px solid rgba(46,204,113,0.4)' }}
          action={
            <Button color="inherit" size="small" onClick={() => {
              setNotification(null); navigate('/matches');
            }}>
              К мэтчам
            </Button>
          }
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      {/* Фильтр панель */}
      <Box className="dota-panel" sx={{ mb: 3, p: 2.5, position: 'relative' }}>
        <span className="dota-card-corner tl" />
        <span className="dota-card-corner tr" />
        <span className="dota-card-corner bl" />
        <span className="dota-card-corner br" />
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={showFilter ? 2.5 : 0} flexWrap="wrap" gap={1}>
          <Typography variant="h6" className="title-font" display="flex" alignItems="center" sx={{ color: '#fdcb6e' }}>
            <FilterList sx={{ mr: 1 }} />
            Фильтры поиска
          </Typography>
          <Button variant="outlined" onClick={() => setShowFilter(!showFilter)} size="small">
            {showFilter ? 'Скрыть' : 'Показать'}
          </Button>
        </Box>

        {showFilter && (
          <Stack spacing={2.5}>
            {/* Роли */}
            <Box>
              <Typography variant="caption" sx={{ color: '#8a95a4', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 10.5, mb: 1, display: 'block' }}>
                <MilitaryTech sx={{ fontSize: 13, mr: 0.6, verticalAlign: 'middle', color: '#c72731' }} />
                Фильтр по роли
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {roles.map((r) => {
                  const active = roleFilter === r.v;
                  return (
                    <Chip
                      key={r.v ?? 'all'}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, fontWeight: 700 }}>
                          <span>{r.icon}</span>
                          <span>{r.n}</span>
                        </Box>
                      }
                      onClick={() => setRoleFilter(r.v)}
                      sx={{
                        background: active
                          ? r.v
                            ? `linear-gradient(180deg, ${getRoleColor(r.v)}, rgba(0,0,0,0.4))`
                            : 'linear-gradient(180deg, rgba(253,203,110,0.35), rgba(0,0,0,0.3))'
                          : 'rgba(255,255,255,0.04)',
                        color: active ? '#fff' : '#a7b0bd',
                        border: active
                          ? `1px solid ${r.v ? getRoleColor(r.v) + '99' : 'rgba(253,203,110,0.6)'}`
                          : '1px solid rgba(255,255,255,0.08)',
                        fontWeight: 700,
                        px: 0.5,
                        py: 1.3,
                        height: 'auto',
                        fontSize: 13,
                        transition: 'all 0.2s ease',
                        boxShadow: active ? `0 4px 18px ${r.v ? getRoleColor(r.v) + '55' : 'rgba(253,203,110,0.3)'}` : 'none',
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>

            {/* Мин винрейт */}
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.8}>
                <Typography variant="caption" sx={{ color: '#8a95a4', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 10.5 }}>
                  <TrackChanges sx={{ fontSize: 13, mr: 0.6, verticalAlign: 'middle', color: '#2ecc71' }} />
                  Мин. винрейт
                </Typography>
                <Chip
                  label={`≥ ${minWinrate}%`}
                  size="small"
                  sx={{
                    color: '#fff',
                    fontWeight: 800,
                    background: getWinrateGradient(minWinrate),
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                />
              </Box>
              <Slider
                value={minWinrate}
                onChange={(_, v) => setMinWinrate(v as number)}
                step={1}
                min={0}
                max={70}
                marks={[{ value: 48, label: '48%' }, { value: 52, label: '52%' }, { value: 60, label: '60%' }]}
                valueLabelDisplay="auto"
                sx={{
                  color: getWinrateColor(minWinrate),
                  '& .MuiSlider-markLabel': { color: '#8a95a4', fontWeight: 700, fontSize: 11 },
                }}
              />
            </Box>

            {/* MMR диапазон */}
            <Box>
              <Typography gutterBottom sx={{ color: '#a7b0bd', fontWeight: 600, fontSize: 13 }}>
                Диапазон MMR: <b className="gold-text">{mmrRange[0].toLocaleString('ru-RU')}</b> — <b className="gold-text">{mmrRange[1].toLocaleString('ru-RU')}</b>
              </Typography>
              <Slider
                value={mmrRange}
                onChange={handleMmrRangeChange}
                valueLabelDisplay="auto"
                min={0}
                max={10000}
                step={50}
                sx={{ mb: 2, color: '#c72731' }}
              />

              <Box mb={2}>
                <Typography variant="body2" sx={{ color: '#a7b0bd', mb: 1 }} gutterBottom>Быстрые пресеты:</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {[
                    ['Новички', 0, 1000],
                    ['Любители', 1000, 2000],
                    ['Опытные', 2000, 3000],
                    ['Профи', 3000, 4000],
                    ['Элита', 4000, 10000],
                  ].map(([label, a, b]) => {
                    const active = mmrRange[0] === a && mmrRange[1] === b;
                    return (
                      <Chip
                        key={label as string}
                        label={label as string}
                        onClick={() => setMmrRange([a as number, b as number])}
                        size="small"
                        sx={{
                          background: active ? 'rgba(199,39,49,0.3)' : 'transparent',
                          color: active ? '#fff' : '#a7b0bd',
                          border: `1px solid ${active ? 'rgba(253,203,110,0.5)' : 'rgba(255,255,255,0.1)'}`,
                          fontWeight: 600,
                        }}
                      />
                    );
                  })}
                </Stack>
              </Box>

              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ color: '#a7b0bd' }}>Мин. MMR</InputLabel>
                  <Select value={mmrRange[0]} label="Мин. MMR" onChange={(e) => setMmrRange([Number(e.target.value), mmrRange[1]])} sx={{ color: '#fff' }}>
                    {[0, 500, 1000, 2000, 3000, 4000, 5000].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ color: '#a7b0bd' }}>Макс. MMR</InputLabel>
                  <Select value={mmrRange[1]} label="Макс. MMR" onChange={(e) => setMmrRange([mmrRange[0], Number(e.target.value)])} sx={{ color: '#fff' }}>
                    {[1000, 2000, 3000, 4000, 5000, 7000, 10000].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button className="btn-dota-primary" onClick={applyFilter}>Применить</Button>
              </Box>
            </Box>
          </Stack>
        )}
      </Box>

      {/* Сводка фильтров */}
      <Box textAlign="center" mb={2.5}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="center">
          <Chip
            label={`${mmrRange[0]}-${mmrRange[1]} MMR`}
            icon={<FilterList sx={{ fontSize: 14 }} />}
            size="small"
            sx={{ background: 'rgba(199,39,49,0.12)', color: '#ff8f94', border: '1px solid rgba(199,39,49,0.35)', fontWeight: 700 }}
          />
          {roleFilter && (
            <Chip
              label={getRoleName(roleFilter)}
              size="small"
              sx={{ color: '#fff', fontWeight: 800, background: `linear-gradient(135deg, ${getRoleColor(roleFilter)}, rgba(0,0,0,0.4))`, border: `1px solid ${getRoleColor(roleFilter)}99` }}
            />
          )}
          {minWinrate > 0 && (
            <Chip
              label={`WR ≥ ${minWinrate}%`}
              size="small"
              sx={{ background: getWinrateGradient(minWinrate), color: '#fff', fontWeight: 800, border: '1px solid rgba(255,255,255,0.18)' }}
            />
          )}
        </Stack>
      </Box>

      {/* Player card */}
      <Box
        key={cardKey}
        className="dota-panel swipe-card-enter swipe-card-enter-active"
        sx={{ mb: 3, overflow: 'hidden', position: 'relative' }}
      >
        <span className="dota-card-corner tl" />
        <span className="dota-card-corner tr" />
        <span className="dota-card-corner bl" />
        <span className="dota-card-corner br" />

        {/* Hero banner */}
        <Box
          sx={{
            height: { xs: 200, sm: 240 },
            position: 'relative',
            background: currentPlayer.avatarUrl
              ? `linear-gradient(180deg, rgba(11,14,19,0.15), rgba(11,14,19,0.82) 90%), url(${currentPlayer.avatarUrl}) center/cover`
              : 'linear-gradient(135deg, #0f1419, #1c242e 60%, #c7273140)',
            borderBottom: '1px solid rgba(253,203,110,0.2)',
            display: 'flex',
            alignItems: 'flex-end',
            p: 3,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={currentPlayer.avatarUrl}
              alt={currentPlayer.nickname}
              sx={{
                width: { xs: 72, sm: 88 },
                height: { xs: 72, sm: 88 },
                border: '3px solid rgba(253,203,110,0.55)',
                boxShadow: '0 0 18px rgba(253,203,110,0.35)',
                background: '#1c242e',
                fontSize: { xs: 28, sm: 34 },
                fontWeight: 900,
              }}
            >
              {currentPlayer.nickname?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h4" className="title-font" sx={{ color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.8)', fontSize: { xs: 26, sm: 32 } }}>
                {currentPlayer.nickname}
              </Typography>
              <Typography variant="body2" sx={{ color: '#d4d9df' }}>
                Steam ID: <span className="gold-text">{currentPlayer.steamId}</span>
              </Typography>
            </Box>
          </Stack>
        </Box>

        <CardContent sx={{ pt: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2.5}>
            <MedalDisplay
              rankTier={currentPlayer.rankTier}
              mmr={mmrDisplay}
              leaderboardRank={currentPlayer.leaderboardRank}
              size="lg"
            />
            <Stack spacing={0.6} alignItems="flex-end">
              <Typography variant="caption" sx={{ color: '#8a95a4', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 10.5 }}>
                Рейтинг MMR
              </Typography>
              <Typography sx={{
                fontWeight: 900,
                fontSize: 28,
                lineHeight: 1,
                fontFamily: "'Cinzel', serif",
                background: 'linear-gradient(180deg, #fff3c4, #fdcb6e 55%, #d99a2c)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                textShadow: '0 0 22px rgba(253,203,110,0.25)',
              }}>
                {mmrDisplay.toLocaleString('ru-RU')}
              </Typography>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
            <Chip
              label={getRoleName(currentPlayer.role)}
              sx={{
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                px: 0.8,
                py: 0.8,
                height: 'auto',
                background: `linear-gradient(135deg, ${getRoleColor(currentPlayer.role)}, rgba(0,0,0,0.4))`,
                boxShadow: `0 4px 18px ${getRoleColor(currentPlayer.role)}55`,
                border: `1px solid ${getRoleColor(currentPlayer.role)}99`,
                letterSpacing: '0.03em',
              }}
            />
            {typeof winrateDisplay === 'number' && winrateDisplay > 0 && (
              <Chip
                label={`${winrateDisplay.toFixed(1)}% Винрейт`}
                sx={{
                  color: '#fff',
                  fontWeight: 800,
                  background: getWinrateGradient(winrateDisplay),
                  border: '1px solid rgba(255,255,255,0.18)',
                  boxShadow: `0 4px 18px ${getWinrateColor(winrateDisplay)}55`,
                }}
              />
            )}
          </Stack>

          {winrateDisplay > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.8}>
                <Typography variant="caption" sx={{ color: '#8a95a4', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 10.5 }}>
                  Эффективность игрока
                </Typography>
                <Typography variant="caption" sx={{ color: getWinrateColor(winrateDisplay), fontWeight: 800 }}>
                  {winrateDisplay >= 60 ? '🔥 Отличные показатели' : winrateDisplay >= 52 ? '✓ Хорошая форма' : winrateDisplay >= 48 ? '• Средний уровень' : '⚠ Есть над чем поработать'}
                </Typography>
              </Box>
              <Box sx={{ height: 7, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
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
          )}

          <Divider sx={{ borderColor: 'rgba(253,203,110,0.15)', my: 1.5 }} />

          <Typography variant="body2" sx={{ color: '#c4cdd6', lineHeight: 1.7, fontSize: 14 }}>
            Кандидат в вашу команду для совместных каток. Оцените статсы, медаль, стиль игры и роль —
            решайте, тянете ли вы его в рейтинг или ищете кого-то покрепче.
          </Typography>
        </CardContent>
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 2, mb: 4 }}>
        <Tooltip title="Пропустить (Dislike)" placement="top">
          <IconButton
            size="large"
            aria-label="Dislike"
            sx={{
              width: 74,
              height: 74,
              color: '#fff',
              background: 'linear-gradient(180deg, #e74c3c, #7b191d)',
              border: '1px solid rgba(253,203,110,0.35)',
              boxShadow: '0 6px 24px rgba(231,76,60,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(180deg, #ff6b6b, #a12529)',
                transform: 'translateY(-3px) rotate(-4deg)',
                boxShadow: '0 10px 30px rgba(231,76,60,0.65)',
              },
              '&:active': { transform: 'translateY(0) rotate(0deg) scale(0.97)' },
            }}
            onClick={() => handleSwipe(false)}
          >
            <Close sx={{ fontSize: 36 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Лайк (Like)" placement="top">
          <IconButton
            size="large"
            aria-label="Like"
            sx={{
              width: 74,
              height: 74,
              color: '#fff',
              background: 'linear-gradient(180deg, #2ecc71, #0f5c34)',
              border: '1px solid rgba(253,203,110,0.35)',
              boxShadow: '0 6px 24px rgba(46,204,113,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(180deg, #55efc4, #1a8a52)',
                transform: 'translateY(-3px) rotate(4deg)',
                boxShadow: '0 10px 30px rgba(46,204,113,0.65)',
              },
              '&:active': { transform: 'translateY(0) rotate(0deg) scale(0.97)' },
            }}
            onClick={() => handleSwipe(true)}
          >
            <Favorite sx={{ fontSize: 36 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default SwipePage;
