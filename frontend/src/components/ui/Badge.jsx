import React from 'react';

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_-3px_rgba(16,185,129,0.2)]',
    failed: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_12px_-3px_rgba(244,63,94,0.2)]',
    processing: 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse',
    pending: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    refunded: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    admin: 'bg-red-500/10 text-red-400 border-red-500/30 font-semibold',
    support: 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-semibold',
    merchant: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-semibold',
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    inactive: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
    suspended: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const dotColors = {
    success: 'bg-emerald-400',
    failed: 'bg-rose-400',
    processing: 'bg-amber-400',
    pending: 'bg-sky-400',
    active: 'bg-emerald-400',
    suspended: 'bg-rose-400',
    default: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border backdrop-blur-sm ${
        variantStyles[variant.toLowerCase()] || variantStyles.default
      } ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            dotColors[variant.toLowerCase()] || dotColors.default
          }`}
        />
      )}
      {children}
    </span>
  );
};
