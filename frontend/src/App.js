// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ListarFuncionarios from './components/ListarFuncionarios';
import EditarFuncionario from './components/EditarFuncionario';
import CadastrarFuncionario from './components/CadastrarFuncionario';
import RegistrarPonto from './components/RegistrarPonto';
import ConsultarRegistros from './components/ConsultarRegistros';
import Registros from './components/Registros';
import Home from './components/Home';

function App() {
  return (
    <Router future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/listar" element={<ListarFuncionarios />} />
        <Route path="/editar/:id" element={<EditarFuncionario />} />
        <Route path="/cadastrar" element={<CadastrarFuncionario />} />
        <Route path="/registrar" element={<RegistrarPonto />} />
        <Route path="/consultar" element={<ConsultarRegistros />} />
        <Route path="/registros" element={<Registros />} />
        {/* Rota para páginas não encontradas */}
        <Route path="*" element={<div>Página não encontrada</div>} />
      </Routes>
    </Router>
  );
}

export default App;