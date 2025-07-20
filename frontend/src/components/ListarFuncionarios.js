import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Button,
  Avatar,
  Snackbar,
  Alert,
  Typography,
  Box,
  Stack,
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function ListarFuncionarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const navigate = useNavigate();

  const carregarFuncionarios = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get('http://localhost:5000/funcionarios', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setFuncionarios(response.data);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erro ao carregar funcionários',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const excluirFuncionario = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/funcionarios/${id}`);
      setSnackbar({
        open: true,
        message: 'Funcionário excluído com sucesso!',
        severity: 'success',
      });
      // Atualizar a lista de funcionários após a exclusão
      carregarFuncionarios();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Erro ao excluir funcionário',
        severity: 'error',
      });
    }
  };

  useEffect(() => {
    carregarFuncionarios();
  }, []);

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
      <Typography
        variant="h4"
        sx={{
          fontWeight: 'bold',
          color: '#004d40',
          textAlign: 'center',
          marginBottom: '20px',
        }}
      >
        Lista de Funcionários
      </Typography>

      <Stack direction="row" spacing={2} sx={{ marginBottom: '20px' }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/cadastrar')}
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
          Cadastrar Novo Funcionário
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/home')}
          sx={{
            padding: '10px 20px',
            fontSize: '1rem',
            borderRadius: '8px',
          }}
        >
          Voltar
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />
      ) : (
        <TableContainer component={Paper} sx={{ maxWidth: '90%', marginBottom: '20px', borderRadius: '16px', border: '2px solid #0288d1', background: '#fff', boxShadow: '0 4px 20px rgba(2,136,209,0.10)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Foto</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Cargo</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {funcionarios.map((funcionario) => (
                <TableRow key={funcionario.id} sx={{ background: '#f4f6f8', borderRadius: '8px' }}>
                  <TableCell>
                    <Avatar src={funcionario.foto_url} alt={funcionario.nome} />
                  </TableCell>
                  <TableCell>{funcionario.nome}</TableCell>
                  <TableCell>{funcionario.cargo}</TableCell>
                  <TableCell>
                    <Button
                      startIcon={<Edit />}
                      onClick={() => navigate(`/editar/${funcionario.id}`)}
                      sx={{ background: '#0288d1', color: '#fff', borderRadius: '8px', fontWeight: 500, px: 2, mr: 1, '&:hover': { background: '#0277bd' } }}
                    >
                      Editar
                    </Button>
                    <Button
                      startIcon={<Delete />}
                      color="error"
                      sx={{ ml: 1, borderRadius: '8px', fontWeight: 500, px: 2 }}
                      onClick={() => excluirFuncionario(funcionario.id)}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default ListarFuncionarios;