import React, { useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Tooltip } from '@mui/material';
import axios from 'axios';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SwipePage from './pages/SwipePage';
import ChatPage from './pages/ChatPage';
import MatchesPage from './pages/MatchesPage';

const dotaTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#c72731',
      light: '#ef494e',
      dark: '#8f1e22',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#fdcb6e',
      light: '#ffe19a',
      dark: '#e1a336',
      contrastText: '#1a1a1a',
    },
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#15803d',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
    },
    warning: {
      main: '#f59e0b',
    },
    info: {
      main: '#3b82f6',
    },
    background: {
      default: '#07090d',
      paper: '#141923',
    },
    text: {
      primary: '#e8ecf1',
      secondary: '#a0aab8',
    },
    divider: 'rgba(253, 203, 110, 0.22)',
  },
  typography: {
    fontFamily: "'Rajdhani', -apple-system, BlinkMacSystemFont, sans-serif",
    h1: { fontFamily: "'Cinzel', serif", fontWeight: 900 },
    h2: { fontFamily: "'Cinzel', serif", fontWeight: 900 },
    h3: { fontFamily: "'Cinzel', serif", fontWeight: 900 },
    h4: { fontFamily: "'Cinzel', serif", fontWeight: 700 },
    h5: { fontFamily: "'Cinzel', serif", fontWeight: 700 },
    h6: { fontFamily: "'Cinzel', serif", fontWeight: 700 },
    button: { fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'linear-gradient(180deg, rgba(28, 36, 46, 0.9) 0%, rgba(16, 22, 30, 0.95) 100%)',
          border: '1px solid rgba(253, 203, 110, 0.22)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'linear-gradient(180deg, rgba(28, 36, 46, 0.9) 0%, rgba(16, 22, 30, 0.95) 100%)',
          border: '1px solid rgba(253, 203, 110, 0.24)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        outlined: {
          borderColor: 'rgba(253, 203, 110, 0.38)',
          color: '#fdcb6e',
          '&:hover': { borderColor: '#fdcb6e', background: 'rgba(253, 203, 110, 0.08)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, letterSpacing: '0.02em' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, #1c242e 0%, #10161e 100%)',
          border: '1px solid rgba(253, 203, 110, 0.3)',
          borderRadius: 14,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

const isAuthPage = (path: string) => path === '/' || path === '/login';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  if (isAuthPage(location.pathname)) return null;

  const links = [
    { label: 'Профиль', path: '/profile' },
    { label: 'Свайпы', path: '/swipe' },
    { label: 'Мэтчи', path: '/matches' },
    { label: 'Чат', path: '/chat' },
  ];

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await axios.post('http://localhost:8080/api/players/logout', {}, { withCredentials: true });
    } catch (ignore) {}
    navigate('/login');
    window.location.reload();
  };

  return (
    <nav className="dota-navbar">
      <div className="dota-navbar-inner">
        <button
          className="dota-brand"
          onClick={() => navigate('/profile')}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div className="dota-brand-logo">
            <div className="dota-brand-logo-inner">D</div>
          </div>
          <div className="dota-brand-text">DOTINDER</div>
        </button>

        <div className="dota-nav-links">
          {links.map((link) => (
            <button
              key={link.path}
              className={`dota-nav-btn ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </button>
          ))}
          <Tooltip title="Выйти из аккаунта" arrow placement="bottom">
            <button className="dota-logout-btn" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? '...' : 'Выход'}
            </button>
          </Tooltip>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <ThemeProvider theme={dotaTheme}>
      <CssBaseline />
      <Navbar />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/swipe" element={<SwipePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/matches" element={<MatchesPage />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
