import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SockJS from 'sockjs-client';
import { Client, Message } from '@stomp/stompjs';
import {
  Box, Typography, Card, CardContent, Avatar, Chip, Button, Dialog,
  DialogTitle, DialogContent, TextField
} from '@mui/material';
import { styled } from '@mui/material/styles';

const MatchCard = styled(Card)(({ theme }) => ({
  display: 'flex', alignItems: 'center', marginBottom: theme.spacing(2), padding: theme.spacing(2),
}));

interface Match { steamId: string; nickname: string; mmr: number; avatarUrl?: string; }
interface ChatMsg { senderId: string; recipientId: string; content: string; timestamp?: string; }

const MatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [currentPartner, setCurrentPartner] = useState<Match | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const [profile, setProfile] = useState<{ steamId: string, nickname: string } | null>(null);

  // Сначала грузим профиль, потом только websocket!
  useEffect(() => {
    const init = async () => {
      try {
        const res = await axios.get('http://localhost:8080/api/players/me', { withCredentials: true });
        setProfile({ steamId: res.data.steamId, nickname: res.data.nickname });
        // Только после профиля:
        const response = await axios.get('http://localhost:8080/api/swipe/matches', { withCredentials: true });
        setMatches(response.data);
        setError(null);

        // Теперь WS — только когда есть steamId!
        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
          webSocketFactory: () => socket,
          connectHeaders: { login: res.data.steamId }, // не обязательно, но good practice
          reconnectDelay: 5000,
          onConnect: () => {
            setConnected(true);
            client.subscribe('/user/queue/private', (msg: Message) => {
              const received = JSON.parse(msg.body);
              setChatMessages((prev) => [...prev, received]);
            });
          },
          onStompError: (frame) => {
            setError('Ошибка STOMP: ' + frame.headers.message || '');
            setConnected(false);
          },
        });
        client.activate();
        setStompClient(client);
      } catch {
        setError('Ошибка загрузки или авторизации');
      } finally {
        setLoading(false);
      }
    };
    init();

    return () => { if (stompClient) stompClient.deactivate(); };
    // eslint-disable-next-line
  }, []);

  const openChat = async (partner: Match) => {
    setCurrentPartner(partner);
    setChatOpen(true);
    setChatMessages([]);
    // Загрузка истории (REST выдаст только свою переписку)
    try {
      const resp = await axios.get(`http://localhost:8080/api/chat/history?partnerId=${partner.steamId}`, { withCredentials: true });
      setChatMessages(resp.data);
    } catch {
      setError('Ошибка загрузки истории чата');
    }
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !stompClient || !connected || !currentPartner || !profile) return;
    const msg = {
      recipient: currentPartner.steamId,
      content: chatInput,
      sender: profile.steamId,
      senderId: profile.steamId
    };
    stompClient.publish({ destination: '/app/chat.private', body: JSON.stringify(msg) });
    setChatMessages((prev) => [...prev, { senderId: profile.steamId, recipientId: currentPartner.steamId, content: chatInput }]);
    setChatInput('');
  };

  if (loading) return <Typography>Загрузка...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (matches.length === 0) return <Typography>Нет матчей пока. Продолжайте свайпать!</Typography>;

  return (
    <Box sx={{ maxWidth: 600, margin: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom>Мои матчи</Typography>
      {matches.map((match) => (
        <MatchCard key={match.steamId}>
          <Avatar src={match.avatarUrl || '/default-avatar.png'} alt={match.nickname} sx={{ mr: 2 }} />
          <CardContent>
            <Typography variant="h6">{match.nickname}</Typography>
            <Chip label={`${match.mmr} MMR`} color="primary" sx={{ mt: 1 }} />
            <Button variant="contained" sx={{ mt: 1 }} onClick={() => openChat(match)}>
              Чат
            </Button>
          </CardContent>
        </MatchCard>
      ))}

      <Dialog open={chatOpen} onClose={() => setChatOpen(false)}>
        <DialogTitle>Чат с {currentPartner?.nickname}</DialogTitle>
        <DialogContent>
          <Box sx={{ height: 300, overflowY: 'auto', mb: 2 }}>
            {chatMessages.map((msg, idx) => (
              <Typography key={idx} align={msg.senderId === profile?.steamId ? "right" : "left"}>
                <b>{msg.senderId === profile?.steamId ? "Вы" : currentPartner?.nickname}:</b> {msg.content}
              </Typography>
            ))}
          </Box>
          <TextField
            fullWidth
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Введите сообщение..."
            disabled={!connected}
          />
          <Button onClick={sendMessage} disabled={!connected}>Отправить</Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MatchesPage;
