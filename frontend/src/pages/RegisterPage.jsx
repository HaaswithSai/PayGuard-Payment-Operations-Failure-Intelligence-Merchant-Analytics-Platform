import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Lock,
  Mail,
  Building,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const AVAILABLE_GATEWAYS = ['STRIPE', 'RAZORPAY', 'ADYEN', 'PAYPAL'];
const AVAILABLE_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'SGD', 'JPY'];

export const RegisterPage = () => {
  const [businessName, setBusinessName] = useState('');
  const [merchantCode, setMerchantCode] = useState('');
  const [managerName, setManagerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [gateways, setGateways] = useState(['STRIPE', 'RAZORPAY', 'ADYEN', 'PAYPAL']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { registerMerchant } = useAuth();
  const navigate = useNavigate();

  const toggleGateway = (gw) => {
    if (gateways.includes(gw)) {
      if (gateways.length > 1) {
        setGateways(gateways.filter((g) => g !== gw));
      }
    } else {
      setGateways([...gateways, gw]);
    }
  };

  const handleBusinessNameChange = (e) => {
    const val = e.target.value;
    setBusinessName(val);
    if (!merchantCode || merchantCode.startsWith('MCH_')) {
      const slug = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
      if (slug) {
        setMerchantCode(`MCH_${slug}_001`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !businessName || !managerName) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await registerMerchant({
        name: managerName,
        email,
        password,
        merchantName: businessName,
        merchantCode: merchantCode.toUpperCase(),
        supportedGateways: gateways,
        defaultCurrency: currency,
      });

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#080d1a] py-12">
      {/* Background Ambient Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-xl shadow-cyan-500/30 border border-white/20 mb-3">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Onboard Your Enterprise</h1>
          <p className="text-xs text-slate-400 mt-1">
            Register your merchant account for real-time payment operations & failure intelligence
          </p>
        </div>

        {/* Register Glass Card */}
        <div className="glass-card p-6 sm:p-8 border border-white/10 shadow-2xl backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Company / Merchant Name"
                placeholder="e.g. Zenith Global Ltd"
                icon={Building}
                value={businessName}
                onChange={handleBusinessNameChange}
                required
              />

              <Input
                label="Merchant Scope Code"
                placeholder="MCH_ZENITH_001"
                value={merchantCode}
                onChange={(e) => setMerchantCode(e.target.value)}
                helperText="Unique uppercase identifier"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Manager Full Name"
                placeholder="Alex Morgan"
                icon={User}
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                required
              />

              <Input
                label="Work Email Address"
                type="email"
                placeholder="alex@zenith.com"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Portal Password"
                type="password"
                placeholder="••••••••••••"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-xs">
                  Settlement Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="glass-input w-full rounded-xl py-2.5 px-3 text-white text-xs"
                >
                  {AVAILABLE_CURRENCIES.map((c) => (
                    <option key={c} value={c} className="bg-slate-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Allowed Gateways Selection */}
            <div>
              <label className="block text-slate-400 font-medium mb-1.5 text-xs">
                Active Payment Gateways (Click to toggle)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_GATEWAYS.map((gw) => {
                  const isSelected = gateways.includes(gw);
                  return (
                    <button
                      key={gw}
                      type="button"
                      onClick={() => toggleGateway(gw)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/10'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <span>{gw}</span>
                      {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-3"
              isLoading={loading}
              icon={ArrowRight}
            >
              Complete Registration & Access Portal
            </Button>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-slate-400">
            Already have an enterprise account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              Sign In Here →
            </Link>
          </div>
        </div>

        {/* Security Tagline */}
        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instant Multi-Tenant Provisioning • Encrypted Bcrypt Credentials</span>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
