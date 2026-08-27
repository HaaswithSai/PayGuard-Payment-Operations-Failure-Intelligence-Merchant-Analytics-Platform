import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Store,
  CreditCard,
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
  Settings,
  Shield,
  Layers,
} from 'lucide-react';

export const Sidebar = () => {
  const { user, isAdmin, isSupport, isMerchant } = useAuth();

  const navItems = [
    {
      name: 'Overview',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'SUPPORT', 'MERCHANT'],
    },
    {
      name: 'Merchants',
      path: '/merchants',
      icon: Store,
      roles: ['ADMIN', 'SUPPORT'],
    },
    {
      name: 'Payments Ledger',
      path: '/payments',
      icon: CreditCard,
      roles: ['ADMIN', 'SUPPORT', 'MERCHANT'],
    },
    {
      name: 'Failure Taxonomy',
      path: '/classifications',
      icon: AlertTriangle,
      roles: ['ADMIN', 'SUPPORT', 'MERCHANT'],
    },
    {
      name: 'Analytics Engine',
      path: '/analytics',
      icon: BarChart3,
      roles: ['ADMIN', 'SUPPORT', 'MERCHANT'],
    },
    {
      name: 'Report Center',
      path: '/reports',
      icon: FileSpreadsheet,
      roles: ['ADMIN', 'SUPPORT', 'MERCHANT'],
    },
    {
      name: 'Platform Settings',
      path: '/settings',
      icon: Settings,
      roles: ['ADMIN', 'SUPPORT', 'MERCHANT'],
    },
  ];

  const allowedNav = navItems.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <aside className="w-64 glass-panel border-r border-white/10 flex flex-col justify-between shrink-0 min-h-screen">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 border border-white/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              PayGuard
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                v1.0
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
              Operations & Insights
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div className="p-4 space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-500 px-3 py-2 uppercase tracking-wider">
            Main Navigation
          </div>
          {allowedNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_-3px_rgba(6,182,212,0.25)]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 hover:border-white/5 border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="glass-card p-3 rounded-xl bg-slate-900/40 border border-white/5">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Queue Workers
            </span>
            <span className="text-emerald-400 font-bold text-[10px]">HEALTHY</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Concurrency locks & watchdog active
          </p>
        </div>
      </div>
    </aside>
  );
};
