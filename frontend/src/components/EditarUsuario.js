import React, { useEffect, useState } from 'react';
import { TextField, Button, Paper, Typography, Box, Snackbar, Alert, CircularProgress, List, ListItem, ListItemText, Divider, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function EditarUsuario() {
  const [usuarioId, setUsuarioId] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [usuariosEmpresa, setUsuariosEmpresa] = useState([]);
  const [editandoUsuario, setEditandoUsuario] = useState(null); // Para editar outro usuário
  const navigate = useNavigate();

  useEffect(() => {
    // Pega dados do token
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsuarioId(payload.usuario_id || '');
        setEmpresaNome(payload.empresa_nome || '');
        setEmpresaId(payload.empresa_id || '');
        // Buscar email do backend
        api.get(`/usuario_empresa/${payload.usuario_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          setEmail(res.data.email || '');
          // Buscar todos os usuários da empresa, incluindo o próprio
          api.get(`/usuarios_empresa?empresa_id=${payload.empresa_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res2 => {
            let lista = res2.data || [];
            // Garante que o próprio usuário também está na lista
            if (!lista.find(u => u.usuario_id === payload.usuario_id)) {
              lista = [
                { usuario_id: payload.usuario_id, email: res.data.email || '', empresa_id: payload.empresa_id, empresa_nome: payload.empresa_nome },
                ...lista
              ];
            }
            setUsuariosEmpresa(lista);
          }).catch(() => {
            // Se falhar, mostra só o próprio
            setUsuariosEmpresa([
              { usuario_id: payload.usuario_id, email: res.data.email || '', empresa_id: payload.empresa_id, empresa_nome: payload.empresa_nome }
            ]);
          });
        }).catch(() => {
          // Se falhar, busca só a lista de usuários
          api.get(`/usuarios_empresa?empresa_id=${payload.empresa_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res2 => {
            let lista = res2.data || [];
            if (!lista.find(u => u.usuario_id === payload.usuario_id)) {
              lista = [
                { usuario_id: payload.usuario_id, email: '', empresa_id: payload.empresa_id, empresa_nome: payload.empresa_nome },
                ...lista
              ];
            }
            setUsuariosEmpresa(lista);
          }).catch(() => {
            setUsuariosEmpresa([
              { usuario_id: payload.usuario_id, email: '', empresa_id: payload.empresa_id, empresa_nome: payload.empresa_nome }
            ]);
          });
        });
      } catch (e) {}
    }
  }, []);

  // Se estiver editando outro usuário, preenche os campos
  useEffect(() => {
    if (editandoUsuario) {
      setUsuarioId(editandoUsuario.usuario_id || '');
      setEmpresaNome(editandoUsuario.empresa_nome || '');
      setEmpresaId(editandoUsuario.empresa_id || '');
      setEmail(editandoUsuario.email || '');
      setSenha('');
    }
  }, [editandoUsuario]);

  const handleSalvar = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      await api.put(`/usuario_empresa/${usuarioId}`, {
        empresa_nome: empresaNome,
        empresa_id: empresaId,
        email,
        senha: senha || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnackbar({ open: true, message: 'Dados atualizados com sucesso!', severity: 'success' });
      setSenha('');
      // Atualiza lista de usuários após edição
      api.get(`/usuarios_empresa?empresa_id=${empresaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        let lista = res.data || [];
        // Garante que o próprio usuário também está na lista
        if (!lista.find(u => u.usuario_id === usuarioId)) {
          lista = [
            { usuario_id: usuarioId, email: email, empresa_id: empresaId, empresa_nome: empresaNome },
            ...lista
          ];
        }
        setUsuariosEmpresa(lista);
      });
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao atualizar dados', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0f7fa, #80deea)',
        padding: '20px',
        position: 'relative',
        gap: 4,
      }}
    >
      {/* Botão de voltar no canto superior esquerdo */}
      <Box sx={{ position: 'absolute', top: 24, left: 24, zIndex: 10 }}>
        <Button
          onClick={() => navigate(-1)}
          sx={{
            minWidth: 0,
            p: 1.2,
            backgroundColor: '#fff',
            border: '2px solid #0288d1',
            color: '#0288d1',
            borderRadius: '50%',
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#e3f2fd' },
          }}
          aria-label="Voltar"
        >
          <ArrowBackIcon />
        </Button>
      </Box>
      <Paper elevation={6} sx={{ p: 4, maxWidth: 420, width: 420, borderRadius: '16px', border: '2px solid #0288d1', background: '#fff', boxShadow: '0 4px 20px rgba(2,136,209,0.10)', position: 'relative' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#0288d1', textAlign: 'center', mb: 3 }}>
          Editar Dados do Usuário/Admin
        </Typography>
        <TextField label="Usuário ID" value={usuarioId} onChange={e => setUsuarioId(e.target.value)} fullWidth sx={{ mb: 2 }} />
        <TextField label="Empresa" value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} fullWidth sx={{ mb: 2 }} />
        <TextField label="Empresa ID" value={empresaId} onChange={e => setEmpresaId(e.target.value)} fullWidth sx={{ mb: 2 }} />
        <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} fullWidth sx={{ mb: 2 }} />
        <TextField label="Nova Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} fullWidth sx={{ mb: 2 }} />
        <Button
          variant="contained"
          fullWidth
          onClick={handleSalvar}
          disabled={loading}
          sx={{ backgroundColor: '#0288d1', color: '#fff', borderRadius: '8px', fontWeight: 500, py: 1 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Salvar'}
        </Button>
      </Paper>
      <Paper elevation={2} sx={{ p: 4, maxWidth: 420, width: 420, minWidth: 420, maxHeight: 500, overflow: 'auto', background: '#f4f6f8', borderRadius: '16px', border: '2px solid #0288d1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ color: '#0288d1', mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
          Usuários da Empresa
        </Typography>
        <List sx={{ width: '100%' }}>
          {usuariosEmpresa.map((usuario) => (
            <React.Fragment key={usuario.usuario_id}>
              <ListItem
                button
                selected={usuario.usuario_id === usuarioId}
                onClick={() => setEditandoUsuario(usuario)}
                sx={{
                  borderRadius: '8px',
                  mb: 1,
                  background: usuario.usuario_id === usuarioId ? '#e3f2fd' : '#fff',
                  border: usuario.usuario_id === usuarioId ? '2px solid #0288d1' : '1px solid #e0e0e0',
                  boxShadow: usuario.usuario_id === usuarioId ? '0 2px 8px rgba(2,136,209,0.10)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <Avatar sx={{ bgcolor: '#0288d1', mr: 2 }}>
                  {usuario.usuario_id?.charAt(0)?.toUpperCase() || '?'}
                </Avatar>
                <ListItemText
                  primary={<span style={{ fontWeight: usuario.usuario_id === usuarioId ? 'bold' : 400 }}>{usuario.usuario_id}{usuario.usuario_id === usuarioId ? ' (você)' : ''}</span>}
                  secondary={usuario.email}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default EditarUsuario;
