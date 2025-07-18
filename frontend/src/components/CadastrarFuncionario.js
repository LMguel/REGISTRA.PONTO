import React, { useState } from 'react';
import { TextField, Button, Paper, Typography, Box, Modal } from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CadastrarFuncionario() {
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const cadastrar = async () => {
    if (!foto) {
      setMensagem('Selecione ou arraste uma foto para cadastrar!');
      setModalOpen(true);
      return;
    }
    const formData = new FormData();
    formData.append('nome', nome);
    formData.append('cargo', cargo);
    formData.append('foto', foto, foto.name);
    try {
      const token = localStorage.getItem('access_token');
      await axios.post('http://localhost:5000/cadastrar_funcionario', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });
      setMensagem(`${nome} cadastrado com sucesso!`);
      setModalOpen(true);
      setTimeout(() => {
        setModalOpen(false);
        navigate('/listar');
      }, 5000);
    } catch (error) {
      setMensagem('Erro no cadastro: ' + (error.response?.data?.error || error.message));
      setModalOpen(true);
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

        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          sx={{
            border: '2px dashed #0288d1',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '20px',
            background: '#f5fafd',
            cursor: 'pointer',
          }}
          onClick={() => document.getElementById('foto-input').click()}
        >
          {preview ? (
            <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
          ) : (
            <Typography color="#0288d1">Arraste uma foto aqui ou clique para selecionar</Typography>
          )}
          <input
            id="foto-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFotoChange}
          />
        </Box>

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
            disabled={!nome || !cargo || !foto}
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