import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClientPage } from './pages/ClientPage';
import { TechnicianPage } from './pages/TechnicianPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/cliente" replace />} />
        <Route path="/cliente" element={<ClientPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Apenas /tecnico é protegido por login */}
        <Route 
          path="/tecnico" 
          element={
            <ProtectedRoute>
              <TechnicianPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Dashboard acessível apenas pelo painel do técnico (sem verificação) */}
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Redirecionar para cliente se rota não existir */}
        <Route path="*" element={<Navigate to="/cliente" replace />} />
      </Routes>
    </Router>
  );
}

export default App;