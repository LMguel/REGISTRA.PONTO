import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
  Box,
  Snackbar,
  Alert,
} from '@mui/material';
import { PhotoCamera, Save } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Webcam from 'react-webcam';

function EditarFuncionario() {
  const { id } = useParams();
  const [funcionario, setFuncionario] = useState({ nome: '', cargo: '', foto_url: '' });
  const [novaFoto, setNovaFoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [mostrarWebcam, setMostrarWebcam] = useState(false);
  const webcamRef = React.useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const carregarFuncionario = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:5000/funcionarios/${id}`);
        setFuncionario(response.data);
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Erro ao carregar funcionário',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    carregarFuncionario();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFuncionario({ ...funcionario, [name]: value });
  };

  const capturarFoto = () => {
    const foto = webcamRef.current.getScreenshot();
    setNovaFoto(foto); // Atualizar a nova foto
    setMostrarWebcam(false); // Fechar a webcam
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nome', funcionario.nome);
      formData.append('cargo', funcionario.cargo);

      if (novaFoto) {
        const blob = await fetch(novaFoto).then((res) => res.blob());
        formData.append('foto', blob, 'nova_foto.jpg'); // Enviar a nova foto
      }

      await axios.put(`http://localhost:5000/funcionarios/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSnackbar({ open: true, message: 'Funcionário atualizado com sucesso!', severity: 'success' });
      setTimeout(() => navigate('/listar'), 1500);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erro ao atualizar funcionário',
        severity: 'error',
      });
    } finally {
      setLoading(false);
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
        <Typography variant="h5" gutterBottom>
          Editar Funcionário
        </Typography>

        {loading ? (
          <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />
        ) : (
          <form onSubmit={handleSubmit}>
            <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
              <Avatar
                src={novaFoto || funcionario.foto_url} // Exibir a nova foto ou a existente
                alt={funcionario.nome}
                sx={{ width: 150, height: 150, mb: 2 }}
              />
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                onClick={() => setMostrarWebcam(!mostrarWebcam)}
              >
                {mostrarWebcam ? 'Fechar Webcam' : 'Nova Foto'}
              </Button>
            </Box>

            {mostrarWebcam && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  mb: 3,
                }}
              >
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width={300}
                  height={300}
                  style={{ borderRadius: '8px', marginBottom: '10px' }}
                />
                <Button variant="contained" onClick={capturarFoto}>
                  Capturar Foto
                </Button>
              </Box>
            )}

            <TextField
              label="Nome"
              fullWidth
              name="nome"
              value={funcionario.nome}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              label="Cargo"
              fullWidth
              name="cargo"
              value={funcionario.cargo}
              onChange={handleChange}
              margin="normal"
              required
            />

            <Box display="flex" justifyContent="space-between" mt={3}>
              <Button type="submit" variant="contained" startIcon={<Save />}>
                Salvar
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
                sx={{
                  background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0288d1, #01579b)',
                  },
                }}
              >
                Voltar
              </Button>
            </Box>
          </form>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default EditarFuncionario;