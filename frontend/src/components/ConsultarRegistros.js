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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import EmailIcon from '@mui/icons-material/Email';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloseIcon from '@mui/icons-material/Close';

function ConsultarRegistros() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [nome, setNome] = useState('');
  const [opcoesNomes, setOpcoesNomes] = useState([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailDestino, setEmailDestino] = useState('');
  const [emailEnviando, setEmailEnviando] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const navigate = useNavigate();

  const buscarRegistros = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append('inicio', dataInicio);
      if (dataFim) params.append('fim', dataFim);
      if (nome) params.append('nome', nome);

      const response = await axios.get(`http://localhost:5000/registros?${params.toString()}`);
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
      const response = await axios.get(`http://localhost:5000/funcionarios/nome?nome=${nomeParcial}`);
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
      
      // Cabeçalho
      XLSX.utils.sheet_add_aoa(wb.Sheets.Sheet1, [
        ["Relatório Consolidado de Horas Trabalhadas"],
        [],
        ["Período:", `${dataInicio || 'Não informado'} a ${dataFim || 'Não informado'}`],
        [],
        ["Funcionário", "Horas Trabalhadas"]
      ], { origin: "A1" });

      // Dados
      const dados = registros.map(reg => ({
        "Funcionário": reg.funcionario || 'Desconhecido',
        "Horas Trabalhadas": reg.horas_trabalhadas || 'N/A'
      }));
      
      const ws = XLSX.utils.json_to_sheet(dados, { origin: "A6" });
      
      // Ajustar largura das colunas
      ws['!cols'] = [
        { wch: 30 }, // Funcionário
        { wch: 20 }  // Horas Trabalhadas
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Horas Trabalhadas");

      // Gerar arquivo
      const fileName = `Horas_Trabalhadas_${dataInicio}_a_${dataFim}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showSnackbar(`Relatório "${fileName}" gerado com sucesso!`, 'success');
    } catch (err) {
      console.error('Erro ao exportar:', err);
      showSnackbar('Erro ao gerar relatório', 'error');
    }
  };

  const enviarPorEmail = async () => {
    if (!emailDestino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDestino)) {
      showSnackbar('Por favor, insira um email válido', 'error');
      return;
    }

    setEmailEnviando(true);
    try {
      await axios.post('http://localhost:5000/enviar-email-consolidado', {
        registros: registros,
        email: emailDestino,
        periodo: {
          inicio: dataInicio,
          fim: dataFim
        }
      });
      
      showSnackbar('Relatório enviado com sucesso!', 'success');
      setEmailDialogOpen(false);
    } catch (err) {
      console.error('Erro ao enviar email:', err);
      showSnackbar('Erro ao enviar relatório', 'error');
    } finally {
      setEmailEnviando(false);
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
      }}
    >
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
          <Button
            variant="contained"
            startIcon={<EmailIcon />}
            onClick={() => setEmailDialogOpen(true)}
            disabled={registros.length === 0 || loading}
            sx={{
              backgroundColor: '#2196f3',
              '&:hover': { backgroundColor: '#1976d2' }
            }}
          >
            Enviar por Email
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
          />
          <TextField
            label="Data Fim"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            sx={{ minWidth: '180px' }}
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

        <Dialog open={emailDialogOpen} onClose={() => !emailEnviando && setEmailDialogOpen(false)}>
          <DialogTitle>
            Enviar Relatório Consolidado
            <IconButton
              aria-label="close"
              onClick={() => !emailEnviando && setEmailDialogOpen(false)}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
              disabled={emailEnviando}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Email Destinatário"
              type="email"
              fullWidth
              variant="outlined"
              value={emailDestino}
              onChange={(e) => setEmailDestino(e.target.value)}
              disabled={emailEnviando}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setEmailDialogOpen(false)}
              disabled={emailEnviando}
            >
              Cancelar
            </Button>
            <Button
              onClick={enviarPorEmail}
              disabled={emailEnviando || !emailDestino}
              color="primary"
              variant="contained"
            >
              {emailEnviando ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Enviando...
                </>
              ) : 'Enviar'}
            </Button>
          </DialogActions>
        </Dialog>
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