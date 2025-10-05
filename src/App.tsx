import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClientPage } from './pages/ClientPage';
import { TechnicianPage } from './pages/TechnicianPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/cliente" replace />} />
        <Route path="/cliente" element={<ClientPage />} />
        <Route path="/tecnico" element={<TechnicianPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;