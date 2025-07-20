import React, { useEffect, useState } from 'react';
import { Button, Box, Typography, Paper, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import logo from '../imagem/logo.png';

function Home() {
  const navigate = useNavigate();
  const [empresaNome, setEmpresaNome] = useState('');

  useEffect(() => {
    // Pega o token do localStorage e decodifica o nome da empresa
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        // Decodifica o payload do JWT (base64)
        const payload = JSON.parse(atob(token.split('.')[1]));
        setEmpresaNome(payload.empresa_nome || '');
      } catch (e) {
        setEmpresaNome('');
      }
    }
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e0f7fa, #80deea)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        position: 'relative',
      }}
    >
      {/* Botão de Login no canto superior esquerdo */}
      <IconButton
        onClick={() => navigate('/')}
        sx={{
          position: 'absolute',
          top: 24,
          left: 24,
          backgroundColor: '#fff',
          border: '2px solid #0288d1',
          color: '#0288d1',
          zIndex: 10,
          '&:hover': {
            backgroundColor: '#e3f2fd',
          },
        }}
        aria-label="Voltar para Login"
      >
        <ArrowBackIcon />
      </IconButton>

      <Paper
        elevation={6}
        sx={{
          padding: '40px',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center',
          background: '#fff',
          border: '2px solid #0288d1',
          boxShadow: '0 4px 20px rgba(2,136,209,0.10)',
        }}
      >
        {/* Logo */}
        <Box sx={{ mb: 2 }}>
          <img
            src={logo}
            alt="Logo"
            style={{
              height: '100px',
              width: '100px',
              borderRadius: '50%',
              border: '3px solid #0288d1',
            }}
          />
        </Box>

        {/* Título */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 'bold',
            color: '#0288d1',
            mb: 1,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {empresaNome || 'REGISTRA PONTO'}
        </Typography>

        {/* Subtítulo */}
        <Typography
          variant="subtitle1"
          sx={{
            color: '#555',
            mb: 4,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Sistema de Registro de Ponto com Reconhecimento Facial
        </Typography>

        {/* Botões */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate('/listar')}
            sx={{
              backgroundColor: '#0288d1',
              color: '#fff',
              textTransform: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 500,
              padding: '10px',
              '&:hover': {
                backgroundColor: '#0277bd',
              },
            }}
          >
            Listar Funcionários
          </Button>

          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate('/registrar')}
            sx={{
              backgroundColor: '#0288d1',
              color: '#fff',
              textTransform: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 500,
              padding: '10px',
              '&:hover': {
                backgroundColor: '#0277bd',
              },
            }}
          >
            Registrar Ponto
          </Button>

          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate('/consultar')}
            sx={{
              backgroundColor: '#0288d1',
              color: '#fff',
              textTransform: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 500,
              padding: '10px',
              '&:hover': {
                backgroundColor: '#0277bd',
              },
            }}
          >
            Consultar Registros
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default Home;
