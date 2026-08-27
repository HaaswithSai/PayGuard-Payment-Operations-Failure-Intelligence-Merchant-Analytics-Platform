import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut, Bell, User, Sparkles, Activity } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Navbar = () => {
  const { user, logout, isAdmin, isSupport, isMerchant } = useAuth();

  return (
    <header className="glass-nav sticky top-0 z-30 h-16 px-6 flex items-center justify-between">
      {/* Left: Branding & Status Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-slate-400 hidden sm:inline-block">
            Engine Live
          </span>
        </div>

        <div className="h-4 w-px bg-white/10 mx-2 hidden sm:block" />

        {isMerchant && user?.merchant && (
          <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-cyan-300">
              Merchant: <strong className="text-white">{user.merchant.name || user.merchant.merchantCode || 'Active Tenant'}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-3">
        {/* User Role Badge */}
        {user && (
          <Badge
            variant={isAdmin ? 'admin' : isSupport ? 'support' : 'merchant'}
            size="sm"
          >
            {user.role}
          </Badge>
        )}

        {/* User Card */}
        <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-cyan-500/20">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-slate-200 leading-none">{user?.name || 'User'}</div>
            <div className="text-[10px] text-slate-400 leading-none mt-1">{user?.email}</div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
