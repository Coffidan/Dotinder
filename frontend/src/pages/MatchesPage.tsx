import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import SockJS from 'sockjs-client';
import { Client, Message } from '@stomp/stompjs';
import {
  Box, Typography, CardContent, Avatar, Chip, Button, Dialog,
  DialogTitle, DialogContent, TextField, Stack, Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Send from '@mui/icons-material/Send';
import ForumIcon from '@mui/icons-material/Forum';
import {
  getMedalFromRankTier, getMedalFromMmr, getRoleName, getRoleColor,
  getWinrateColor, getWinrateGradient, API_BASE, WS_URL
} from '../utils/dotaHelpers';

interface Match {
  steamId: string;
  nickname: string;
  mmr: number;
  avatarUrl?: string;
  role?: string;
  winrate?: number;
  rankTier?: number;
  leaderboardRank?: number;
}
interface ChatMsg {
  senderId?: string;
  sender?: string;
  recipientId?: string;
  recipient?: string;
  content: string;
  timestamp?: string;
}
interface ProfileLite {
  steamId: string;
  nickname: string;
}

const MedalDisplay: React.FC<{ rankTier?: number; mmr?: number; leaderboardRank?: number; size?: 'sm' | 'md' }> = ({
  rankTier, mmr = 0, leaderboardRank, size = 'md',
}) => {
  const medal = rankTier ? getMedalFromRankTier(rankTier) : getMedalFromMmr(mmr);
  const { color, glow, major, minor } = medal;
  const stars = major >= 8 ? 0 : Math.max(0, Math.min(5, minor));
  const dotSize = size === 'sm' ? 22 : 30;

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
      />
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{
          fontWeight: 800,
          lineHeight: 1.1,
          fontSize: size === 'sm' ? 12.5 : 15,
          color,
          textShadow: `0 0 12px ${glow}`,
          fontFamily: "'Cinzel', serif",
          letterSpacing: '0.03em',
        }}>
          {medal.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: '3px', mt: 0.3 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: size === 'sm' ? 5 : 7,
                height: size === 'sm' ? 5 : 7,
                borderRadius: 2,
                background: i < stars ? `linear-gradient(180deg, ${color}, ${color}bb)` : 'rgba(255,255,255,0.06)',
                boxShadow: i < stars ? `0 0 6px ${glow}` : 'none',
                transform: 'rotate(45deg)',
              }}
            />
          ))}
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

const MatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [chatOpen, setChatOpen] = useState(false);
  const [currentPartner, setCurrentPartner] = useState<Match | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>({});

  const clientRef = useRef<Client | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/players/me`, { withCredentials: true });
        if (cancelled) return;
        const me = { steamId: res.data.steamId, nickname: res.data.nickname };
        setProfile(me);

        const response = await axios.get(`${API_BASE}/api/swipe/matches`, { withCredentials: true });
        if (cancelled) return;
        setMatches(response.data || []);
        setError(null);

        const socket = new SockJS(WS_URL);
        const client = new Client({
          webSocketFactory: () => socket,
          connectHeaders: { login: me.steamId },
          reconnectDelay: 5000,
          debug: () => {},
          onConnect: () => {
            setConnected(true);
            client.subscribe('/user/queue/private', (msg: Message) => {
              try {
                const received: ChatMsg = JSON.parse(msg.body);
                const from = received.senderId || received.sender;
                setChatMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last
                    && last.content === received.content
                    && (last.senderId || last.sender) === (received.senderId || received.sender)
                    && (last.recipientId || last.recipient) === (received.recipientId || received.recipient)) {
                    return prev;
                  }
                  return [...prev, received];
                });
                if (from && from !== me.steamId && (!currentPartner || currentPartner.steamId !== from)) {
                  setUnread(u => ({ ...u, [from]: (u[from] || 0) + 1 }));
                }
              } catch (ignore) {}
            });
          },
          onStompError: (frame) => {
            console.warn('STOMP error in Matches:', frame.headers.message);
            setConnected(false);
          },
          onWebSocketClose: () => setConnected(false),
        });
        client.activate();
        clientRef.current = client;
      } catch (err: any) {
        if (!cancelled) {
          if (err.response?.status === 401) navigate('/login');
          else setError('Ошибка загрузки или авторизации');
        }
      } finally {
        if (!cancelled) setLoading(false);
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
    if (chatOpen && listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  const openChat = async (partner: Match) => {
    setCurrentPartner(partner);
    setChatOpen(true);
    setChatMessages([]);
    setUnread(u => { const n = { ...u }; delete n[partner.steamId]; return n; });
    try {
      const resp = await axios.get(`${API_BASE}/api/chat/history?partnerId=${partner.steamId}`, { withCredentials: true });
      setChatMessages(resp.data || []);
    } catch {
      setChatMessages([]);
    }
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !clientRef.current || !currentPartner || !profile) return;
    const msg = {
      recipient: currentPartner.steamId,
      recipientId: currentPartner.steamId,
      content: chatInput,
      sender: profile.steamId,
      senderId: profile.steamId,
      senderNickname: profile.nickname,
      recipientNickname: currentPartner.nickname,
      timestamp: new Date().toISOString(),
    };
    clientRef.current.publish({ destination: '/app/chat.private', body: JSON.stringify(msg) });
    setChatMessages((prev) => [...prev, msg]);
    setChatInput('');
  };

  const orderedMatches = useMemo(() => {
    return [...matches].sort((a, b) => (b.mmr ?? 0) - (a.mmr ?? 0));
  }, [matches]);

  if (loading) return (
    <Box className="centered-container">
      <Typography variant="h4" className="gold-text">Загрузка мэтчей...</Typography>
    </Box>
  );
  if (error) return (
    <Box className="centered-container">
      <Typography className="dire-text" variant="h5" sx={{ mb: 2 }}>{error}</Typography>
      <Button className="btn-dota-primary" onClick={() => window.location.reload()}>Попробовать снова</Button>
    </Box>
  );
  if (matches.length === 0) return (
    <Box className="centered-container">
      <Typography variant="h3" className="gold-text" sx={{ mb: 2 }}>✦ НЕТ МЭТЧЕЙ ✦</Typography>
      <Typography variant="body1" sx={{ color: '#a7b0bd', mb: 4, maxWidth: 460, textAlign: 'center' }}>
        Ни один игрок пока не откликнулся. Вернитесь к свайпам и выберите себе ещё тиммейтов —
        удача обязательно улыбнётся!
      </Typography>
      <Button className="btn-dota-primary" onClick={() => navigate('/swipe')}>Перейти к свайпам</Button>
    </Box>
  );

  return (
    <Box className="card-container">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/profile')}>Назад</Button>
        <Stack direction="row" spacing={1} useFlexGap>
          <Chip
            label={`Всего: ${matches.length}`}
            size="small"
            sx={{ background: 'rgba(46,204,113,0.12)', color: '#55efc4', border: '1px solid rgba(46,204,113,0.35)', fontWeight: 800 }}
          />
          {connected ? (
            <Chip size="small" sx={{ background: 'rgba(46,204,113,0.18)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.4)', fontWeight: 700 }} label="WS • Online" />
          ) : (
            <Chip size="small" sx={{ background: 'rgba(253,203,110,0.15)', color: '#fdcb6e', border: '1px solid rgba(253,203,110,0.35)', fontWeight: 700 }} label="WS • Reconnect..." />
          )}
        </Stack>
      </Box>

      <Typography variant="h3" className="title-font" sx={{ mb: 1, color: '#fdcb6e', textAlign: 'center', fontSize: { xs: 26, sm: 32 } }}>
        ⚔ МОИ МЭТЧИ ⚔
      </Typography>
      <Typography variant="body2" sx={{ color: '#a7b0bd', textAlign: 'center', mb: 4 }}>
        Взаимных симпатий: <b className="gold-text">{matches.length}</b> • Нажмите «Открыть чат», чтобы начать общение
      </Typography>

      <Stack spacing={2.5}>
        {orderedMatches.map((match, idx) => {
          const wr = match.winrate ?? 0;
          const unreadCount = unread[match.steamId] || 0;
          return (
            <Box
              key={match.steamId}
              className="dota-panel card-slide-up"
              sx={{ position: 'relative', p: 2.5, display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap', animationDelay: `${idx * 60}ms` }}
            >
              <span className="dota-card-corner tl" />
              <span className="dota-card-corner tr" />
              <span className="dota-card-corner bl" />
              <span className="dota-card-corner br" />

              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={match.avatarUrl || undefined}
                  alt={match.nickname}
                  sx={{
                    width: { xs: 68, sm: 76 },
                    height: { xs: 68, sm: 76 },
                    flexShrink: 0,
                    border: '2px solid rgba(253,203,110,0.5)',
                    boxShadow: '0 0 14px rgba(46,204,113,0.3)',
                    background: '#1c242e',
                    fontWeight: 800,
                    fontSize: 26,
                  }}
                >
                  {match.nickname?.[0]}
                </Avatar>
                <Box
                  className="match-banner"
                  sx={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: '2px solid #0b0e13',
                    boxShadow: '0 0 10px rgba(46,204,113,0.7)',
                  }}
                />
              </Box>

              <CardContent sx={{ flex: 1, p: 0, minWidth: 240, '&:last-child': { pb: 0 } }}>
                <Box display="flex" alignItems="center" gap={1.5} mb={1.2} flexWrap="wrap">
                  <Typography variant="h6" className="title-font" sx={{ color: '#fff', lineHeight: 1.1 }}>
                    {match.nickname}
                    <Box component="span" className="radiant-text" sx={{ fontSize: 14, ml: 0.6 }}>✦</Box>
                  </Typography>
                  {unreadCount > 0 && (
                    <Chip
                      label={unreadCount}
                      size="small"
                      sx={{
                        minWidth: 24,
                        height: 22,
                        fontWeight: 900,
                        color: '#fff',
                        background: 'linear-gradient(180deg, #d93a3f, #8f1e22)',
                        border: '1px solid rgba(253,203,110,0.4)',
                        boxShadow: '0 0 12px rgba(199,39,49,0.55)',
                      }}
                    />
                  )}
                </Box>

                <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center" mb={1.5}>
                  <MedalDisplay rankTier={match.rankTier} mmr={match.mmr} leaderboardRank={match.leaderboardRank} size="sm" />
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={`${match.mmr ?? 0} MMR`}
                      size="small"
                      sx={{
                        background: 'linear-gradient(180deg, rgba(253,203,110,0.22), rgba(253,203,110,0.06))',
                        color: '#fdcb6e',
                        border: '1px solid rgba(253,203,110,0.35)',
                        fontWeight: 800,
                      }}
                    />
                    <Chip
                      label={getRoleName(match.role)}
                      size="small"
                      sx={{
                        color: '#fff',
                        fontWeight: 800,
                        background: `linear-gradient(135deg, ${getRoleColor(match.role)}, rgba(0,0,0,0.4))`,
                        border: `1px solid ${getRoleColor(match.role)}99`,
                      }}
                    />
                    {wr > 0 && (
                      <Chip
                        label={`${wr.toFixed(1)}% WR`}
                        size="small"
                        sx={{
                          color: '#fff',
                          fontWeight: 800,
                          background: getWinrateGradient(wr),
                          border: '1px solid rgba(255,255,255,0.18)',
                        }}
                      />
                    )}
                  </Stack>
                </Stack>

                <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center">
                  <Button
                    className="btn-dota-radiant"
                    variant="contained"
                    size="small"
                    startIcon={<ForumIcon />}
                    onClick={() => openChat(match)}
                    disableElevation
                  >
                    {unreadCount > 0 ? `Чат (${unreadCount})` : 'Открыть чат'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate('/swipe')}
                  >
                    Ещё свайпы
                  </Button>
                </Box>
              </CardContent>
            </Box>
          );
        })}
      </Stack>

      <Dialog
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{
          borderBottom: '1px solid rgba(253,203,110,0.25)',
          fontFamily: "'Cinzel', serif",
          color: '#fdcb6e',
          fontWeight: 700,
          background: 'linear-gradient(180deg, rgba(199,39,49,0.15), transparent)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
          py: 1.8,
        }}>
          <Avatar
            src={currentPartner?.avatarUrl || undefined}
            sx={{ width: 38, height: 38, border: '2px solid rgba(253,203,110,0.55)', fontWeight: 800, fontSize: 16 }}
          >
            {currentPartner?.nickname?.[0]}
          </Avatar>
          <Box flex={1} minWidth={100}>
            <Typography variant="h6" className="title-font" sx={{ fontSize: 18, color: '#fff', lineHeight: 1.1 }}>
              {currentPartner?.nickname}
            </Typography>
            <Stack direction="row" spacing={0.8} mt={0.3}>
              {connected ? (
                <Chip size="small" sx={{ background: 'rgba(46,204,113,0.2)', color: '#2ecc71', fontWeight: 700, height: 20, fontSize: 10.5 }} label="Online" />
              ) : (
                <Chip size="small" sx={{ background: 'rgba(231,76,60,0.2)', color: '#e74c3c', fontWeight: 700, height: 20, fontSize: 10.5 }} label="Reconnect..." />
              )}
              {currentPartner && (
                <Chip
                  size="small"
                  label={`${currentPartner.mmr ?? 0} MMR`}
                  sx={{ background: 'rgba(253,203,110,0.1)', color: '#fdcb6e', fontWeight: 700, height: 20, fontSize: 10.5, border: '1px solid rgba(253,203,110,0.25)' }}
                />
              )}
            </Stack>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box
            ref={listRef}
            sx={{
              height: 400,
              overflowY: 'auto',
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              background:
                'radial-gradient(circle at top right, rgba(46,204,113,0.08), transparent 55%), radial-gradient(circle at bottom left, rgba(199,39,49,0.08), transparent 55%), #0b0e13',
            }}
          >
            {chatMessages.length === 0 && (
              <Box sx={{ my: 'auto', textAlign: 'center', color: '#a7b0bd' }}>
                <Typography variant="h6" className="gold-text" sx={{ mb: 1 }}>Приватный чат</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>Напишите первое сообщение, чтобы начать общение</Typography>
                <Typography variant="caption" sx={{ color: '#7f8a99' }}>
                  Все сообщения доставляются через WebSocket в режиме реального времени
                </Typography>
              </Box>
            )}
            {chatMessages.map((msg, idx) => {
              const mine = (msg.senderId || msg.sender) === profile?.steamId;
              const other = (msg.senderId || msg.sender) === currentPartner?.steamId;
              const accent = mine ? 'radiant' : other ? 'gold' : 'gold';
              return (
                <Box key={idx} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <Box sx={{
                    maxWidth: '80%',
                    p: '9px 14px',
                    borderRadius: mine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: mine
                      ? 'linear-gradient(180deg, rgba(46,204,113,0.32), rgba(46,204,113,0.1))'
                      : 'linear-gradient(180deg, rgba(253,203,110,0.18), rgba(253,203,110,0.05))',
                    border: mine
                      ? '1px solid rgba(46,204,113,0.4)'
                      : '1px solid rgba(253,203,110,0.32)',
                    wordBreak: 'break-word',
                    boxShadow: mine ? '0 4px 14px rgba(46,204,113,0.15)' : '0 4px 14px rgba(0,0,0,0.25)',
                    position: 'relative',
                  }}>
                    <Typography variant="caption" sx={{
                      color: accent === 'radiant' ? '#2ecc71' : '#fdcb6e',
                      fontWeight: 800, display: 'block', mb: 0.3, fontSize: 11,
                      letterSpacing: '0.03em', textTransform: 'uppercase',
                    }}>
                      {mine ? 'Вы' : currentPartner?.nickname || 'Собеседник'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#e4e4e4', lineHeight: 1.5, fontSize: 14.5 }}>{msg.content}</Typography>
                    {msg.timestamp && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.6, color: '#7f8a99', fontSize: 10.5, textAlign: mine ? 'right' : 'left' }}>
                        {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, p: 2, background: '#0c1015', borderTop: '1px solid rgba(253,203,110,0.22)' }}>
            <TextField
              fullWidth
              size="small"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Напишите сообщение (Enter — отправить)..."
              disabled={false}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#e4e4e4',
                  background: 'rgba(255,255,255,0.03)',
                  fieldset: { borderColor: 'rgba(253,203,110,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(253,203,110,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'rgba(46,204,113,0.65)' },
                },
              }}
            />
            <Button
              className="btn-dota-primary"
              variant="contained"
              onClick={sendMessage}
              disabled={!chatInput.trim()}
              disableElevation
              endIcon={<Send />}
              sx={{ minWidth: 110 }}
            >
              Отпр.
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MatchesPage;
