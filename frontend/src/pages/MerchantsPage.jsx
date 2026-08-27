import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { merchantsApi } from '../api/merchants.api';
import {
  Store,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Check,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SkeletonLoader, EmptyState } from '../components/ui/EmptyState';

const AVAILABLE_GATEWAYS = ['STRIPE', 'RAZORPAY', 'ADYEN', 'PAYPAL'];
const AVAILABLE_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'SGD', 'JPY'];

export const MerchantsPage = () => {
  const { isAdmin } = useAuth();

  const [merchants, setMerchants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // View Details Modal State
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Create Merchant Modal State (Admin Only)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createCurrency, setCreateCurrency] = useState('USD');
  const [createGateways, setCreateGateways] = useState(['STRIPE', 'RAZORPAY', 'ADYEN', 'PAYPAL']);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchMerchants = async () => {
    setIsLoading(true);
    try {
      const res = await merchantsApi.getMerchants({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setMerchants(res.merchants || []);
    } catch (err) {
      console.error('Failed to fetch merchants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMerchants();
  };

  const toggleGatewaySelection = (gw) => {
    if (createGateways.includes(gw)) {
      if (createGateways.length > 1) {
        setCreateGateways(createGateways.filter((g) => g !== gw));
      }
    } else {
      setCreateGateways([...createGateways, gw]);
    }
  };

  const handleCreateMerchant = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');

    try {
      await merchantsApi.createMerchant({
        name: createName,
        merchantCode: createCode.toUpperCase(),
        contactEmail: createEmail,
        supportedGateways: createGateways,
        defaultCurrency: createCurrency,
      });

      setIsCreateOpen(false);
      setCreateName('');
      setCreateCode('');
      setCreateEmail('');
      setCreateCurrency('USD');
      setCreateGateways(['STRIPE', 'RAZORPAY', 'ADYEN', 'PAYPAL']);
      fetchMerchants();
    } catch (err) {
      setCreateError(err.message || 'Failed to create merchant');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateStatus = async (merchantId, newStatus) => {
    try {
      await merchantsApi.updateMerchantStatus(merchantId, newStatus);
      if (selectedMerchant && selectedMerchant._id === merchantId) {
        setSelectedMerchant({ ...selectedMerchant, status: newStatus });
      }
      fetchMerchants();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDeleteMerchant = async (merchant) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete '${merchant.name}' (${merchant.merchantCode})?\n\nThis will remove the tenant from your roster and cease all payment routing.`
    );
    if (!confirmDelete) return;

    try {
      await merchantsApi.deleteMerchant(merchant._id);
      if (selectedMerchant && selectedMerchant._id === merchant._id) {
        setIsDetailsOpen(false);
        setSelectedMerchant(null);
      }
      fetchMerchants();
    } catch (err) {
      alert(`Failed to delete merchant: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Merchant Accounts & Multi-Tenant Scopes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure payment routing, gateway support, and retry policies for onboarded tenants.
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            icon={Plus}
          >
            New Merchant
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by merchant name or code (e.g. ACME)..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="glass-input rounded-xl text-xs py-2.5 px-3 text-white"
            >
              <option value="" className="bg-slate-900">All Statuses</option>
              <option value="ACTIVE" className="bg-slate-900">Active Only</option>
              <option value="INACTIVE" className="bg-slate-900">Inactive Only</option>
              <option value="SUSPENDED" className="bg-slate-900">Suspended Only</option>
            </select>

            <Button type="submit" variant="secondary" size="md">
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Merchants Grid */}
      {isLoading ? (
        <SkeletonLoader count={4} className="h-20" />
      ) : merchants.length === 0 ? (
        <Card>
          <EmptyState
            icon={Store}
            title="No merchants found"
            description="No merchant accounts match your search filters."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {merchants.map((merchant) => (
            <Card key={merchant._id} className="p-5 flex flex-col justify-between hover:border-cyan-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                    {merchant.merchantCode}
                  </span>
                  <Badge variant={merchant.status} size="sm" dot>
                    {merchant.status}
                  </Badge>
                </div>

                <h3 className="text-base font-semibold text-white tracking-tight">{merchant.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{merchant.contactEmail}</p>

                <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Default Currency:</span>
                    <span className="font-semibold text-cyan-300">{merchant.configuration?.defaultCurrency || 'USD'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Allowed Gateways:</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                      {(merchant.configuration?.supportedGateways || ['STRIPE']).map((gw) => (
                        <span key={gw} className="text-[10px] font-semibold bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded text-cyan-300">
                          {gw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedMerchant(merchant);
                    setIsDetailsOpen(true);
                  }}
                  icon={Eye}
                >
                  Inspect Config
                </Button>

                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={merchant.status}
                      onChange={(e) => handleUpdateStatus(merchant._id, e.target.value)}
                      className={`text-xs py-1 px-2 rounded-lg border font-semibold outline-none cursor-pointer ${
                        merchant.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : merchant.status === 'SUSPENDED'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      <option value="ACTIVE" className="bg-slate-900 text-white">Active</option>
                      <option value="INACTIVE" className="bg-slate-900 text-white">Inactive</option>
                      <option value="SUSPENDED" className="bg-slate-900 text-white">Suspend</option>
                    </select>

                    <button
                      type="button"
                      title="Delete Merchant"
                      onClick={() => handleDeleteMerchant(merchant)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Inspect Details Modal */}
      {selectedMerchant && (
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`Merchant Configuration: ${selectedMerchant.name}`}
          subtitle={`Merchant Code: ${selectedMerchant.merchantCode}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div>
                <span className="text-slate-400">Contact Email:</span>
                <p className="font-semibold text-white mt-0.5">{selectedMerchant.contactEmail}</p>
              </div>
              <div>
                <span className="text-slate-400">Account Status:</span>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={selectedMerchant.status} size="sm">
                    {selectedMerchant.status}
                  </Badge>
                  {isAdmin && (
                    <select
                      value={selectedMerchant.status}
                      onChange={(e) => handleUpdateStatus(selectedMerchant._id, e.target.value)}
                      className="bg-slate-900 border border-white/20 text-xs rounded px-2 py-0.5 text-white"
                    >
                      <option value="ACTIVE">Set Active</option>
                      <option value="INACTIVE">Set Inactive</option>
                      <option value="SUSPENDED">Set Suspended</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                Enabled Payment Gateways
              </h4>
              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                {(selectedMerchant.configuration?.supportedGateways || ['STRIPE']).map((gw) => (
                  <span key={gw} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-semibold text-xs flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    {gw}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                Retry & Failover Policy
              </h4>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Auto-Retries:</span>
                  <span className="text-white font-semibold">
                    {selectedMerchant.configuration?.retryPolicy?.maxRetries || 3} attempts
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Backoff Delay Factor:</span>
                  <span className="text-white font-semibold">
                    {selectedMerchant.configuration?.retryPolicy?.backoffFactorMs || 1000}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gateway Timeout:</span>
                  <span className="text-white font-semibold">
                    {selectedMerchant.configuration?.retryPolicy?.timeoutMs || 5000}ms
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                Webhook Notification Secret
              </h4>
              <div className="p-2.5 rounded-xl bg-slate-900/60 font-mono text-[11px] text-cyan-300 border border-white/10 break-all">
                {selectedMerchant.configuration?.webhookSecret || 'whsec_simulated_test_secret_123'}
              </div>
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                <span className="text-slate-400 text-[11px]">Danger Zone:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteMerchant(selectedMerchant)}
                  icon={Trash2}
                  className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                >
                  Delete Merchant Account
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Create Merchant Modal (Admin) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Onboard New Enterprise Merchant"
        subtitle="Registers a tenant profile with customizable gateway routing and currency settings"
      >
        <form onSubmit={handleCreateMerchant} className="space-y-4 text-xs">
          {createError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {createError}
            </div>
          )}

          <Input
            label="Merchant Business Name"
            placeholder="Acme Global Payments Corp"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unique Merchant Code"
              placeholder="MCH_ACME_001"
              value={createCode}
              onChange={(e) => setCreateCode(e.target.value)}
              helperText="Uppercase identifier"
              required
            />

            <div>
              <label className="block text-slate-400 font-medium mb-1">Default Settlement Currency</label>
              <select
                value={createCurrency}
                onChange={(e) => setCreateCurrency(e.target.value)}
                className="glass-input w-full rounded-xl py-2 px-3 text-white"
              >
                {AVAILABLE_CURRENCIES.map((curr) => (
                  <option key={curr} value={curr} className="bg-slate-900">
                    {curr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Billing & Operations Contact Email"
            type="email"
            placeholder="payments@acme.com"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
            required
          />

          {/* Supported Gateways Multi-Select */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">
              Allowed Payment Gateways (Click to toggle)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_GATEWAYS.map((gw) => {
                const isSelected = createGateways.includes(gw);
                return (
                  <button
                    key={gw}
                    type="button"
                    onClick={() => toggleGatewaySelection(gw)}
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
            <p className="text-[11px] text-slate-400 mt-1">
              Selected: {createGateways.join(', ')}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createLoading}
              icon={Plus}
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MerchantsPage;
