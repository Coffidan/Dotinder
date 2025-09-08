import React from 'react';
import { Box, Typography, Paper, Container } from '@mui/material';
import LoginButton from '../components/LoginButton';

const LoginPage: React.FC = () => {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          textAlign: 'center'
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            borderRadius: '20px',
            backgroundColor: '#f8f9fa',
            width: '100%',
            maxWidth: 400
          }}
        >
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              color: '#1976d2',
              mb: 3
            }}
          >
            🎮 Dotinder
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ mb: 4 }}
          >
            Найди свою команду в Dota 2
          </Typography>
          <LoginButton />
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
