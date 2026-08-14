import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

export default function PrivateRoute({ children }) {
  const user = authService.getCurrentUser();
  return user ? children : <Navigate to="/login" replace />;
}
