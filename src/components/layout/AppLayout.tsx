import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  LayoutDashboard,
  CalendarCheck2,
  Users,
  GraduationCap,
  Layers,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  UserCheck,
  Building2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<'admin' | 'teacher' | 'student'>;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher'] },
  { name: 'Take Attendance', href: '/attendance', icon: CalendarCheck2, roles: ['admin', 'teacher'] },
  { name: 'Students', href: '/students', icon: Users, roles: ['admin', 'teacher'] },
  { name: 'Batches & Courses', href: '/batches', icon: Layers, roles: ['admin', 'teacher'] },
  { name: 'Reports & Analytics', href: '/reports', icon: BarChart3, roles: ['admin', 'teacher'] },
  { name: 'Faculty Members', href: '/teachers', icon: GraduationCap, roles: ['admin'] },
  { name: 'Settings & Audit', href: '/settings', icon: Settings, roles: ['admin'] },
  // Student portal
  { name: 'My Attendance', href: '/student-portal', icon: UserCheck, roles: ['student'] },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const allowedNavItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  // Compute breadcrumb title
  const currentNav = allowedNavItems.find(
    (item) => location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:w-64 flex-col bg-slate-900 border-r border-slate-800 shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
          <img
            src="/src/assets/images/academy_crest_emblem_1791807037914.jpg"
            alt="Academy Crest"
            className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white tracking-tight truncate">ClassAttend</h1>
            <p className="text-[11px] text-slate-400 truncate">Attendance Management</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {allowedNavItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40 border border-slate-800">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-900 text-indigo-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {user?.name?.slice(0, 2) || 'US'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 capitalize flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{user?.role}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-slate-900 flex flex-col z-10 p-4 border-r border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <img
                  src="/src/assets/images/academy_crest_emblem_1791807037914.jpg"
                  alt="Academy"
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
                <span className="text-sm font-bold text-white">ClassAttend</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
              {allowedNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-auto flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-medium text-rose-300 bg-rose-950/40 border border-rose-900/50 rounded-lg hover:bg-rose-900/40"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
          {/* Left: Mobile trigger & Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center text-xs text-slate-500 min-w-0">
              <span className="hidden sm:inline font-medium text-slate-600">Apex Academy</span>
              <ChevronRight className="hidden sm:inline w-3.5 h-3.5 mx-1.5 text-slate-400" />
              <span className="font-semibold text-slate-900 truncate">
                {currentNav?.name || 'ClassAttend'}
              </span>
            </div>
          </div>

          {/* Right: Academic Status & Account actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
              <Building2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="font-medium text-slate-700">Term 2026-27</span>
              <span>·</span>
              <span className="text-emerald-700 font-medium">Active Session</span>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-500 capitalize">{user?.role}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300 shrink-0">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600 uppercase">
                    {user?.name?.slice(0, 2) || 'U'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
