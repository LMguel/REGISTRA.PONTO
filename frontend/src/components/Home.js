import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import logo from '../imagem/logo.jpg';

function Home() {
  const navigate = useNavigate();

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
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '40px',
        }}
      >
        {/* Logo redonda */}
        <img
          src={logo}
          alt="Logo"
          style={{
            height: '120px',
            width: '120px',
            borderRadius: '50%',
            marginBottom: '10px',
            border: '4px solid #0288d1',
          }}
        />
        {/* Texto estilizado */}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            color: '#004d40',
            textAlign: 'center',
            fontFamily: "'Poppins', sans-serif",
            marginBottom: '20px',
          }}
        >
          Centro Educacional Positiva Idade
        </Typography>
        {/* Título principal */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 'bold',
            color: '#004d40',
            textAlign: 'center',
          }}
        >
          Bem-vindo ao Sistema de Registro de Ponto
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          variant="contained"
          onClick={() => navigate('/listar')}
          sx={{
            background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
            color: '#fff',
            padding: '10px 20px',
            fontSize: '1rem',
            borderRadius: '8px',
            '&:hover': {
              background: 'linear-gradient(135deg, #0288d1, #01579b)',
            },
          }}
        >
          Listar Funcionários
        </Button>
        <Button
          variant="contained"
          onClick={() => navigate('/registrar')}
          sx={{
            background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
            color: '#fff',
            padding: '10px 20px',
            fontSize: '1rem',
            borderRadius: '8px',
            '&:hover': {
              background: 'linear-gradient(135deg, #0288d1, #01579b)',
            },
          }}
        >
          Registrar Ponto
        </Button>
        <Button
          variant="contained"
          onClick={() => navigate('/consultar')}
          sx={{
            background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
            color: '#fff',
            padding: '10px 20px',
            fontSize: '1rem',
            borderRadius: '8px',
            '&:hover': {
              background: 'linear-gradient(135deg, #0288d1, #01579b)',
            },
          }}
        >
          Consultar Registros
        </Button>
      </Box>
    </Box>
  );
}

export default Home;