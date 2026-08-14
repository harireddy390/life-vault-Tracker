import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Planner from './pages/Planner';
import Notes from './pages/Notes';
import DocumentVault from './pages/DocumentVault';
import Health from './pages/Health';
import Goals from './pages/Goals';
import Finance from './pages/Finance';
import Family from './pages/Family';
import Memories from './pages/Memories';
import Emergency from './pages/Emergency';
import LifeAI from './pages/LifeAI';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vault" element={<DocumentVault />} />
        <Route path="/health" element={<Health />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/family" element={<Family />} />
        <Route path="/memories" element={<Memories />} />
        <Route path="/life-ai" element={<LifeAI />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
