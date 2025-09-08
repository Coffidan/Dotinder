import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Card, CardContent, Typography, Avatar, Button, Box, Chip, Select, MenuItem, FormControl, InputLabel, Slider, Stack, Paper, Divider, Alert, CircularProgress
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { EmojiEvents, TrendingUp, Person, Refresh, AutoAwesome } from '@mui/icons-material';

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

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mmr, setMmr] = useState<number>(0);
  const [role, setRole] = useState<string>('carry');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showMmrEditor, setShowMmrEditor] = useState(false);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [updatingOpenDota, setUpdatingOpenDota] = useState(false);
  const [opendotaData, setOpendotaData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get('http://localhost:8080/api/players/me', { withCredentials: true })
      .then((res) => {
        setProfile(res.data);
        setMmr(res.data.mmr || 0);
        setRole(res.data.role || 'carry');
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

  const getMedalFromRankTier = (rankTier?: number): { name: string; color: string } | null => {
    if (!rankTier || rankTier <= 0) return null;
    const major = Math.floor(rankTier / 10);
    const minor = rankTier % 10;
    const names: Record<number, string> = {
      1: 'Herald',
      2: 'Guardian',
      3: 'Crusader',
      4: 'Archon',
      5: 'Legend',
      6: 'Ancient',
      7: 'Divine',
      8: 'Immortal'
    };
    const colors: Record<number, string> = {
      1: '#9E9E9E',
      2: '#4CAF50',
      3: '#8BC34A',
      4: '#03A9F4',
      5: '#3F51B5',
      6: '#9C27B0',
      7: '#F44336',
      8: '#FF5722'
    };
    const name = names[major] || 'Unknown';
    const color = colors[major] || '#607D8B';
    return { name: minor > 0 ? `${name} ${minor}` : name, color };
  };

  const getRankName = (mmr: number): string => {
    if (mmr < 1000) return 'Новичок';
    if (mmr < 2000) return 'Любитель';
    if (mmr < 3000) return 'Опытный';
    if (mmr < 4000) return 'Профи';
    return 'Элита';
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

  const getWinrateColor = (winrate: number): string => {
    if (winrate >= 60) return '#4CAF50';
    if (winrate >= 50) return '#FF9800';
    return '#F44336';
  };

  const handleMmrChange = (event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    if (value >= 0 && value <= 10000) {
      setMmr(value);
      setError(null);
    }
  };

  const handleMmrSelectChange = (event: SelectChangeEvent<number>) => {
    const value = Number(event.target.value);
    if (value >= 0 && value <= 10000) {
      setMmr(value);
      setError(null);
    } else {
      setError('MMR должен быть от 0 до 10000');
    }
  };

  const setQuickMmr = (value: number) => {
    setMmr(value);
    setError(null);
  };

  const saveMmr = () => {
    // Disabled: MMR is managed by OpenDota only
  };

  const saveRole = () => {
    if (!profile) return;
    axios
      .put(`http://localhost:8080/api/players/update-role?role=${role}`, {}, { withCredentials: true })
      .then(() => {
        setSuccess('Роль успешно обновлена!');
        setProfile({ ...profile, role });
        setShowRoleEditor(false);
        setTimeout(() => setSuccess(null), 3000);
      })
      .catch(() => setError('Ошибка сохранения роли'));
  };

  const updateFromOpenDota = async () => {
    if (!profile?.steamId) return;
    
    setUpdatingOpenDota(true);
    setError(null);
    
    try {
      const response = await axios.post('http://localhost:8080/api/players/update-opendota', {}, { withCredentials: true });
      setProfile(response.data);
      setSuccess('Данные успешно обновлены из OpenDota!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка обновления данных из OpenDota');
    } finally {
      setUpdatingOpenDota(false);
    }
  };

  const loadOpenDotaData = async () => {
    if (!profile?.steamId) return;
    
    try {
      const response = await axios.get('http://localhost:8080/api/players/opendota-data', { withCredentials: true });
      setOpendotaData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки данных OpenDota');
    }
  };

  if (loading) return (
    <Box className="centered-container">
      <Typography variant="h5">Загрузка...</Typography>
    </Box>
  );
  if (error) return (
    <Box className="centered-container">
      <Typography color="error" variant="h5">{error}</Typography>
    </Box>
  );
  if (!profile) return (
    <Box className="centered-container">
      <Typography variant="h5">Нет данных профиля</Typography>
    </Box>
  );

  return (
    <Box className="card-container">
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={3}>
            <Avatar src={profile.avatarUrl} sx={{ width: 120, height: 120 }}>
              {profile.nickname ? profile.nickname.charAt(0) : '?'}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h4" gutterBottom>{profile.nickname ?? 'Нет ника'}</Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Steam ID: {profile.steamId ?? ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Последний вход: {profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : '—'}
              </Typography>
              {profile.lastStatsUpdate && (
                <Typography variant="body2" color="text.secondary">
                  Последнее обновление статистики: {new Date(profile.lastStatsUpdate).toLocaleString()}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* OpenDota интеграция */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center">
            <AutoAwesome sx={{ mr: 1 }} />
            Интеграция с OpenDota
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Автоматически получайте актуальные данные о MMR и винрейте из OpenDota API
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button 
              variant="contained" 
              onClick={updateFromOpenDota}
              disabled={updatingOpenDota}
              startIcon={updatingOpenDota ? <CircularProgress size={20} /> : <Refresh />}
              sx={{ 
                backgroundColor: '#4CAF50',
                '&:hover': { backgroundColor: '#388E3C' }
              }}
            >
              {updatingOpenDota ? 'Обновление...' : 'Обновить из OpenDota'}
            </Button>
            <Button 
              variant="outlined" 
              onClick={loadOpenDotaData}
              startIcon={<AutoAwesome />}
            >
              Просмотреть данные OpenDota
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Текущий MMR и Винрейт */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center">
            <EmojiEvents sx={{ mr: 1 }} />
            Статистика игрока
          </Typography>
          
          {/* MMR */}
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom color="text.secondary">
              Рейтинг MMR
            </Typography>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Chip 
                label={`${profile.mmr ?? 0} MMR`} 
                sx={{ 
                  backgroundColor: getRankColor(profile.mmr ?? 0), 
                  color: 'white', 
                  fontSize: '1.2rem',
                  padding: '8px 16px'
                }} 
              />
              <Chip 
                label={getRankName(profile.mmr ?? 0)}
                variant="outlined"
                color="primary"
              />
            </Box>
          </Box>

          {/* Ранг OpenDota */}
          {profile.rankTier && (
            <Box mb={3}>
              <Typography variant="subtitle1" gutterBottom color="text.secondary">
                Ранг
              </Typography>
              {(() => {
                const medal = getMedalFromRankTier(profile.rankTier);
                return medal ? (
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Chip 
                      label={medal.name}
                      sx={{ backgroundColor: medal.color, color: 'white', fontSize: '1.1rem', padding: '6px 12px' }}
                    />
                    {profile.leaderboardRank && (
                      <Chip label={`Топ ${profile.leaderboardRank}`} color="secondary" variant="outlined" />
                    )}
                  </Box>
                ) : null;
              })()}
            </Box>
          )}

          {/* Винрейт */}
          {profile.winrate && (
            <Box mb={3}>
              <Typography variant="subtitle1" gutterBottom color="text.secondary">
                Винрейт
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Chip 
                  label={`${profile.winrate}%`} 
                  sx={{ 
                    backgroundColor: getWinrateColor(profile.winrate), 
                    color: 'white', 
                    fontSize: '1.2rem',
                    padding: '8px 16px'
                  }} 
                />
                <Typography variant="body2" color="text.secondary">
                  {profile.winrate >= 60 ? 'Отличный винрейт!' : 
                   profile.winrate >= 50 ? 'Хороший винрейт' : 'Есть куда расти'}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Ручное изменение MMR отключено */}
        </CardContent>
      </Card>

      {/* Текущая роль */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center">
            <Person sx={{ mr: 1 }} />
            Текущая роль
          </Typography>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Chip 
              label={getRoleName(profile.role ?? 'carry')} 
              sx={{ 
                backgroundColor: getRoleColor(profile.role ?? 'carry'), 
                color: 'white', 
                fontSize: '1.2rem',
                padding: '8px 16px'
              }} 
            />
          </Box>
          <Button 
            variant="outlined" 
            onClick={() => setShowRoleEditor(!showRoleEditor)}
            startIcon={<Person />}
          >
            {showRoleEditor ? 'Скрыть редактор' : 'Изменить роль'}
          </Button>
        </CardContent>
      </Card>

      {/* Редактор MMR */}
      {false && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
              <Person sx={{ mr: 1 }} />
              Обновить MMR
            </Typography>
            {/* Editor disabled */}
          </CardContent>
        </Card>
      )}

      {/* Редактор роли */}
      {showRoleEditor && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
              <Person sx={{ mr: 1 }} />
              Обновить роль
            </Typography>
            
            {/* Быстрые пресеты ролей */}
            <Box mb={3}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Выберите роль:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip 
                  label="Керри" 
                  onClick={() => setRole('carry')}
                  variant={role === 'carry' ? "filled" : "outlined"}
                  sx={{ backgroundColor: role === 'carry' ? '#FF5722' : undefined, color: role === 'carry' ? 'white' : undefined }}
                  size="small"
                />
                <Chip 
                  label="Мид" 
                  onClick={() => setRole('mid')}
                  variant={role === 'mid' ? "filled" : "outlined"}
                  sx={{ backgroundColor: role === 'mid' ? '#2196F3' : undefined, color: role === 'mid' ? 'white' : undefined }}
                  size="small"
                />
                <Chip 
                  label="Оффлейн" 
                  onClick={() => setRole('offlane')}
                  variant={role === 'offlane' ? "filled" : "outlined"}
                  sx={{ backgroundColor: role === 'offlane' ? '#4CAF50' : undefined, color: role === 'offlane' ? 'white' : undefined }}
                  size="small"
                />
                <Chip 
                  label="Саппорт" 
                  onClick={() => setRole('support')}
                  variant={role === 'support' ? "filled" : "outlined"}
                  sx={{ backgroundColor: role === 'support' ? '#FF9800' : undefined, color: role === 'support' ? 'white' : undefined }}
                  size="small"
                />
                <Chip 
                  label="Хард саппорт" 
                  onClick={() => setRole('hard_support')}
                  variant={role === 'hard_support' ? "filled" : "outlined"}
                  sx={{ backgroundColor: role === 'hard_support' ? '#9C27B0' : undefined, color: role === 'hard_support' ? 'white' : undefined }}
                  size="small"
                />
              </Stack>
            </Box>

            {/* Ручной выбор роли */}
            <Box display="flex" gap={2} alignItems="center" mb={2}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Выберите роль</InputLabel>
                <Select
                  value={role}
                  label="Выберите роль"
                  onChange={(e) => setRole(e.target.value as string)}
                >
                  <MenuItem value="carry">Керри</MenuItem>
                  <MenuItem value="mid">Мид</MenuItem>
                  <MenuItem value="offlane">Оффлейн</MenuItem>
                  <MenuItem value="support">Саппорт</MenuItem>
                  <MenuItem value="hard_support">Хард саппорт</MenuItem>
                </Select>
              </FormControl>
              <Button 
                variant="contained" 
                onClick={saveRole} 
                disabled={role === (profile.role ?? 'carry')}
                startIcon={<Person />}
              >
                Сохранить
              </Button>
            </Box>
            
            {error && <Typography color="error" variant="caption">{error}</Typography>}
            {success && <Typography color="success.main" sx={{ mt: 1 }}>{success}</Typography>}
          </CardContent>
        </Card>
      )}

      {/* Данные OpenDota */}
      {opendotaData && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Данные OpenDota
            </Typography>
            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
              <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(opendotaData, null, 2)}
              </pre>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Навигация */}
      <Paper sx={{ p: 3, textAlign: 'center', borderRadius: '20px', backgroundColor: '#f8f9fa' }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
          Главное меню
        </Typography>
        <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap" useFlexGap>
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate('/swipe')}
            sx={{ 
              minWidth: 120, 
              py: 1.5,
              borderRadius: '15px',
              backgroundColor: '#4CAF50',
              '&:hover': { backgroundColor: '#388E3C' }
            }}
          >
            Свайпы
          </Button>
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate('/chat')}
            sx={{ 
              minWidth: 120, 
              py: 1.5,
              borderRadius: '15px',
              backgroundColor: '#2196F3',
              '&:hover': { backgroundColor: '#1976D2' }
            }}
          >
            Чат
          </Button>
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate('/matches')}
            sx={{ 
              minWidth: 120, 
              py: 1.5,
              borderRadius: '15px',
              backgroundColor: '#FF9800',
              '&:hover': { backgroundColor: '#F57C00' }
            }}
          >
            Матчи
          </Button>
          <Button 
            variant="contained" 
            size="large"
            color="error" 
            onClick={() => {
              axios.post('http://localhost:8080/logout', {}, { withCredentials: true }).finally(() => navigate('/login'));
            }}
            sx={{ 
              minWidth: 120, 
              py: 1.5,
              borderRadius: '15px',
              '&:hover': { backgroundColor: '#D32F2F' }
            }}
          >
            Выйти
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ProfilePage;
