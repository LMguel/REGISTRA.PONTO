import React, { useState } from 'react';
import { TextField, Button, Paper, Typography, Box, Snackbar, Alert } from '@mui/material';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';


function Login() {
  const [usuarioId, setUsuarioId] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await api.post('login', {
        usuario_id: usuarioId,
        senha: senha
      });
      const { token } = response.data;
      if (token) {
        localStorage.setItem('access_token', token);
        setSnackbar({ open: true, message: 'Login realizado com sucesso!', severity: 'success' });
        setTimeout(() => navigate('/home'), 1000);
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
      <Paper elevation={6} sx={{ p: 4, maxWidth: 400, width: '100%', borderRadius: '16px', border: '2px solid #0288d1', background: '#fff', boxShadow: '0 4px 20px rgba(2,136,209,0.10)' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#0288d1', textAlign: 'center', mb: 3 }}>
          Login
        </Typography>
        <TextField
          label="Usuário ID"
          type="text"
          fullWidth
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Senha"
          type="password"
          fullWidth
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          fullWidth
          onClick={handleLogin}
          disabled={loading || !usuarioId || !senha}
          sx={{ backgroundColor: '#0288d1', color: '#fff', borderRadius: '8px', fontWeight: 500, py: 1 }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
        <Button
          variant="text"
          fullWidth
          sx={{ mt: 1, borderRadius: '8px', color: '#0288d1', fontWeight: 500 }}
          onClick={() => navigate('/cadastrar-usuario')}
        >
          Cadastrar Usuário Empresa
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
