import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, TextField, Button, Paper, Typography, CircularProgress, Chip } from '@mui/material';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const [nickname, setNickname] = useState<string>('Player');  // Начально "Player", обновим из профиля

  // Подключаемся к WebSocket
  useEffect(() => {
    const socket = new SockJS('http://localhost:8080/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe('/topic/public', (msg) => {
          const chatMessage = JSON.parse(msg.body);
          setMessages((prev) => [...prev, chatMessage]);
        });
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        setConnected(false);
      },
    });

    client.activate();
    setStompClient(client);

    return () => {
      client.deactivate();
    };
  }, []);

  // Загружаем ник из профиля
  useEffect(() => {
    axios.get('http://localhost:8080/api/players/me', { withCredentials: true })
      .then((response) => {
        const profile = response.data;
        setNickname(profile.nickname || 'Player');  // Берем ник из профиля или fallback
      })
      .catch((error) => {
        console.error('Error fetching profile for nickname:', error);
        setNickname('Player');  // Fallback при ошибке
      });
  }, []);

  const sendMessage = () => {
    if (message.trim() && stompClient && connected) {
      const chatMessage = {
        content: message,
        sender: nickname,  // Используем реальный ник
        timestamp: new Date().toISOString(),
      };
      stompClient.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(chatMessage),
      });
      setMessage('');
    } else {
      console.error('Не подключено к WebSocket или пустое сообщение');
    }
  };

  return (
    <Box sx={{ maxWidth: 600, margin: '20px auto', p: 2 }}>
      <Typography variant="h4" gutterBottom>Чат</Typography>
      
      <Paper sx={{ height: 400, p: 2, mb: 2, overflowY: 'auto' }}>
        {messages.map((msg, index) => (
          <Box key={index} mb={1}>
            <Typography variant="subtitle2">{msg.sender}:</Typography>
            <Typography variant="body1">{msg.content}</Typography>
          </Box>
        ))}
      </Paper>
      
      <Box display="flex" gap={1}>
        <TextField
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
              e.preventDefault();
            }
          }}
          placeholder="Введите сообщение..."
          disabled={!connected}
        />
        <Button variant="contained" onClick={sendMessage} disabled={!connected}>
          Отправить
        </Button>
      </Box>
      
      <Box mt={2} display="flex" alignItems="center">
        {connected ? (
          <Chip label="Подключено" color="success" />
        ) : (
          <Chip label="Подключение..." icon={<CircularProgress size={14} />} color="warning" />
        )}
      </Box>
    </Box>
  );
};

export default ChatPage;
