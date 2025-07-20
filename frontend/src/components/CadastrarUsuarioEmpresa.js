import React, { useState } from 'react';
import { TextField, Button, Paper, Typography, Box, Snackbar, Alert } from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';

function CadastrarUsuarioEmpresa() {
  const [usuarioId, setUsuarioId] = useState('');
  const [email, setEmail] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const navigate = useNavigate();

  const handleCadastro = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/cadastrar_usuario_empresa', {
        usuario_id: usuarioId,
        email,
        empresa_nome: empresaNome,
        senha
      });
      if (response.data.success) {
        setSnackbar({ open: true, message: 'Usuário cadastrado com sucesso!', severity: 'success' });
        setTimeout(() => navigate('/'), 1200);
      } else {
        setSnackbar({ open: true, message: response.data.error || 'Erro ao cadastrar', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.error || 'Erro ao cadastrar', severity: 'error' });
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
          Cadastrar Usuário Empresa
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
          label="Email"
          type="email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Empresa"
          type="text"
          fullWidth
          value={empresaNome}
          onChange={(e) => setEmpresaNome(e.target.value)}
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
          onClick={handleCadastro}
          disabled={loading || !usuarioId || !email || !empresaNome || !senha}
          sx={{ backgroundColor: '#0288d1', color: '#fff', borderRadius: '8px', fontWeight: 500, py: 1 }}
        >
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </Button>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<HomeIcon />}
          sx={{ mt: 2, borderRadius: '8px' }}
          onClick={() => navigate('/')}
        >
          Voltar para Login
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

export default CadastrarUsuarioEmpresa;
