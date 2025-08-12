import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Card, CardContent, Typography, Avatar, Button, Box, Chip, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';

interface Profile {
  nickname?: string;
  avatarUrl?: string;
  steamId?: string;
  mmr?: number;
  lastLogin?: string;
}

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mmr, setMmr] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get('http://localhost:8080/api/players/me', { withCredentials: true })
      .then((res) => {
        setProfile(res.data);
        setMmr(res.data.mmr || 0);
        setLoading(false);
      })
      .catch((err) => {
        setError('Не удалось загрузить профиль');
        setLoading(false);
        if (err.response && err.response.status === 401) {
          navigate('/login');
        }
      });
  }, [navigate]);

  const getRankColor = (mmr: number): string => {
    if (mmr < 1000) return '#8BC34A';
    if (mmr < 2000) return '#FFC107';
    if (mmr < 3000) return '#FF9800';
    if (mmr < 4000) return '#9C27B0';
    return '#F44336';
  };

  const handleMmrChange = (event: SelectChangeEvent<number>) => {
    const value = Number(event.target.value);
    if (value >= 0 && value <= 10000) {
      setMmr(value);
      setError(null);
    } else {
      setError('MMR должен быть от 0 до 10000');
    }
  };

  const saveMmr = () => {
    if (error || !profile) return;
    axios
      .put(`http://localhost:8080/api/players/update-mmr?mmr=${mmr}`, {}, { withCredentials: true })
      .then(() => {
        setSuccess('MMR сохранён!');
        setProfile({ ...profile, mmr });
      })
      .catch(() => setError('Ошибка сохранения MMR'));
  };

  if (loading) return <Typography>Загрузка...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!profile) return <Typography>Нет данных профиля</Typography>;

  return (
    <Box sx={{ maxWidth: 600, margin: 'auto', p: 2 }}>
      <Card>
        <CardContent>
          <Avatar src={profile.avatarUrl} sx={{ width: 100, height: 100, margin: 'auto' }}>
            {profile.nickname ? profile.nickname.charAt(0) : '?'}
          </Avatar>
          <Typography variant="h5" align="center">{profile.nickname ?? 'Нет ника'}</Typography>
          <Typography>Steam ID: {profile.steamId ?? ''}</Typography>
          <Chip label={`MMR: ${profile.mmr ?? 0}`} sx={{ backgroundColor: getRankColor(profile.mmr ?? 0), color: 'white' }} />
          <Typography>Последний вход: {profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : '—'}</Typography>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="mmr-select-label">Обновить MMR</InputLabel>
            <Select
              labelId="mmr-select-label"
              value={mmr}
              label="Обновить MMR"
              onChange={handleMmrChange}
              error={!!error}
            >
              {[...Array(101)].map((_, i) => (
                <MenuItem key={i * 100} value={i * 100}>{i * 100}</MenuItem>
              ))}
            </Select>
            {error && <Typography color="error" variant="caption">{error}</Typography>}
          </FormControl>
          <Button variant="contained" onClick={saveMmr} sx={{ mt: 1, width: '100%' }} disabled={!!error}>
            Сохранить
          </Button>
          {success && <Typography color="success.main" sx={{ mt: 1 }}>{success}</Typography>}
        </CardContent>
      </Card>

      <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/swipe')}>Свайпы</Button>
      <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/chat')}>Чат</Button>
      <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/matches')}>Матчи</Button>

      <Button variant="outlined" color="error" sx={{ mt: 2 }} onClick={() => {
        axios.post('http://localhost:8080/logout', {}, { withCredentials: true }).finally(() => navigate('/login'));
      }}>
        Выйти
      </Button>
    </Box>
  );
};

export default ProfilePage;
