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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar
} from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import * as XLSX from 'xlsx';
import EmailIcon from '@mui/icons-material/Email';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';

function Registros() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [searchParams] = useSearchParams();
  const [funcionarioNome, setFuncionarioNome] = useState('');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailDestino, setEmailDestino] = useState('');
  const [emailEnviando, setEmailEnviando] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const navigate = useNavigate();
  
  const funcionarioId = searchParams.get('funcionario_id');

  const buscarRegistros = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append('inicio', dataInicio);
      if (dataFim) params.append('fim', dataFim);
      if (funcionarioId) params.append('funcionario_id', funcionarioId);

      // Buscar nome do funcionário
      if (funcionarioId) {
        const funcResponse = await api.get(`funcionarios/${funcionarioId}`);
        setFuncionarioNome(funcResponse.data.nome || 'Funcionário Desconhecido');
      }

      // Buscar registros
      const token = localStorage.getItem('access_token');
      const registrosResponse = await api.get(`registros?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setRegistros(registrosResponse.data);
    } catch (err) {
      console.error('Erro ao buscar registros:', err);
      setError('Erro ao carregar registros. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim, funcionarioId]);

  useEffect(() => {
    buscarRegistros();
  }, [buscarRegistros]);

  const calcularTotalHoras = () => {
    if (registros.length === 0) return '00:00';
    
    let totalSegundos = 0;
    let entrada = null;
    
    registros.forEach(reg => {
      const [, hora] = reg.data_hora.split(' '); // Removida a desestruturação não utilizada
      const [hh, mm, ss] = hora.split(':').map(Number);
      
      if (reg.tipo === 'entrada') {
        entrada = new Date();
        entrada.setHours(hh, mm, ss);
      } else if (reg.tipo === 'saída' && entrada) {
        const saida = new Date();
        saida.setHours(hh, mm, ss);
        totalSegundos += (saida - entrada) / 1000;
        entrada = null;
      }
    });
    
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  };

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Worksheet de Resumo
      const wsResumo = XLSX.utils.json_to_sheet([
        ["Relatório de Registros de Ponto"],
        [],
        ["Funcionário:", funcionarioNome],
        ["Período:", `${dataInicio || 'Não informado'} a ${dataFim || 'Não informado'}`],
        ["Total de Registros:", registros.length],
        ["Total de Horas Trabalhadas:", calcularTotalHoras()],
        [],
        ["Data", "Hora", "Tipo", "Observações"]
      ]);
      
      // Worksheet Detalhado
      const dadosDetalhados = registros.map(reg => {
        const [dataRegistro, horaRegistro] = reg.data_hora.split(' ');
        return {
          "Data": dataRegistro,
          "Hora": horaRegistro,
          "Tipo": reg.tipo,
          "Observações": ""
        };
      });
      
      XLSX.utils.sheet_add_json(wsResumo, dadosDetalhados, { origin: 'A8', skipHeader: true });

      // Ajustar largura das colunas
      wsResumo['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 30 }
      ];

      XLSX.utils.book_append_sheet(wb, wsResumo, "Registros");

      // Gerar arquivo
      const fileName = `Registros_${funcionarioNome.replace(/\s+/g, '_')}_${dataInicio}_a_${dataFim}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showSnackbar(`Arquivo ${fileName} gerado com sucesso!`, 'success');
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
      await api.post('enviar-email-registros', {
        funcionario: funcionarioNome,
        funcionario_id: funcionarioId,
        periodo: {
          inicio: dataInicio,
          fim: dataFim
        },
        registros: registros,
        email: emailDestino
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

  const handleDeleteRegistro = async (registroId) => {
    if (!window.confirm('Tem certeza que deseja deletar este registro?')) return;
    try {
      await api.delete(`registros/${registroId}`);
      setRegistros((prev) => prev.filter((r) => r.registro_id !== registroId));
      showSnackbar('Registro deletado com sucesso!', 'success');
    } catch (err) {
      showSnackbar('Erro ao deletar registro', 'error');
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
        onClick={() => navigate('/consultar')}
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
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'center' }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 'bold',
              color: '#004d40',
            }}
          >
            Registros de {funcionarioNome}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="Data Início"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
          <TextField
            label="Data Fim"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
          <Button 
            variant="contained" 
            onClick={buscarRegistros}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Filtrar'}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={exportToExcel}
            disabled={registros.length === 0}
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
            disabled={registros.length === 0}
            sx={{
              backgroundColor: '#2196f3',
              '&:hover': { backgroundColor: '#1976d2' }
            }}
          >
            Enviar por Email
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
                  <TableCell sx={{ fontWeight: 'bold' }}>Data</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Hora</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registros.length > 0 ? (
                  registros.map((registro) => {
                    const [data, hora] = registro.data_hora.split(' ');
                    // Formatar data para DD-MM-AAAA se não estiver
                    const dataFormatada = data.includes('-') && data.split('-')[0].length === 2 ? data : (() => {
                      const [yyyy, mm, dd] = data.split('-');
                      return `${dd}-${mm}-${yyyy}`;
                    })();
                    return (
                      <TableRow key={registro.registro_id}>
                        <TableCell>{dataFormatada}</TableCell>
                        <TableCell>{hora}</TableCell>
                        <TableCell>{registro.tipo}</TableCell>
                        <TableCell>
                          <IconButton color="error" onClick={() => handleDeleteRegistro(registro.registro_id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={emailDialogOpen} onClose={() => !emailEnviando && setEmailDialogOpen(false)}>
          <DialogTitle>
            Enviar Relatório por Email
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

export default Registros;