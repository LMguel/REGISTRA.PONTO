import React, { useState, useRef } from 'react';
import { TextField, Button, Paper, Typography, Box, Modal } from '@mui/material';
import Webcam from 'react-webcam';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CadastrarFuncionario() {
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const webcamRef = useRef(null);
  const navigate = useNavigate();

  const cadastrar = async () => {
    const foto = webcamRef.current.getScreenshot();
    const formData = new FormData();
    formData.append('nome', nome);
    formData.append('cargo', cargo);

    const blob = await fetch(foto).then((res) => res.blob());
    formData.append('foto', blob, 'funcionario.jpg');

    try {
      await axios.post('http://localhost:5000/cadastrar_funcionario', formData);
      setMensagem(`${nome} cadastrado com sucesso!`);
      setModalOpen(true);

      // Fechar o modal automaticamente após 5 segundos
      setTimeout(() => {
        setModalOpen(false);
        navigate('/listar'); // Redirecionar para a lista de funcionários
      }, 5000);
    } catch (error) {
      setMensagem('Erro no cadastro: ' + error.response?.data?.error);
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
          Cadastrar Funcionário
        </Typography>

        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width="100%"
          style={{ marginBottom: '20px', borderRadius: '8px' }}
        />

        <TextField
          label="Nome"
          fullWidth
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          sx={{ marginBottom: '20px' }}
        />

        <TextField
          label="Cargo"
          fullWidth
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          sx={{ marginBottom: '20px' }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <Button
            variant="contained"
            onClick={cadastrar}
            disabled={!nome || !cargo}
            sx={{
              background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
              color: '#fff',
              '&:hover': {
                background: 'linear-gradient(135deg, #0288d1, #01579b)',
              },
            }}
          >
            Cadastrar
          </Button>

          <Button
            variant="outlined"
            onClick={() => navigate('/listar')}
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
          backdropFilter: 'blur(5px)',
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
              color: '#4caf50',
            }}
          >
            {mensagem}
          </Typography>
        </Box>
      </Modal>
    </Box>
  );
}

export default CadastrarFuncionario;