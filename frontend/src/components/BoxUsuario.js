import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

function BoxUsuario() {
  const [usuarioId, setUsuarioId] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsuarioId(payload.usuario_id || '');
        setEmpresaNome(payload.empresa_nome || '');
        setEmpresaId(payload.empresa_id || '');
      } catch (e) {}
    }
  }, [location]);

  if (!usuarioId) return null;

  return (
    <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 2000 }}>
      <Paper
        elevation={4}
        sx={{
          p: 2,
          borderRadius: '12px',
          background: '#fff',
          cursor: 'pointer',
          minWidth: 200,
          boxShadow: '0 2px 8px rgba(2,136,209,0.15)',
          border: '2px solid #0288d1',
          '&:hover': { background: '#e3f2fd' },
        }}
        onClick={() => navigate('/editar-usuario')}
        title="Editar dados do usuário/empresa"
      >
        <Typography variant="subtitle2" sx={{ color: '#0288d1', fontWeight: 'bold' }}>
          Usuário: {usuarioId}
        </Typography>
        <Typography variant="body2" sx={{ color: '#555' }}>
          Empresa: {empresaNome}
        </Typography>
        <Typography variant="caption" sx={{ color: '#888' }}>
          Empresa ID: {empresaId}
        </Typography>
      </Paper>
    </Box>
  );
}

export default BoxUsuario;
