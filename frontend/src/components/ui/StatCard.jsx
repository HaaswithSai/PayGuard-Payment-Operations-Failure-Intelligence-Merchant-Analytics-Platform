import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendDirection = 'up',
  color = 'cyan', // 'cyan', 'indigo', 'emerald', 'rose', 'amber'
  className = '',
}) => {
  const colorStyles = {
    cyan: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      text: 'text-cyan-400',
      glow: 'group-hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.3)]',
    },
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      text: 'text-indigo-400',
      glow: 'group-hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.3)]',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      glow: 'group-hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.3)]',
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      glow: 'group-hover:shadow-[0_0_25px_-5px_rgba(244,63,94,0.3)]',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      glow: 'group-hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.3)]',
    },
  };

  const currentTheme = colorStyles[color] || colorStyles.cyan;

  return (
    <div className={`glass-card p-5 group transition-all duration-300 ${currentTheme.glow} ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl ${currentTheme.bg} border ${currentTheme.border} flex items-center justify-center ${currentTheme.text}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold tracking-tight text-white">{value}</div>
        {trend && (
          <span
            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
              trendDirection === 'up'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {trendDirection === 'up' ? (
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
            )}
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-2 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
