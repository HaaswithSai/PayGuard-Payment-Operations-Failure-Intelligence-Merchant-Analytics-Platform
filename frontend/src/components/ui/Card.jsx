import React from 'react';

export const Card = ({
  children,
  className = '',
  title,
  subtitle,
  icon: Icon,
  action,
  headerClassName = '',
}) => {
  return (
    <div className={`glass-card p-6 relative overflow-hidden ${className}`}>
      {(title || action || Icon) && (
        <div className={`flex items-center justify-between mb-5 ${headerClassName}`}>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              {title && <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
