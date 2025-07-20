// src/App.js
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ListarFuncionarios from './components/ListarFuncionarios';
import EditarFuncionario from './components/EditarFuncionario';
import CadastrarFuncionario from './components/CadastrarFuncionario';
import RegistrarPonto from './components/RegistrarPonto';
import ConsultarRegistros from './components/ConsultarRegistros';
import Registros from './components/Registros';
import Home from './components/Home';
import Login from './components/Login';
import CadastrarUsuarioEmpresa from './components/CadastrarUsuarioEmpresa';
import EditarUsuario from './components/EditarUsuario';
import BoxUsuario from './components/BoxUsuario';

function AppWrapper() {
  const location = useLocation();
  const hideBoxUsuario = location.pathname === '/' || location.pathname === '/cadastrar-usuario';
  return (
    <>
      {!hideBoxUsuario && <BoxUsuario />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/listar" element={<ListarFuncionarios />} />
        <Route path="/editar/:id" element={<EditarFuncionario />} />
        <Route path="/cadastrar" element={<CadastrarFuncionario />} />
        <Route path="/registrar" element={<RegistrarPonto />} />
        <Route path="/consultar" element={<ConsultarRegistros />} />
        <Route path="/registros" element={<Registros />} />
        <Route path="/cadastrar-usuario" element={<CadastrarUsuarioEmpresa />} />
        <Route path="/editar-usuario" element={<EditarUsuario />} />
        {/* Rota para páginas não encontradas */}
        <Route path="*" element={<div>Página não encontrada</div>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
      <AppWrapper />
    </Router>
  );
}

export default App;