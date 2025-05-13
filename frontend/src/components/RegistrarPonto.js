import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Button, Box, Typography, Paper, Modal } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function RegistrarPonto() {
  const webcamRef = useRef(null);
  const [mensagem, setMensagem] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const registrarPonto = async () => {
    const foto = webcamRef.current.getScreenshot();
    const formData = new FormData();

    const blob = await fetch(foto).then((res) => res.blob());
    formData.append('foto', blob, 'registro.jpg');

    try {
      const response = await axios.post('http://localhost:5000/registrar_ponto', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { funcionario, hora, tipo } = response.data;

      // Atualizar mensagem e abrir o modal
      setMensagem(`✅ Ponto Registrado! (${hora})\n${tipo.toUpperCase()} registrada para ${funcionario}.`);
      setModalOpen(true);

      // Fechar o modal automaticamente após 5 segundos
      setTimeout(() => setModalOpen(false), 5000);
    } catch (error) {
      setMensagem('❌ Erro: ' + (error.response?.data?.error || 'Falha no registro'));
      setModalOpen(true);

      // Fechar o modal automaticamente após 5 segundos
      setTimeout(() => setModalOpen(false), 5000);
    }
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
      <Paper elevation={3} sx={{ p: 3, maxWidth: '600px', width: '100%' }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            color: '#004d40',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          Registrar Ponto
        </Typography>

        <Box
          sx={{
            border: '4px solid #1976d2',
            borderRadius: '12px',
            padding: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            backgroundColor: '#f5f5f5',
            marginBottom: '20px',
          }}
        >
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width="100%"
            style={{
              borderRadius: '8px',
              display: 'block',
              objectFit: 'cover',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="contained"
            onClick={registrarPonto}
            sx={{
              background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
              color: '#fff',
              '&:hover': {
                background: 'linear-gradient(135deg, #0288d1, #01579b)',
              },
            }}
          >
            Registrar Ponto
          </Button>

          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            sx={{
              padding: '10px 20px',
              fontSize: '1rem',
              borderRadius: '8px',
            }}
          >
            Voltar
          </Button>
        </Box>
      </Paper>

      {/* Modal para exibir a mensagem */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(5px)', // Escurece o fundo
        }}
      >
        <Box
          sx={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              marginBottom: '10px',
              color: '#4caf50', // Verde para sucesso
            }}
          >
            {mensagem}
          </Typography>
        </Box>
      </Modal>
    </Box>
  );
}

export default RegistrarPonto;