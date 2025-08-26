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
import { PhotoCamera, Save, ArrowBack } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import api from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';

function EditarFuncionario() {
  const { id } = useParams();
  const [funcionario, setFuncionario] = useState({ nome: '', cargo: '', foto_url: '' });
  const [novaFoto, setNovaFoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  useEffect(() => {
    const carregarFuncionario = async () => {
      setLoading(true);
      try {
        const response = await api.get(`funcionarios/${id}`);
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

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNovaFoto(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nome', funcionario.nome);
      formData.append('cargo', funcionario.cargo);

      if (novaFoto) {
        formData.append('foto', novaFoto, novaFoto.name);
      }

      await api.put(`funcionarios/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
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
        position: 'relative',
      }}
    >
      {/* Botão de voltar para lista */}
      <IconButton
        onClick={() => navigate('/listar')}
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
        aria-label="Voltar para lista"
      >
        <ArrowBack />
      </IconButton>
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
                src={novaFoto ? URL.createObjectURL(novaFoto) : funcionario.foto_url}
                alt={funcionario.nome}
                sx={{ width: 150, height: 150, mb: 2 }}
              />
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoCamera />}
                sx={{ mt: 1 }}
              >
                Nova Foto
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleFotoChange}
                />
              </Button>
            </Box>

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

            <Box display="flex" justifyContent="center" mt={3}>
              <Button type="submit" variant="contained" startIcon={<Save />}>
                Salvar
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