import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import PrivateRoute from './components/PrivateRoute';

// Auth Pages (Code-split)
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Application Pages (Code-split with eager background preloading)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const Planner = lazy(() => import('./pages/Planner'));
const Notes = lazy(() => import('./pages/Notes'));
const DocumentVault = lazy(() => import('./pages/DocumentVault'));
const Health = lazy(() => import('./pages/Health'));
const Goals = lazy(() => import('./pages/Goals'));
const Finance = lazy(() => import('./pages/Finance'));
const Family = lazy(() => import('./pages/Family'));
const Memories = lazy(() => import('./pages/Memories'));
const Emergency = lazy(() => import('./pages/Emergency'));
const LifeAI = lazy(() => import('./pages/LifeAI'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/command" element={<CommandCenter />} />
          <Route path="/vault" element={<DocumentVault />} />
          <Route path="/health" element={<Health />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/progress" element={<Planner />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/learning" element={<Notes />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/family" element={<Family />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/life-ai" element={<LifeAI />} />
          <Route path="/ai" element={<LifeAI />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
