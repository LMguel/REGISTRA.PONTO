import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Autocomplete,
  Snackbar,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import * as XLSX from 'xlsx';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function ConsultarRegistros() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [nome, setNome] = useState('');
  const [opcoesNomes, setOpcoesNomes] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const navigate = useNavigate();

  const buscarRegistros = React.useCallback(async () => {
    // Validação de datas
    if (dataInicio && dataFim && dataInicio > dataFim) {
      setError('A data de início não pode ser maior que a data de fim.');
      setRegistros([]);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append('inicio', dataInicio);
      if (dataFim) params.append('fim', dataFim);
      if (nome) params.append('nome', nome);

      const token = localStorage.getItem('access_token');
      const response = await api.get(`registros?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setRegistros(response.data);
    } catch (err) {
      console.error('Erro ao buscar registros:', err);
      setError('Erro ao carregar registros. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim, nome]);

  const buscarNomes = async (nomeParcial) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.get(`funcionarios/nome?nome=${nomeParcial}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setOpcoesNomes(response.data);
    } catch (err) {
      console.error('Erro ao buscar nomes:', err);
    }
  };

  useEffect(() => {
    buscarRegistros();
  }, [buscarRegistros]);

  const handleClickFuncionario = (registro) => {
    if (registro && registro.funcionario_id) {
      navigate(`/registros?funcionario_id=${registro.funcionario_id}`);
    } else {
      showSnackbar('ID do funcionário não encontrado', 'error');
    }
  };

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      // Cabeçalho personalizado
      const wsData = [
        ["Relatório de Horas Trabalhadas"],
        ["Período:", `${dataInicio || 'Não informado'} a ${dataFim || 'Não informado'}`],
        [],
        ["Funcionário", "Horas Trabalhadas"]
      ];
      // Dados filtrados
      registros.forEach(reg => {
        // Se houver campo de data, formate para DD-MM-AAAA
        let funcionario = reg.funcionario || 'Desconhecido';
        let horas = reg.horas_trabalhadas || 'N/A';
        // Se houver campo data, formate
        if (reg.data) {
          let [yyyy, mm, dd] = reg.data.split('-');
          if (yyyy && mm && dd) {
            reg.data = `${dd}-${mm}-${yyyy}`;
          }
        }
        wsData.push([
          funcionario,
          horas
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [
        { wch: 30 },
        { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Horas Trabalhadas");
      const fileName = `Horas_Trabalhadas_${dataInicio.split('-').reverse().join('-')}_a_${dataFim.split('-').reverse().join('-')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showSnackbar(`Relatório "${fileName}" gerado com sucesso!`, 'success');
    } catch (err) {
      console.error('Erro ao exportar:', err);
      showSnackbar('Erro ao gerar relatório', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
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
      <IconButton
        onClick={() => navigate('/home')}
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
        aria-label="Voltar para Home"
      >
        <ArrowBackIcon />
      </IconButton>
      <Paper elevation={3} sx={{ p: 3, maxWidth: '90%', width: '100%' }}>   
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            color: '#004d40',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          Consulta de Registros
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={exportToExcel}
            disabled={registros.length === 0 || loading}
            sx={{
              backgroundColor: '#4caf50',
              '&:hover': { backgroundColor: '#388e3c' }
            }}
          >
            Exportar Excel
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Autocomplete
            freeSolo
            options={opcoesNomes}
            onInputChange={(event, value) => {
              setNome(value);
              if (value.length > 0) {
                buscarNomes(value);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Nome"
                fullWidth
                sx={{ minWidth: '250px' }}
              />
            )}
          />
          <TextField
            label="Data Início"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            sx={{ minWidth: '180px' }}
            inputProps={{ max: dataFim || undefined }}
          />
          <TextField
            label="Data Fim"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            sx={{ minWidth: '180px' }}
            inputProps={{ min: dataInicio || undefined }}
          />
          <Button 
            variant="contained" 
            onClick={buscarRegistros}
            disabled={loading}
            sx={{ minWidth: '120px' }}
          >
            {loading ? <CircularProgress size={24} /> : 'Filtrar'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Funcionário</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Horas Trabalhadas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registros.length > 0 ? (
                  registros.map((registro, index) => (
                    <TableRow key={index} hover>
                      <TableCell
                        sx={{ 
                          cursor: 'pointer', 
                          color: '#0288d1',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={() => handleClickFuncionario(registro)}
                      >
                        {registro.funcionario || 'Desconhecido'}
                      </TableCell>
                      <TableCell>{registro.horas_trabalhadas || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      {nome || dataInicio || dataFim 
                        ? 'Nenhum registro encontrado com os filtros aplicados' 
                        : 'Nenhum registro encontrado'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ConsultarRegistros;