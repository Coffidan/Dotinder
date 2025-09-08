import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SwipePage from './pages/SwipePage';
import ChatPage from './pages/ChatPage';
import MatchesPage from './pages/MatchesPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/swipe" element={<SwipePage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/matches" element={<MatchesPage />} />
    </Routes>
  );
}

export default App;
