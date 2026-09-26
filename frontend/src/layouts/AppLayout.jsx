import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
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
  Bell,
  ChevronDown,
  Check,
} from 'lucide-react';
import authService from '../services/authService';
import notificationService from '../services/notificationService';
import GlobalSearch from '../components/GlobalSearch';
import GlobalFloatingTimer from '../components/GlobalFloatingTimer';
import Logo from '../components/ui/Logo';
import './AppLayout.css';

// Primary routes displayed on desktop top navbar
const PRIMARY_NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/command', label: 'Command Center', icon: Zap },
  { to: '/vault', label: 'Vault', icon: FolderLock },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/health', label: 'Health', icon: HeartPulse },
  { to: '/progress', label: 'Track Progress', icon: BarChart3 },
];

// Secondary routes accessible via the "More" dropdown
const MORE_NAV_ITEMS = [
  { to: '/learning', label: 'Learning', icon: BookOpen },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/family', label: 'Family', icon: Users },
  { to: '/memories', label: 'Memories', icon: Image },
  { to: '/life-ai', label: 'Life AI', icon: Sparkles, badge: 'AI' },
  { to: '/emergency', label: 'Emergency', icon: AlertTriangle, danger: true },
];

// All routes for mobile drawer navigation
const ALL_NAV_ITEMS = [...PRIMARY_NAV_ITEMS, ...MORE_NAV_ITEMS];

// Quick actions list for the central action FAB modal sheet on phones
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [notificationNotice, setNotificationNotice] = useState(null);

  const moreMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

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

  const isAnyMoreItemActive = MORE_NAV_ITEMS.some((item) => isRouteActive(item.to));
  const activeMoreItem = MORE_NAV_ITEMS.find((item) => isRouteActive(item.to));

  // Auto-dismiss menus on route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsQuickActionOpen(false);
    setIsSearchOpen(false);
    setIsNotificationsOpen(false);
    setIsProfileMenuOpen(false);
    setIsMoreMenuOpen(false);
  }, [location.pathname]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Global keyboard shortcuts (Escape and Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsQuickActionOpen(false);
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsProfileMenuOpen(false);
        setIsMoreMenuOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
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

  const handleTestNotification = async () => {
    try {
      setNotificationNotice('Sending test alert…');
      await notificationService.sendTestNotification();
      setNotificationNotice('Test notification triggered!');
      setTimeout(() => setNotificationNotice(null), 3500);
    } catch (err) {
      setNotificationNotice('Could not send notification.');
      setTimeout(() => setNotificationNotice(null), 3500);
    }
  };

  const userInitial = user?.name ? user.name[0].toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col relative selection:bg-purple-100 selection:text-purple-900">
      {/* ========================================================================= */}
      {/* 1. GLASSMORPHIC TOP NAVBAR (Desktop & Mobile Unified Header)               */}
      {/* ========================================================================= */}
      <header className="lifevault-top-navbar sticky top-0 z-50 w-full h-16 bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-200/70 shadow-[0_1px_12px_rgba(15,23,42,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
          {/* Left: Mobile Drawer Trigger & Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30"
              aria-label="Open navigation drawer"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>

            <NavLink
              to="/dashboard"
              className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30 rounded-lg group"
              aria-label="LifeVault Dashboard"
            >
              <Logo size={28} theme="light" />
            </NavLink>
          </div>

          {/* Center: Desktop Navigation Items */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5" aria-label="Main Navigation">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 xl:px-3.5 xl:py-2 text-sm rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30 ${
                    active
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-slate-700' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}

            {/* More Navigation Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 xl:px-3.5 xl:py-2 text-sm rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30 ${
                  isAnyMoreItemActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'
                }`}
                aria-expanded={isMoreMenuOpen}
                aria-haspopup="menu"
                aria-label="More navigation items"
              >
                <span>{activeMoreItem ? activeMoreItem.label : 'More'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180 text-slate-700' : 'text-slate-400'}`} />
              </button>

              {isMoreMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-56 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-900/5 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                  aria-label="Additional Views"
                >
                  {MORE_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isRouteActive(item.to);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsMoreMenuOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2 mx-1 rounded-lg text-sm transition-all duration-150 ${
                          active
                            ? 'bg-slate-100 text-slate-900 font-semibold'
                            : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'
                        } ${item.danger ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50' : ''}`}
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-slate-700' : item.danger ? 'text-rose-500' : 'text-slate-500'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Right: Actions (Search, Notifications, Quick Habit, Profile) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30"
              aria-label="Search LifeVault (Ctrl+K)"
              title="Search LifeVault (Ctrl+K)"
            >
              <Search className="w-[18px] h-[18px] text-slate-500" />
              <span className="hidden xl:inline text-xs text-slate-500">Search…</span>
              <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 rounded border border-slate-200">
                Ctrl K
              </kbd>
            </button>

            {/* Notifications Trigger & Popover */}
            <div className="relative" ref={notificationMenuRef}>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30"
                aria-label="Notifications"
                aria-expanded={isNotificationsOpen}
                title="Notifications"
              >
                <Bell className="w-[18px] h-[18px] text-slate-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-600 ring-2 ring-white" />
              </button>

              {isNotificationsOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-900/5 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-900"
                  role="dialog"
                  aria-label="Notifications panel"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Notifications & Reminders</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      aria-label="Close notifications"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="py-3 text-xs text-slate-600 space-y-2">
                    <p className="leading-relaxed">
                      Routine reminders and scheduled alerts are delivered seamlessly to this browser.
                    </p>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 font-medium">Web Push Service</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <Check className="w-3 h-3" /> Ready
                      </span>
                    </div>
                    {notificationNotice && (
                      <div className="p-2 rounded-lg bg-purple-50 border border-purple-200/60 text-[11px] font-semibold text-purple-700 text-center animate-in fade-in">
                        {notificationNotice}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleTestNotification}
                      className="text-xs font-semibold text-violet-600 hover:text-violet-700 py-1 transition-colors"
                    >
                      Send test reminder
                    </button>
                    <NavLink
                      to="/settings"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 py-1 transition-colors"
                    >
                      Preferences
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Habit / Primary Action Button */}
            <Link
              to="/planner"
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-semibold shadow-sm shadow-purple-500/20 hover:-translate-y-0.5 hover:shadow-md hover:shadow-purple-500/25 active:translate-y-0 transition-all duration-200 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
              aria-label="Create or view Quick Habit"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Quick Habit</span>
              <span className="sm:hidden text-xs">Habit</span>
            </Link>

            {/* Profile / User Area */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="rounded-xl p-1 sm:p-1.5 hover:bg-slate-50 transition-all duration-200 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30"
                aria-label="User profile menu"
                aria-expanded={isProfileMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm shadow-purple-500/10">
                  {userInitial}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-sm font-medium text-slate-800 leading-tight">
                    {user?.name ? user.name.split(' ')[0] : 'Friend'}
                  </span>
                  <span className="text-xs text-slate-500 leading-tight truncate max-w-[90px]">
                    {user?.email || 'LifeVault'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {isProfileMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-900/5 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                  aria-label="User account menu"
                >
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-800 truncate">{user?.name || 'Friend'}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
                  </div>
                  <NavLink
                    to="/settings"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    role="menuitem"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Settings</span>
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. OFF-CANVAS MOBILE DRAWER & BACKDROP OVERLAY                             */}
      {/* ========================================================================= */}
      {/* Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer Container */}
      <div
        className={`mobile-drawer fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] mobile-drawer-glass rounded-r-2xl flex flex-col overflow-hidden lg:hidden ${
          isMobileMenuOpen ? 'mobile-drawer-open' : ''
        }`}
        role="dialog"
        aria-label="Navigation drawer"
      >
        {/* Drawer Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80 shrink-0">
          <Logo size={28} theme="light" subtitle="Personal OS" />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content Hierarchy */}
        <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {/* Primary Quick Access Section */}
          <div>
            <div className="px-3 mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Primary Views
              </span>
            </div>
            <div className="space-y-1">
              {PRIMARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`sidebar-nav-link ${active ? 'sidebar-nav-link-active' : ''}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-violet-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Hubs & Vaults Section */}
          <div>
            <div className="px-3 mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-600">
                Hubs & Vaults
              </span>
            </div>
            <div className="space-y-1">
              {MORE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`sidebar-nav-link justify-between ${active ? 'sidebar-nav-link-active' : ''} ${
                      item.danger ? 'text-rose-600 hover:bg-rose-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-violet-600' : item.danger ? 'text-rose-500' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200/60">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/70 space-y-1 shrink-0">
          <NavLink
            to="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`sidebar-nav-link ${isRouteActive('/settings') ? 'sidebar-nav-link-active' : ''}`}
          >
            <Settings className="w-4 h-4 shrink-0 text-slate-500" />
            <span>Settings</span>
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full sidebar-nav-link text-rose-600 hover:bg-rose-50 text-left"
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
            <span>Log Out</span>
          </button>

          {/* User profile info in drawer */}
          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200/70">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'Guest'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN DASHBOARD CONTENT AREA                                            */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12 overflow-y-auto min-w-0 -webkit-overflow-scrolling-touch">
        {children || <Outlet />}
      </main>

      {/* Global floating timer for active deep work/focus sessions */}
      <GlobalFloatingTimer />

      {/* ========================================================================= */}
      {/* 4. SEARCH MODAL OVERLAY (z-[60])                                          */}
      {/* ========================================================================= */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-md p-4 pt-12 sm:pt-20 flex justify-center items-start animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1">
                <GlobalSearch autoFocus onRequestClose={() => setIsSearchOpen(false)} />
              </div>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CENTRAL ACTION FAB: QUICK ACTION / COMMAND MODAL SHEET (z-[60])        */}
      {/* ========================================================================= */}
      {isQuickActionOpen && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsQuickActionOpen(false)}
            aria-hidden="true"
          />

          {/* Action Sheet */}
          <div className="fixed bottom-20 left-4 right-4 z-[60] bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl max-h-[75vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-5 duration-200 text-slate-900">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white text-xs shadow-sm">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Quick Action Hub</h3>
                  <p className="text-[11px] text-slate-500">Select a command or create new entry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickActionOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
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
                    className="flex flex-col items-start p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 active:scale-95 transition text-left group"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${action.color} flex items-center justify-center text-white mb-2 shadow-sm group-hover:scale-105 transition-transform`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 tracking-tight">{action.label}</span>
                    <span className="text-[10px] text-slate-500 truncate w-full mt-0.5">{action.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MOBILE BOTTOM DOCK & ELEVATED FAB (Mobile: < md only, z-40)             */}
      {/* ========================================================================= */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-lg px-4 flex items-center justify-around select-none"
        aria-label="Mobile navigation dock"
      >
        {/* 1. Home / Dashboard */}
        <NavLink
          to="/dashboard"
          className={() => {
            const active = isRouteActive('/dashboard');
            return `flex flex-col items-center justify-center w-14 h-full transition-colors ${
              active ? 'text-violet-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`;
          }}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-1">Home</span>
          {isRouteActive('/dashboard') && (
            <span className="w-1 h-1 rounded-full bg-violet-600 mt-0.5" />
          )}
        </NavLink>

        {/* 2. Goals */}
        <NavLink
          to="/goals"
          className={() => {
            const active = isRouteActive('/goals');
            return `flex flex-col items-center justify-center w-14 h-full transition-colors ${
              active ? 'text-violet-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`;
          }}
        >
          <Target className="w-5 h-5" />
          <span className="text-[10px] mt-1">Goals</span>
          {isRouteActive('/goals') && (
            <span className="w-1 h-1 rounded-full bg-violet-600 mt-0.5" />
          )}
        </NavLink>

        {/* 3. Central Action FAB (Quick Action Hub) */}
        <div className="relative w-14 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsQuickActionOpen((prev) => !prev)}
            className="relative -top-5 w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 active:scale-95 transition-transform border-4 border-white hover:brightness-110"
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
              active ? 'text-violet-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`;
          }}
        >
          <HeartPulse className="w-5 h-5" />
          <span className="text-[10px] mt-1">Health</span>
          {isRouteActive('/health') && (
            <span className="w-1 h-1 rounded-full bg-violet-600 mt-0.5" />
          )}
        </NavLink>

        {/* 5. Profile / Analytics */}
        <NavLink
          to="/progress"
          className={() => {
            const active = isRouteActive('/progress');
            return `flex flex-col items-center justify-center w-14 h-full transition-colors ${
              active ? 'text-violet-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`;
          }}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-1">Progress</span>
          {isRouteActive('/progress') && (
            <span className="w-1 h-1 rounded-full bg-violet-600 mt-0.5" />
          )}
        </NavLink>
      </nav>
    </div>
  );
}