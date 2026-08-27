import React, { forwardRef } from 'react';

export const Input = forwardRef(
  (
    {
      label,
      error,
      icon: Icon,
      className = '',
      wrapperClassName = '',
      type = 'text',
      helperText,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`w-full ${wrapperClassName}`}>
        {label && (
          <label className="block text-xs font-medium text-slate-300 mb-1.5 tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3.5 pointer-events-none text-slate-400">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={`glass-input w-full rounded-xl text-sm py-2.5 px-3.5 placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-500 ${
              Icon ? 'pl-10' : ''
            } ${error ? 'border-rose-500 focus:border-rose-500' : ''} ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="mt-1 text-xs text-rose-400 tracking-tight">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
