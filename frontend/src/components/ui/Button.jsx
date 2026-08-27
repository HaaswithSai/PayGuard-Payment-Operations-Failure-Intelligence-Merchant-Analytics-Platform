import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary: 'glass-btn-primary text-white border border-cyan-400/20',
    secondary: 'glass-btn-secondary text-slate-200 hover:text-white',
    danger: 'bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/30 shadow-lg shadow-rose-600/20',
    ghost: 'text-slate-400 hover:text-slate-100 hover:bg-white/5',
    outline: 'border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white bg-transparent',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
    icon: 'p-2',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
};
