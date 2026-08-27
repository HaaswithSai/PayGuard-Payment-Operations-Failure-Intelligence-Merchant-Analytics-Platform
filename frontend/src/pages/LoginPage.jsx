import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#080d1a]">
      {/* Background Ambient Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-xl shadow-cyan-500/30 border border-white/20 mb-4 animate-float">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">PayGuard Enterprise</h1>
          <p className="text-xs text-slate-400 mt-1">Payment Operations & Analytics Portal</p>
        </div>

        {/* Login Glass Card */}
        <div className="glass-card p-8 border border-white/10 shadow-2xl backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Work Email"
              type="email"
              placeholder="name@company.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
              icon={ArrowRight}
            >
              Sign In to PayGuard
            </Button>
          </form>

          {/* Public Self-Service Signup Link */}
          <div className="mt-4 text-center text-xs text-slate-400">
            Onboarding a new business?{' '}
            <a href="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              Register as Merchant →
            </a>
          </div>

          {/* Quick Demo Credentials Presets */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Demo Role Logins
              </span>
              <span className="text-[10px] text-slate-500">Click to fill</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@payguard.io', 'Admin@123456')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 text-left transition-all group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-cyan-300 text-[11px]">Super Admin</div>
                <div className="text-[9px] text-slate-400 truncate">Global Oversight</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('support@payguard.io', 'Support@123456')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/30 text-left transition-all group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-amber-300 text-[11px]">Support Ops</div>
                <div className="text-[9px] text-slate-400 truncate">Triage & Overrides</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('merchant@acme.com', 'Merchant@123456')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 text-left transition-all group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-emerald-300 text-[11px]">Merchant</div>
                <div className="text-[9px] text-slate-400 truncate">Acme Tenant Only</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Tagline */}
        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Secured with JWT, HMAC-SHA256 & Multi-Tenant Isolation</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
