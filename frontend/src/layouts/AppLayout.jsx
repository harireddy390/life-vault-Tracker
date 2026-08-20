import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import './AppLayout.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
  { to: '/vault', label: 'Vault', icon: '\u{1F5C2}\uFE0F' },
  { to: '/health', label: 'Health', icon: '\u{1F493}' },
  { to: '/goals', label: 'Goals', icon: '🎯' },
  { to: '/planner', label: 'Track Progress', icon: '🗓️' },
  { to: '/notes', label: 'Learning', icon: '📚' },
  { to: '/finance', label: 'Finance', icon: '\u{1F4B0}' },
  { to: '/family', label: 'Family', icon: '\u{1F46A}' },
  { to: '/memories', label: 'Memories', icon: '\u{1F4F8}' },
  { to: '/life-ai', label: 'Life AI', icon: '\u2728' },
  { to: '/emergency', label: 'Emergency', icon: '\u{1F6A8}' },
];

// The five that fit on the mobile bottom bar, plus a center Add button
const MOBILE_TABS = [
  { to: '/dashboard', label: 'Home', icon: '\u{1F3E0}' },
  { to: '/vault', label: 'Vault', icon: '\u{1F5C2}\uFE0F' },
];
const MOBILE_TABS_RIGHT = [
  { to: '/health', label: 'Health', icon: '\u{1F493}' },
  { to: '/settings', label: 'Profile', icon: '\u{1F464}' },
];

const QUICK_ADD = [
  { to: '/vault', label: 'Upload Document', icon: '\u{1F4C4}' },
  { to: '/notes', label: 'Add Note', icon: '\u{1F4DD}' },
  { to: '/goals', label: 'Create Goal', icon: '\u{1F3AF}' },
  { to: '/planner', label: 'Add Task', icon: '\u2705' },
  { to: '/finance', label: 'Add Expense', icon: '\u{1F4B0}' },
  { to: '/memories', label: 'Add Memory', icon: '\u{1F4F8}' },
];

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const closeDrawer = () => setDrawerOpen(false);

  const goQuickAdd = (to) => {
    setAddOpen(false);
    navigate(to);
  };

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
          &#9776;
        </button>
        <span className="mobile-brand">
          <span className="vault-dial" aria-hidden="true"></span> Life Vault
        </span>
        <div className="mobile-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
      </header>

      {(drawerOpen || addOpen) && (
        <div className="drawer-backdrop" onClick={() => { closeDrawer(); setAddOpen(false); }} />
      )}

      <aside className={`sidebar ${drawerOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="vault-dial" aria-hidden="true"></span>
          <span className="brand-text">Life <span className="brand-accent">Vault</span></span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeDrawer}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink
            to="/settings"
            onClick={closeDrawer}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
          >
            <span className="nav-icon">{'\u2699\uFE0F'}</span>
            <span>Settings</span>
          </NavLink>
          <button className="nav-item nav-logout" onClick={handleLogout}>
            <span className="nav-icon">{'\u{1F6AA}'}</span>
            <span>Log Out</span>
          </button>

          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
            <div>
              <p className="sidebar-user-name">{user?.name || 'Guest'}</p>
              <p className="sidebar-user-email">{user?.email || ''}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      {/* Quick-add sheet, opened from the mobile center FAB */}
      {addOpen && (
        <div className="quick-add-sheet">
          <p className="quick-add-title">Add Something</p>
          <div className="quick-add-grid">
            {QUICK_ADD.map((item) => (
              <button key={item.to} className="quick-add-item" onClick={() => goQuickAdd(item.to)}>
                <span className="quick-add-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {MOBILE_TABS.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `bottom-nav-item ${isActive ? 'bottom-nav-active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
          </NavLink>
        ))}
        <button className="bottom-nav-fab" onClick={() => setAddOpen((v) => !v)} aria-label="Quick add">
          +
        </button>
        {MOBILE_TABS_RIGHT.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `bottom-nav-item ${isActive ? 'bottom-nav-active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
