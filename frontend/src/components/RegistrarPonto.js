import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  TextField,
  MenuItem,
  Typography,
  Snackbar,
  Alert,
  Stack,
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function RegistrarPonto() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionarioId, setFuncionarioId] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState('entrada');
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
        message: 'Erro ao carregar funcionários',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  const registrarPontoManual = async () => {
    if (!funcionarioId || !data || !hora || !tipo) {
      setSnackbar({
        open: true,
        message: 'Preencha todos os campos!',
        severity: 'warning',
      });
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post('http://localhost:5000/registrar_ponto_manual', {
        funcionario_id: funcionarioId,
        data_hora: `${data} ${hora}`,
        tipo: tipo
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSnackbar({
        open: true,
        message: response.data.mensagem || 'Ponto registrado com sucesso!',
        severity: 'success',
      });
      setFuncionarioId('');
      setData('');
      setHora('');
      setTipo('entrada');
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao registrar ponto manual',
        severity: 'error',
      });
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
      <Paper elevation={3} sx={{ p: 4, maxWidth: '600px', width: '100%' }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 'bold', color: '#004d40', textAlign: 'center', marginBottom: 3 }}
        >
          Registro Manual de Ponto
        </Typography>

        <Stack spacing={2}>

          <TextField
            select
            label="Funcionário"
            value={funcionarioId}
            onChange={(e) => setFuncionarioId(e.target.value)}
            fullWidth
            disabled={loading || funcionarios.length === 0}
          >
            {funcionarios.map((func) => (
              <MenuItem key={func.id} value={func.id}>
                {func.nome}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            fullWidth
          >
            <MenuItem value="entrada">Entrada</MenuItem>
            <MenuItem value="saída">Saída</MenuItem>
          </TextField>

          <TextField
            label="Data"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={data}
            onChange={(e) => setData(e.target.value)}
            fullWidth
          />

          <TextField
            label="Hora"
            type="time"
            InputLabelProps={{ shrink: true }}
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            fullWidth
          />

          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Button
              variant="contained"
              onClick={registrarPontoManual}
              sx={{
                background: 'linear-gradient(135deg, #4fc3f7, #0288d1)',
                color: '#fff',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0288d1, #01579b)',
                },
              }}
            >
              Registrar Manualmente
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/home')}
              sx={{ padding: '10px 20px', fontSize: '1rem', borderRadius: '8px' }}
            >
              Voltar
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default RegistrarPonto;
