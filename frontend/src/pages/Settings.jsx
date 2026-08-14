import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import './Settings.css';

export default function Settings() {
  const user = authService.getCurrentUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="page-subtitle">Your account details.</p>
      </div>

      <div className="card settings-card">
        <div className="settings-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
        <div className="settings-field">
          <span className="settings-label">Name</span>
          <span className="settings-value">{user?.name}</span>
        </div>
        <div className="settings-field">
          <span className="settings-label">Email</span>
          <span className="settings-value">{user?.email}</span>
        </div>
        <button className="btn btn-danger settings-logout" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}
