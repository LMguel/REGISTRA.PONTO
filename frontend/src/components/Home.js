import React from 'react';
import { Button, Box, Typography, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import logo from '../imagem/logo.png';

function Home() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f4f6f8',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      }}
    >
      <Paper
        elevation={6}
        sx={{
          padding: '40px',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center',
          backgroundColor: '#ffffff',
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
          REGISTRA PONTO
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
