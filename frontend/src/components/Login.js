import React, { useState } from 'react';
import { TextField, Button, Paper, Typography, Box, Snackbar, Alert } from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/token', {
        email,
        password
      });
      const { access_token } = response.data;
      if (access_token) {
        localStorage.setItem('access_token', access_token);
        setSnackbar({ open: true, message: 'Login realizado com sucesso!', severity: 'success' });
        setTimeout(() => navigate('/'), 1000);
      } else {
        setSnackbar({ open: true, message: 'Credenciais inválidas', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao fazer login', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0f7fa, #80deea)',
        padding: '20px',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: '400px', width: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#0288d1', textAlign: 'center', mb: 3 }}>
          Login
        </Typography>
        <TextField
          label="Email"
          type="email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Senha"
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          fullWidth
          onClick={handleLogin}
          disabled={loading || !email || !password}
          sx={{ backgroundColor: '#0288d1', color: '#fff', borderRadius: '8px', fontWeight: 500, py: 1 }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Login;
