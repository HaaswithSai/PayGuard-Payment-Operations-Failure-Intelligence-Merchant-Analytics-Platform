import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080d1a] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-xs font-medium tracking-wide text-slate-500">Verifying PayGuard session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
