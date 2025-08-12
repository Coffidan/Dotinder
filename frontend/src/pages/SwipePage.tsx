import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, Card, CardMedia, CardContent, IconButton, Chip, Stack, Alert, Snackbar, Button } from '@mui/material';
import { Favorite, Close, EmojiEvents } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useNavigate } from 'react-router-dom';

interface Player {
  steamId: string;
  nickname: string;
  mmr: number;
  avatarUrl?: string;
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

const SwipePage: React.FC = () => {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showMatch, setShowMatch] = useState<boolean>(false);
  const [notification, setNotification] = useState<any | null>(null);
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [connected, setConnected] = useState(false);
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
        params: { minMmr: 0, maxMmr: 10000 }
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

  const getMmrColor = (mmr: number) => {
    if (mmr < 1000) return '#8BC34A';
    if (mmr < 2000) return '#FFC107';
    if (mmr < 3000) return '#FF9800';
    if (mmr < 4000) return '#9C27B0';
    return '#F44336';
  };

  if (loading) return <Typography>Поиск игроков...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!currentPlayer) return <Typography variant="h5" gutterBottom>🎯 Все игроки просмотрены!</Typography>;

  return (
    <Box>
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
