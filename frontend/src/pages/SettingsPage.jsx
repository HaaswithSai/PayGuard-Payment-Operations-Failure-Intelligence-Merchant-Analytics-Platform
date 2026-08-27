import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth.api';
import {
  User,
  Shield,
  Key,
  Lock,
  Store,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Info,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const SettingsPage = () => {
  const { user, logout, isAdmin, isSupport, isMerchant } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage({ type: '', text: '' });

    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Platform & Account Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your operator credentials, access scopes, and cryptographic security parameters.
        </p>
      </div>

      {/* User Profile Card */}
      <Card title="Operator Profile" subtitle="Your current credentials and assigned role scope" icon={User}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-slate-400">Full Name</span>
            <p className="text-sm font-semibold text-white">{user?.name || 'Administrator'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-slate-400">Email Address</span>
            <p className="text-sm font-semibold text-white">{user?.email}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-slate-400">Role & Access Scope</span>
            <div className="mt-1">
              <Badge variant={isAdmin ? 'admin' : isSupport ? 'support' : 'merchant'} size="md">
                {user?.role}
              </Badge>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-slate-400">Assigned Tenant</span>
            <p className="text-sm font-semibold text-cyan-300">
              {isMerchant && user?.merchant ? `${user.merchant.name} (${user.merchant.merchantCode})` : 'Global Platform Scope'}
            </p>
          </div>
        </div>
      </Card>

      {/* Merchant-Specific Webhook & Gateway Settings (Merchant Role Only) */}
      {isMerchant && (
        <Card
          title="Merchant Business & Webhook Credentials"
          subtitle="Your enterprise tenant routing rules, active gateway credentials, and signing secrets"
          icon={Store}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-slate-400 block mb-1">Merchant Code</span>
                <span className="font-mono text-cyan-300 font-bold text-sm">
                  {user?.merchant?.merchantCode || 'MCH_TENANT_001'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-slate-400 block mb-1">Settlement Currency</span>
                <span className="text-white font-bold text-sm">
                  {user?.merchant?.configuration?.defaultCurrency || 'USD'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-slate-400 block mb-1">Account Status</span>
                <Badge variant={user?.merchant?.status || 'ACTIVE'} size="sm">
                  {user?.merchant?.status || 'ACTIVE'}
                </Badge>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1.5 font-medium">
                Active Payment Gateways
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(user?.merchant?.configuration?.supportedGateways || ['STRIPE', 'RAZORPAY', 'ADYEN', 'PAYPAL']).map((gw) => (
                  <span key={gw} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-semibold text-xs">
                    {gw}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-medium">
                HMAC-SHA256 Webhook Signing Secret (Use in Stripe / Razorpay / PayPal Webhooks)
              </span>
              <div className="p-3 rounded-xl bg-slate-900/80 font-mono text-[11px] text-cyan-300 border border-white/10 break-all select-all">
                {user?.merchant?.configuration?.webhookSecret || 'whsec_simulated_test_secret_123'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Change Password Card */}
      <Card
        title="Update Security Password"
        subtitle="Ensure your account uses a strong password with at least 8 characters"
        icon={Key}
      >
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          {passwordMessage.text && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                passwordMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {passwordMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <Input
            label="New Password"
            type="password"
            placeholder="••••••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" isLoading={passwordLoading}>
            Update Password
          </Button>
        </form>
      </Card>

      {/* Security Architecture Info */}
      <Card
        title="Cryptographic Architecture Status"
        subtitle="Active security measures implemented on this PayGuard node"
        icon={Shield}
      >
        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Bcrypt Password Hashing (Cost Factor 12)
            </span>
            <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              HMAC-SHA256 Webhook Signatures with Timing-Safe Equal
            </span>
            <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              MongoDB Sparse TTL Indexes for Report Cleanups (7-Day Retention)
            </span>
            <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
