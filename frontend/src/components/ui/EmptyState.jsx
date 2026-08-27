import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'Try adjusting your search query or filters.',
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-base font-semibold text-slate-200">{title}</h4>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export const SkeletonLoader = ({ count = 3, className = 'h-16 w-full' }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`rounded-xl bg-white/5 border border-white/5 animate-pulse ${className}`}
        />
      ))}
    </div>
  );
};
