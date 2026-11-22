import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import LogoMark from './components/LogoMark';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SwipePage from './pages/SwipePage';
import ChatPage from './pages/ChatPage';
import MatchesPage from './pages/MatchesPage';

// Единый акцентный цвет для всего интерфейса
const ACCENT = '#c62828';

const dotaTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: ACCENT, light: '#e53935', dark: '#b71c1c', contrastText: '#ffffff' },
    secondary: { main: '#ececef', contrastText: '#0a0a0c' },
    background: { default: '#0a0a0c', paper: '#131317' },
    text: { primary: '#ececef', secondary: '#9b9ba6' },
    divider: 'rgba(255,255,255,0.08)',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    h1: { fontFamily: "'Cinzel', serif", fontWeight: 800 },
    h2: { fontFamily: "'Cinzel', serif", fontWeight: 800 },
    h3: { fontFamily: "'Cinzel', serif", fontWeight: 800 },
    h4: { fontFamily: "'Cinzel', serif", fontWeight: 700 },
    h5: { fontFamily: "'Cinzel', serif", fontWeight: 700 },
    h6: { fontFamily: "'Cinzel', serif", fontWeight: 700 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', background: '#131317', border: '1px solid rgba(255,255,255,0.08)' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: 'none', background: '#131317', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        outlined: {
          borderColor: 'rgba(255,255,255,0.16)',
          color: '#ececef',
          '&:hover': { borderColor: ACCENT, background: 'rgba(198,40,40,0.1)' },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { background: '#131317', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14 },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
});

const isAuthPage = (path: string) => path === '/' || path === '/login';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Закрываем мобильное меню при смене страницы
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

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
    } catch (ignore) { /* сессия всё равно будет сброшена на клиенте */ }
    navigate('/login');
    window.location.reload();
  };

  return (
    <nav className="dota-navbar">
      <div className="dota-navbar-inner">
        <button
          className="dota-brand"
          onClick={() => navigate('/profile')}
          style={{ border: 'none', background: 'none' }}
          aria-label="На главную"
        >
          <LogoMark />
          <span className="dota-brand-text">DOTINDER</span>
        </button>

        <button
          className="dota-nav-toggle"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Меню"
        >
          {menuOpen ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
        </button>

        <div className={`dota-nav-links ${menuOpen ? 'open' : ''}`}>
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
              {loggingOut ? 'Выходим...' : 'Выход'}
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
