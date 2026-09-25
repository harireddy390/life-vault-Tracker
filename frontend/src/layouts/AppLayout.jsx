import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  FolderLock,
  HeartPulse,
  Target,
  BarChart3,
  BookOpen,
  Wallet,
  Users,
  Image,
  Sparkles,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Plus,
} from 'lucide-react';
import authService from '../services/authService';
import GlobalSearch from '../components/GlobalSearch';
import GlobalFloatingTimer from '../components/GlobalFloatingTimer';
import Logo from '../components/ui/Logo';
import './AppLayout.css';

// Primary routes with exact original names
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/command', label: 'Command Center', icon: Zap },
  { to: '/vault', label: 'Vault', icon: FolderLock },
  { to: '/health', label: 'Health', icon: HeartPulse },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/progress', label: 'Track Progress', icon: BarChart3 },
  { to: '/learning', label: 'Learning', icon: BookOpen },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/family', label: 'Family', icon: Users },
  { to: '/memories', label: 'Memories', icon: Image },
  { to: '/life-ai', label: 'Life AI', icon: Sparkles },
  { to: '/emergency', label: 'Emergency', icon: AlertTriangle },
];

// Secondary drawer navigation items focusing on routes not in mobile bottom dock
const DRAWER_SECONDARY_ITEMS = [
  { to: '/vault', label: 'Vault', icon: FolderLock },
  { to: '/learning', label: 'Learning', icon: BookOpen },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/family', label: 'Family', icon: Users },
  { to: '/memories', label: 'Memories', icon: Image },
  { to: '/life-ai', label: 'Life AI', icon: Sparkles, badge: 'AI' },
  { to: '/emergency', label: 'Emergency', icon: AlertTriangle, danger: true },
];

// Quick actions list for the elevated Central FAB modal
const QUICK_ACTIONS = [
  { to: '/command', label: 'Command Center', icon: Zap, color: 'from-amber-500 to-orange-600', description: 'Schedule & daily routine' },
  { to: '/vault', label: 'Vault', icon: FolderLock, color: 'from-blue-600 to-indigo-600', description: 'Upload document' },
  { to: '/goals', label: 'Goals', icon: Target, color: 'from-indigo-600 to-purple-600', description: 'Create new goal' },
  { to: '/health', label: 'Health', icon: HeartPulse, color: 'from-rose-500 to-red-600', description: 'Log vitals & telemetry' },
  { to: '/learning', label: 'Learning', icon: BookOpen, color: 'from-cyan-500 to-blue-600', description: 'Add note or flashcard' },
  { to: '/finance', label: 'Finance', icon: Wallet, color: 'from-emerald-500 to-teal-600', description: 'Add expense' },
  { to: '/memories', label: 'Memories', icon: Image, color: 'from-purple-500 to-pink-600', description: 'Add memory' },
  { to: '/life-ai', label: 'Life AI', icon: Sparkles, color: 'from-indigo-500 to-violet-600', description: 'Ask AI assistant' },
];

export default function AppLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  // 1. Clean route-change listeners to auto-dismiss all menus on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsQuickActionOpen(false);
    setIsMobileSearchOpen(false);
  }, [location.pathname]);

  // 2. Escape key listener to dismiss drawer and open sheets
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsQuickActionOpen(false);
        setIsMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    if (window.confirm('Log out of Life Vault?')) {
      authService.logout();
      navigate('/login');
    }
  };

  const handleQuickAction = (targetRoute) => {
    setIsQuickActionOpen(false);
    navigate(targetRoute);
  };

  // Helper to determine if a route is currently active
  const isRouteActive = (routePath) => {
    if (routePath === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    if (routePath === '/progress') {
      return location.pathname === '/progress' || location.pathname === '/planner';
    }
    if (routePath === '/learning') {
      return location.pathname === '/learning' || location.pathname === '/notes';
    }
    return location.pathname.startsWith(routePath);
  };

  const userInitial = user?.name ? user.name[0].toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col md:flex-row relative">
      {/* ========================================================================= */}
      {/* 1. PERMANENT LEFT SIDEBAR (Desktop: md: and up)                           */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex md:flex-col md:fixed md:top-0 md:left-0 md:bottom-0 md:w-64 md:h-screen shrink-0 premium-sidebar z-30 select-none text-slate-100 overflow-hidden">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 shrink-0 relative z-10">
          <Logo size={32} subtitle="Personal OS" />
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto premium-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`sidebar-nav-link ${active ? 'sidebar-nav-link-active' : ''}`}
              >
                {active && <span className="sidebar-active-indicator" />}
                <Icon className={`sidebar-icon w-4 h-4 shrink-0 transition-transform duration-200 ${active ? 'text-indigo-400 scale-110' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
                {item.to === '/command' && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    LIVE
                  </span>
                )}
                {item.to === '/life-ai' && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    AI
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Desktop Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070b14]/50 space-y-1 shrink-0 relative z-10">
          <NavLink
            to="/settings"
            className={`sidebar-nav-link ${isRouteActive('/settings') ? 'sidebar-nav-link-active' : ''}`}
          >
            {isRouteActive('/settings') && <span className="sidebar-active-indicator" />}
            <Settings className="sidebar-icon w-4 h-4 shrink-0" />
            <span>Settings</span>
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full sidebar-nav-link text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-left"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Log Out</span>
          </button>

          {/* User Profile Snippet */}
          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md ring-1 ring-indigo-400/30">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Guest'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. FIXED MOBILE TOP HEADER (Mobile: < md only)                           */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 h-16 z-40 premium-mobile-header px-4 flex items-center justify-between md:hidden text-white">
        {/* Left: Hamburger Menu & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 active:scale-95 transition"
            aria-label="Open navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="cursor-pointer active:scale-95 transition-transform" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
            <Logo size={28} />
          </div>
        </div>

        {/* Right: Search Trigger & Avatar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 active:scale-95 transition"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md border border-slate-700 active:scale-95 transition"
            aria-label="User settings"
          >
            {userInitial}
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. OFF-CANVAS SIDEBAR DRAWER & BACKDROP OVERLAY (Mobile Only: z-50)       */}
      {/* ========================================================================= */}
      {/* Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer Container */}
      <div
        className={`mobile-drawer fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[80vw] premium-sidebar shadow-2xl rounded-r-2xl flex flex-col overflow-hidden md:hidden text-slate-100 ${
          isMobileMenuOpen ? 'mobile-drawer-open' : ''
        }`}
      >
        {/* Drawer Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 shrink-0 relative z-10">
          <Logo size={30} subtitle="Personal OS" />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content Hierarchy */}
        <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto premium-sidebar-nav">
          {/* Secondary Views Section */}
          <div>
            <div className="px-3 mb-2">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-400">
                Hubs & Vaults
              </span>
            </div>
            <div className="space-y-1">
              {DRAWER_SECONDARY_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`sidebar-nav-link justify-between ${active ? 'sidebar-nav-link-active' : ''} ${
                      item.danger ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {active && <span className="sidebar-active-indicator" />}
                      <Icon className={`sidebar-icon w-4 h-4 ${active ? 'text-indigo-400' : item.danger ? 'text-rose-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Primary Quick Access Section */}
          <div>
            <div className="px-3 mb-2">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500">
                Primary Views
              </span>
            </div>
            <div className="space-y-1">
              {[
                { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { to: '/command', label: 'Command Center', icon: Zap },
                { to: '/goals', label: 'Goals', icon: Target },
                { to: '/health', label: 'Health', icon: HeartPulse },
                { to: '/progress', label: 'Track Progress', icon: BarChart3 },
              ].map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`sidebar-nav-link ${active ? 'sidebar-nav-link-active' : ''}`}
                  >
                    {active && <span className="sidebar-active-indicator" />}
                    <Icon className={`sidebar-icon w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070b14]/50 space-y-1 shrink-0 relative z-10">
          <NavLink
            to="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`sidebar-nav-link ${isRouteActive('/settings') ? 'sidebar-nav-link-active' : ''}`}
          >
            {isRouteActive('/settings') && <span className="sidebar-active-indicator" />}
            <Settings className="sidebar-icon w-3.5 h-3.5" />
            <span>Settings</span>
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full sidebar-nav-link text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10 text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>

          {/* User profile info */}
          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md ring-1 ring-indigo-400/30">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Guest'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN CONTENT AREA & DESKTOP TOPBAR                                    */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent md:pl-64">
        {/* Desktop Top Header Bar (md: and up) */}
        <header className="desktop-topbar-wrapper hidden md:flex items-center justify-between">
          <div className="w-96 max-w-md">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-600">
              Hi, <span className="text-slate-900 font-semibold">{user?.name ? user.name.split(' ')[0] : 'Friend'}</span>
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {userInitial}
            </div>
          </div>
        </header>

        {/* Scrollable View Area: Mobile gets pt-20 pb-28, Desktop gets normal p-8 pb-12 */}
        <main className="flex-1 w-full pt-20 pb-28 px-4 md:pt-6 md:pb-12 md:px-8 overflow-y-auto min-w-0 -webkit-overflow-scrolling-touch">
          {children || <Outlet />}
        </main>
      </div>

      {/* Global floating timer for active deep work/focus sessions */}
      <GlobalFloatingTimer />

      {/* ========================================================================= */}
      {/* 5. MOBILE SEARCH MODAL OVERLAY (z-[60])                                   */}
      {/* ========================================================================= */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-[#0F172A]/95 backdrop-blur-md p-4 pt-6 flex flex-col md:hidden animate-in fade-in duration-150 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <GlobalSearch autoFocus onRequestClose={() => setIsMobileSearchOpen(false)} />
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(false)}
              className="px-3 py-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CENTRAL ACTION FAB: QUICK ACTION / COMMAND MODAL SHEET (z-[60])       */}
      {/* ========================================================================= */}
      {isQuickActionOpen && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsQuickActionOpen(false)}
            aria-hidden="true"
          />

          {/* Action Sheet */}
          <div className="fixed bottom-20 left-4 right-4 z-[60] bg-[#0F172A] border border-slate-800 rounded-2xl p-4 shadow-2xl max-h-[75vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-5 duration-200 text-white">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white text-xs shadow-sm">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Quick Action Hub</h3>
                  <p className="text-[11px] text-slate-400">Select a command or create new entry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickActionOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close action sheet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of touch action targets */}
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_ACTIONS.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.to + action.label}
                    type="button"
                    onClick={() => handleQuickAction(action.to)}
                    className="flex flex-col items-start p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 active:scale-95 transition text-left group"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${action.color} flex items-center justify-center text-white mb-2 shadow-sm group-hover:scale-105 transition-transform`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-white tracking-tight">{action.label}</span>
                    <span className="text-[10px] text-slate-400 truncate w-full mt-0.5">{action.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MOBILE BOTTOM DOCK & ELEVATED FAB (Mobile: < md only, z-40)            */}
      {/* ========================================================================= */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 premium-mobile-dock px-4 flex items-center justify-around select-none"
        aria-label="Mobile navigation dock"
      >
        {/* 1. Home / Dashboard */}
        <NavLink
          to="/dashboard"
          className={() => {
            const active = isRouteActive('/dashboard');
            return `flex flex-col items-center justify-center w-14 h-full transition-colors ${
              active ? 'premium-mobile-dock-active' : 'text-slate-400 hover:text-slate-200'
            }`;
          }}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-1">Home</span>
          {isRouteActive('/dashboard') && (
            <span className="premium-dock-dot mt-0.5" />
          )}
        </NavLink>

        {/* 2. Goals */}
        <NavLink
          to="/goals"
          className={() => {
            const active = isRouteActive('/goals');
            return `flex flex-col items-center justify-center w-14 h-full transition-colors ${
              active ? 'premium-mobile-dock-active' : 'text-slate-400 hover:text-slate-200'
            }`;
          }}
        >
          <Target className="w-5 h-5" />
          <span className="text-[10px] mt-1">Goals</span>
          {isRouteActive('/goals') && (
            <span className="premium-dock-dot mt-0.5" />
          )}
        </NavLink>

        {/* 3. Central Action FAB (Quick Action / Command Hub) */}
        <div className="relative w-14 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsQuickActionOpen((prev) => !prev)}
            className="relative -top-5 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 text-white flex items-center justify-center premium-fab-ring active:scale-95 transition-transform border-4 hover:brightness-110"
            aria-label="Quick Action and Command Center"
          >
            <Plus className={`w-6 h-6 transition-transform duration-200 ${isQuickActionOpen ? 'rotate-45' : ''}`} />
          </button>
        </div>

        {/* 4. Health */}
        <NavLink
          to="/health"
          className={() => {
            const active = isRouteActive('/health');
            return `flex flex-col items-center justify-center w-14 h-full transition-colors ${
              active ? 'premium-mobile-dock-active' : 'text-slate-400 hover:text-slate-200'
            }`;
          }}
        >
          <HeartPulse className="w-5 h-5" />
          <span className="text-[10px] mt-1">Health</span>
          {isRouteActive('/health') && (
            <span className="premium-dock-dot mt-0.5" />
          )}
        </NavLink>

        {/* 5. Profile / Analytics */}
        <NavLink
          to="/progress"
          className={() => {
            const active = isRouteActive('/progress');
            return `flex flex-col items-center justify-center w-14 h-full transition-colors ${
              active ? 'premium-mobile-dock-active' : 'text-slate-400 hover:text-slate-200'
            }`;
          }}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-1">Progress</span>
          {isRouteActive('/progress') && (
            <span className="premium-dock-dot mt-0.5" />
          )}
        </NavLink>
      </nav>
    </div>
  );
}