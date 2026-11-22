import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Box, TextField, Button, Typography, Chip, Stack, Divider } from '@mui/material';
import { ArrowBack, Send } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { API_BASE, WS_URL } from '../utils/dotaHelpers';

interface Message {
  senderId?: string;
  sender?: string;
  content: string;
  timestamp?: string;
  senderNickname?: string;
}

interface ProfileLite {
  steamId: string;
  nickname: string;
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const listRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<Client | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/players/me`, { withCredentials: true });
        if (cancelled) return;
        const me: ProfileLite = { steamId: res.data.steamId, nickname: res.data.nickname || 'Player' };
        setProfile(me);

        let history: Message[] = [];
        try {
          const hres = await axios.get(`${API_BASE}/api/chat/public-history`, { withCredentials: true });
          if (Array.isArray(hres.data)) {
            history = hres.data.map((m: any) => ({
              senderId: m.senderId,
              sender: m.senderId,
              senderNickname: m.senderId && me.steamId === m.senderId ? me.nickname : ('Игрок ' + (m.senderId || '?')),
              content: m.content,
              timestamp: m.timestamp ? (typeof m.timestamp === 'string' ? m.timestamp : new Date(m.timestamp as any).toISOString()) : undefined,
            }));
          }
        } catch (ignore) {}
        if (!cancelled) setMessages(history);

        const socket = new SockJS(WS_URL);
        const client = new Client({
          webSocketFactory: () => socket,
          reconnectDelay: 5000,
          debug: () => {},
          connectHeaders: { login: me.steamId },
          onConnect: () => {
            setConnected(true);
            client.subscribe('/topic/public', (msg) => {
              try {
                const chatMessage: Message = JSON.parse(msg.body);
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last && last.timestamp === chatMessage.timestamp && last.content === chatMessage.content && (last.senderId || last.sender) === (chatMessage.senderId || chatMessage.sender)) {
                    return prev;
                  }
                  return [...prev, chatMessage];
                });
              } catch (ignore) {}
            });
          },
          onStompError: (frame) => {
            console.warn('STOMP error in Chat:', frame.headers.message);
            setConnected(false);
          },
          onWebSocketClose: () => setConnected(false),
        });
        client.activate();
        clientRef.current = client;
        setLoadState('ready');
      } catch (err: any) {
        if (!cancelled) {
          if (err.response?.status === 401) navigate('/login');
          else setLoadState('error');
        }
      }
    };
    init();
    return () => {
      cancelled = true;
      if (clientRef.current) clientRef.current.deactivate();
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim() || !clientRef.current || !profile) return;
    const chatMessage: Message = {
      senderId: profile.steamId,
      sender: profile.nickname,
      senderNickname: profile.nickname,
      content: message,
      timestamp: new Date().toISOString(),
    };
    clientRef.current.publish({ destination: '/app/chat.sendMessage', body: JSON.stringify(chatMessage) });
    setMessage('');
  };

  if (loadState === 'loading') {
    return (
      <Box className="centered-container">
        <Typography variant="h4" sx={{ color: 'var(--text)' }}>Подключение к арене...</Typography>
      </Box>
    );
  }
  if (loadState === 'error') {
    return (
      <Box className="centered-container">
        <Typography className="dire-text" variant="h5" sx={{ mb: 2 }}>Ошибка подключения</Typography>
        <Button className="btn-dota-primary" onClick={() => window.location.reload()}>Попробовать снова</Button>
      </Box>
    );
  }

  const isMine = (msg: Message) => {
    if (!profile) return false;
    return (msg.senderId || msg.sender) === profile.steamId || msg.senderNickname === profile.nickname || msg.sender === profile.nickname;
  };

  return (
    <Box className="card-container">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/profile')}>Назад</Button>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {connected ? (
            <Chip label="Подключено к арене" sx={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)', fontWeight: 700 }} />
          ) : (
            <Chip label="Подключение..." sx={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-dim)', border: '1px solid var(--border)', fontWeight: 700 }} />
          )}
          <Chip label={`Вы: ${profile?.nickname || 'Player'}`} sx={{ background: 'var(--accent-soft)', color: 'var(--text)', border: '1px solid var(--accent-border)', fontWeight: 600 }} />
        </Stack>
      </Box>

      <Typography variant="h3" className="title-font" sx={{ mb: 1, color: 'var(--text)', textAlign: 'center', fontSize: { xs: 26, sm: 32 } }}>
        Общий чат
      </Typography>
      <Typography variant="body2" sx={{ color: 'var(--text-dim)', textAlign: 'center', mb: 3 }}>
        Поговорите с другими игроками арены • Обменяйтесь опытом и стратегиями • Сообщения доставляются в реальном времени
      </Typography>

      <Box
        className="dota-panel"
        sx={{ position: 'relative', mb: 2, overflow: 'hidden' }}
      >
        <Box
          ref={listRef}
          sx={{
            height: 460,
            overflowY: 'auto',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            background: 'var(--bg)',
          }}
        >
          {messages.length === 0 && (
            <Box sx={{ my: 'auto', textAlign: 'center', color: 'var(--text-dim)' }}>
              <Typography variant="h6" sx={{ mb: 1, color: 'var(--text)' }}>Чат пуст</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>Будьте первым, кто напишет что-нибудь в общий чат!</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-mute)' }}>
                Рекомендуется: поздороваться, представиться и указать вашу основную роль и MMR
              </Typography>
            </Box>
          )}
          {messages.map((msg, index) => {
            const mine = isMine(msg);
            const displayName = msg.senderNickname || msg.sender || 'Гость';
            return (
              <Box key={index} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <Box sx={{
                  maxWidth: '75%',
                  p: '11px 16px',
                  borderRadius: mine ? '15px 15px 3px 15px' : '15px 15px 15px 3px',
                  background: mine ? 'rgba(198,40,40,0.16)' : '#191920',
                  border: mine ? '1px solid rgba(198,40,40,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  wordBreak: 'break-word',
                  boxShadow: 'none',
                }}>
                  <Typography variant="caption" sx={{ color: mine ? '#e57373' : 'var(--text-dim)', fontWeight: 800, display: 'block', mb: 0.4, fontSize: 11.5, letterSpacing: '0.02em' }}>
                    {mine ? 'Вы' : displayName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text)', lineHeight: 1.5, fontSize: 15 }}>
                    {msg.content}
                  </Typography>
                  {msg.timestamp && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.7, color: 'var(--text-mute)', fontSize: 10.5, textAlign: mine ? 'right' : 'left' }}>
                      {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box
        className="dota-panel"
        sx={{ display: 'flex', gap: 1.5, p: 2.2, alignItems: 'center', position: 'relative', flexWrap: 'wrap' }}
      >
        <TextField
          fullWidth
          size="small"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Введите сообщение для арены (Enter — отправить)..."
          disabled={false}
          sx={{
            minWidth: 200,
            '& .MuiOutlinedInput-root': {
              color: 'var(--text)',
              background: 'rgba(255,255,255,0.03)',
              fieldset: { borderColor: 'var(--border)' },
              '&:hover fieldset': { borderColor: 'var(--border-strong)' },
              '&.Mui-focused fieldset': { borderColor: 'var(--accent)' },
            },
          }}
        />
        <Button
          className="btn-dota-primary"
          variant="contained"
          onClick={sendMessage}
          disabled={!message.trim()}
          endIcon={<Send />}
          disableElevation
        >
          Отправить
        </Button>
      </Box>

      <Divider sx={{ borderColor: 'var(--border)', my: 3 }} />
      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'var(--text-mute)', mb: 2 }}>
        Подключено к WebSocket STOMP endpoint <span className="gold-text">/ws</span> • топик <span className="radiant-text">/topic/public</span>
      </Typography>
    </Box>
  );
};

export default ChatPage;
