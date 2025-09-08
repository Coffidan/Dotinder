import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, Card, CardMedia, CardContent, IconButton, Chip, Stack, Alert, Snackbar, Button, Slider, FormControl, InputLabel, Select, MenuItem, Paper } from '@mui/material';
import { Favorite, Close, EmojiEvents, FilterList, ArrowBack } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useNavigate } from 'react-router-dom';

interface Player {
  steamId: string;
  nickname: string;
  mmr: number;
  avatarUrl?: string;
  role?: string;
  winrate?: number;
  rankTier?: number;
}

const SwipeCard = styled(Card)(({ theme }) => ({
  maxWidth: 600,
  margin: '20px auto',
  position: 'relative',
  borderRadius: '20px',
  overflow: 'hidden',
  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
}));

const ActionButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  gap: '30px',
  marginTop: '20px',
}));

const FilterPanel = styled(Paper)(({ theme }) => ({
  maxWidth: 600,
  margin: '20px auto',
  padding: '20px',
  borderRadius: '20px',
  backgroundColor: '#f5f5f5',
}));

const SwipePage: React.FC = () => {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showMatch, setShowMatch] = useState<boolean>(false);
  const [notification, setNotification] = useState<any | null>(null);
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [mmrRange, setMmrRange] = useState<[number, number]>([0, 10000]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      await fetchNextPlayer();

      const socket = new SockJS('http://localhost:8080/ws');
      const client = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        debug: (str) => console.log(str),
        onConnect: () => {
          setConnected(true);
          client.subscribe('/user/queue/notifications', (msg) => {
            const notif = JSON.parse(msg.body);
            if (notif.type === 'MATCH') {
              setNotification(notif);
            }
          });
        },
        onStompError: (frame) => {
          setError('Ошибка STOMP: ' + frame.headers.message);
          setConnected(false);
        },
      });
      client.activate();
      setStompClient(client);
    };

    loadData();

    return () => {
      if (stompClient) stompClient.deactivate();
    };
  }, []);

  const fetchNextPlayer = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8080/api/swipe/next', {
        withCredentials: true,
        params: { minMmr: mmrRange[0], maxMmr: mmrRange[1] }
      });
      if (response.data.hasMore) {
        setCurrentPlayer(response.data.player);
      } else {
        setCurrentPlayer(null);
      }
    } catch {
      setError('Не удалось загрузить игроков');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (isLike: boolean) => {
    if (!currentPlayer) return;
    try {
      const response = await axios.post('http://localhost:8080/api/swipe/action', {
        targetSteamId: currentPlayer.steamId,
        isLike
      }, { withCredentials: true });
      if (response.data.isMatch) {
        setShowMatch(true);
        setTimeout(() => setShowMatch(false), 3000);
      }
      await fetchNextPlayer();
    } catch {
      setError('Ошибка свайпа');
    }
  };

  const handleMmrRangeChange = (event: Event, newValue: number | number[]) => {
    setMmrRange(newValue as [number, number]);
  };

  const applyFilter = () => {
    setShowFilter(false);
    fetchNextPlayer();
  };

  const getMmrColor = (mmr: number) => {
    if (mmr < 1000) return '#8BC34A';
    if (mmr < 2000) return '#FFC107';
    if (mmr < 3000) return '#FF9800';
    if (mmr < 4000) return '#9C27B0';
    return '#F44336';
  };

  const getRoleName = (role: string): string => {
    switch (role) {
      case 'carry': return 'Керри';
      case 'mid': return 'Мид';
      case 'offlane': return 'Оффлейн';
      case 'support': return 'Саппорт';
      case 'hard_support': return 'Хард саппорт';
      default: return 'Керри';
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'carry': return '#FF5722';
      case 'mid': return '#2196F3';
      case 'offlane': return '#4CAF50';
      case 'support': return '#FF9800';
      case 'hard_support': return '#9C27B0';
      default: return '#FF5722';
    }
  };

  if (loading) return (
    <Box className="centered-container">
      <Typography variant="h5" sx={{ mb: 2 }}>🔍 Поиск игроков...</Typography>
    </Box>
  );
  if (error) return (
    <Box className="centered-container">
      <Typography color="error" variant="h5">{error}</Typography>
    </Box>
  );
  if (!currentPlayer) return (
    <Box className="centered-container">
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        🎯 Все игроки просмотрены!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Попробуйте изменить фильтры или загляните позже
      </Typography>
      <Button 
        variant="contained" 
        onClick={() => navigate('/profile')}
        sx={{ borderRadius: '15px' }}
      >
        Вернуться в профиль
      </Button>
    </Box>
  );

  return (
    <Box className="card-container">
      {/* Кнопка "Назад" */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBack />}
          onClick={() => navigate('/profile')}
        >
          Назад
        </Button>
      </Box>

      {showMatch && (
        <Alert severity="success" icon={<EmojiEvents />} sx={{ mb: 2, textAlign: 'center' }}>
          🎉 Это матч! Можете начать общаться!
        </Alert>
      )}
      <Snackbar open={!!notification} autoHideDuration={6000} onClose={() => setNotification(null)}>
        <Alert severity="success" sx={{ width: '100%' }}>
          {notification?.message}
          <Button color="inherit" size="small" onClick={() => {
            setNotification(null);
            navigate('/matches');
          }}>
            Перейти к матчам
          </Button>
        </Alert>
      </Snackbar>

      {/* Фильтр MMR */}
      <FilterPanel>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" display="flex" alignItems="center">
            <FilterList sx={{ mr: 1 }} />
            Фильтр MMR
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => setShowFilter(!showFilter)}
            size="small"
          >
            {showFilter ? 'Скрыть' : 'Показать'}
          </Button>
        </Box>
        
        {showFilter && (
          <Box>
            <Typography gutterBottom>
              Диапазон MMR: {mmrRange[0]} - {mmrRange[1]}
            </Typography>
            <Slider
              value={mmrRange}
              onChange={handleMmrRangeChange}
              valueLabelDisplay="auto"
              min={0}
              max={10000}
              step={100}
              sx={{ mb: 2 }}
            />
            
            {/* Быстрые пресеты */}
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Быстрые пресеты:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip 
                  label="Новички (0-1000)" 
                  onClick={() => setMmrRange([0, 1000])}
                  variant={mmrRange[0] === 0 && mmrRange[1] === 1000 ? "filled" : "outlined"}
                  color="primary"
                  size="small"
                />
                <Chip 
                  label="Любители (1000-2000)" 
                  onClick={() => setMmrRange([1000, 2000])}
                  variant={mmrRange[0] === 1000 && mmrRange[1] === 2000 ? "filled" : "outlined"}
                  color="primary"
                  size="small"
                />
                <Chip 
                  label="Опытные (2000-3000)" 
                  onClick={() => setMmrRange([2000, 3000])}
                  variant={mmrRange[0] === 2000 && mmrRange[1] === 3000 ? "filled" : "outlined"}
                  color="primary"
                  size="small"
                />
                <Chip 
                  label="Профи (3000-4000)" 
                  onClick={() => setMmrRange([3000, 4000])}
                  variant={mmrRange[0] === 3000 && mmrRange[1] === 4000 ? "filled" : "outlined"}
                  color="primary"
                  size="small"
                />
                <Chip 
                  label="Элита (4000+)" 
                  onClick={() => setMmrRange([4000, 10000])}
                  variant={mmrRange[0] === 4000 && mmrRange[1] === 10000 ? "filled" : "outlined"}
                  color="primary"
                  size="small"
                />
              </Stack>
            </Box>
            
            <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Мин. MMR</InputLabel>
                <Select
                  value={mmrRange[0]}
                  label="Мин. MMR"
                  onChange={(e) => setMmrRange([Number(e.target.value), mmrRange[1]])}
                >
                  <MenuItem value={0}>0</MenuItem>
                  <MenuItem value={1000}>1000</MenuItem>
                  <MenuItem value={2000}>2000</MenuItem>
                  <MenuItem value={3000}>3000</MenuItem>
                  <MenuItem value={4000}>4000</MenuItem>
                  <MenuItem value={5000}>5000</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Макс. MMR</InputLabel>
                <Select
                  value={mmrRange[1]}
                  label="Макс. MMR"
                  onChange={(e) => setMmrRange([mmrRange[0], Number(e.target.value)])}
                >
                  <MenuItem value={1000}>1000</MenuItem>
                  <MenuItem value={2000}>2000</MenuItem>
                  <MenuItem value={3000}>3000</MenuItem>
                  <MenuItem value={4000}>4000</MenuItem>
                  <MenuItem value={5000}>5000</MenuItem>
                  <MenuItem value={10000}>10000</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" onClick={applyFilter}>
                Применить
              </Button>
            </Box>
          </Box>
        )}
      </FilterPanel>

      {/* Индикатор текущего фильтра */}
      <Box textAlign="center" mb={2}>
        <Chip 
          label={`Фильтр: ${mmrRange[0]}-${mmrRange[1]} MMR`}
          color="secondary"
          variant="outlined"
          icon={<FilterList />}
        />
      </Box>

      <SwipeCard>
        <CardMedia
          component="img"
          height="300"
          image={currentPlayer.avatarUrl || '/default-avatar.png'}
          alt={currentPlayer.nickname}
        />
        <CardContent>
          <Typography variant="h5" gutterBottom>{currentPlayer.nickname}</Typography>
          <Stack direction="row" spacing={1} mb={2}>
            <Chip label={`${currentPlayer.mmr} MMR`} sx={{ backgroundColor: getMmrColor(currentPlayer.mmr), color: 'white', fontWeight: 'bold' }} />
            <Chip 
              label={getRoleName(currentPlayer.role || 'carry')} 
              sx={{ 
                backgroundColor: getRoleColor(currentPlayer.role || 'carry'), 
                color: 'white', 
                fontWeight: 'bold' 
              }} 
            />
            {currentPlayer.winrate && (
              <Chip 
                label={`${currentPlayer.winrate}% WR`} 
                sx={{ 
                  backgroundColor: currentPlayer.winrate >= 60 ? '#4CAF50' : 
                                     currentPlayer.winrate >= 50 ? '#FF9800' : '#F44336', 
                  color: 'white', 
                  fontWeight: 'bold' 
                }} 
              />
            )}
            {currentPlayer.rankTier && (
              <Chip label={`Tier ${currentPlayer.rankTier}`} variant="outlined" />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary">Steam ID: {currentPlayer.steamId}</Typography>
        </CardContent>
      </SwipeCard>

      <ActionButtons>
        <IconButton
          size="large"
          sx={{ backgroundColor: '#f44336', color: 'white', width: 60, height: 60, '&:hover': { backgroundColor: '#d32f2f' } }}
          onClick={() => handleSwipe(false)}
        >
          <Close fontSize="large" />
        </IconButton>
        <IconButton
          size="large"
          sx={{ backgroundColor: '#4caf50', color: 'white', width: 60, height: 60, '&:hover': { backgroundColor: '#388e3c' } }}
          onClick={() => handleSwipe(true)}
        >
          <Favorite fontSize="large" />
        </IconButton>
      </ActionButtons>
    </Box>
  );
};

export default SwipePage;
