import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../api/analytics.api';
import { webhooksApi } from '../api/webhooks.api';
import { merchantsApi } from '../api/merchants.api';
import {
  DollarSign,
  CheckCircle2,
  AlertOctagon,
  Store,
  TrendingUp,
  Activity,
  Zap,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { SkeletonLoader } from '../components/ui/EmptyState';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const DashboardPage = () => {
  const { user, isMerchant } = useAuth();

  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [merchantsList, setMerchantsList] = useState([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Webhook Simulator Modal State
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [simMerchantCode, setSimMerchantCode] = useState('MCH_ACME_001');
  const [simGateway, setSimGateway] = useState('STRIPE');
  const [simStatus, setSimStatus] = useState('FAILED');
  const [simAmount, setSimAmount] = useState('150.00');
  const [simFailure, setSimFailure] = useState('card_declined_insufficient_funds-51');
  const [simLoading, setSimLoading] = useState(false);
  const [simMessage, setSimMessage] = useState('');

  const fetchMerchants = async () => {
    try {
      const res = await merchantsApi.getMerchants();
      setMerchantsList(res.merchants || []);
    } catch (e) {
      console.warn('Could not load merchant list:', e);
    }
  };

  const fetchDashboardData = async (mId = selectedMerchantId) => {
    try {
      const params = mId ? { merchantId: mId } : {};
      const [summaryRes, trendRes, categoryRes, activityRes] = await Promise.all([
        analyticsApi.getSummary(params).catch(() => ({ data: {} })),
        analyticsApi.getPaymentsTrend({ groupBy: 'day', ...params }).catch(() => ({ data: { trend: [] } })),
        analyticsApi.getFailuresByCategory(params).catch(() => ({ data: { breakdown: [] } })),
        analyticsApi.getRecentActivity({ limit: 8, ...params }).catch(() => ({ data: { activity: [] } })),
      ]);

      setSummary(summaryRes.data || {});
      setTrends(trendRes.data?.trend || []);
      setCategories(categoryRes.data?.breakdown || []);
      setRecentActivity(activityRes.data?.activity || []);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (isMerchant && user?.merchant?.merchantCode) {
      setSimMerchantCode(user.merchant.merchantCode);
    }
  }, [user, isMerchant]);

  const handleMerchantChange = (e) => {
    const newId = e.target.value;
    setSelectedMerchantId(newId);
    setIsLoading(true);
    fetchDashboardData(newId);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  const handleSimulateWebhook = async (e) => {
    e.preventDefault();
    setSimLoading(true);
    setSimMessage('');

    const targetCode = isMerchant && user?.merchant?.merchantCode ? user.merchant.merchantCode : simMerchantCode;

    try {
      const res = await webhooksApi.simulateWebhook({
        merchantCode: targetCode,
        gateway: simGateway,
        status: simStatus,
        amount: parseFloat(simAmount) || 100,
        currency: user?.merchant?.configuration?.defaultCurrency || 'USD',
        rawFailureReason: simStatus === 'FAILED' ? simFailure : null,
      });

      setSimMessage(`Success! Payment ${res.payment?.paymentId || 'created'} ingested for ${targetCode}.`);
      setTimeout(() => {
        setIsSimulateOpen(false);
        setSimMessage('');
        fetchDashboardData();
      }, 1200);
    } catch (err) {
      setSimMessage(`Error: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const metrics = summary?.metrics || {};
  const merchants = summary?.merchants;
  const COLORS = ['#38bdf8', '#818cf8', '#f43f5e', '#fbbf24', '#34d399', '#c084fc'];

  return (
    <div className="space-y-6">
      {/* Top Banner: Welcome & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Operations Command Center
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Live Feed
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time payment telemetry, failure taxonomy diagnostics, and revenue metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Merchant Scope Selector (Admin/Support) */}
          {!isMerchant && merchantsList.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900/60 border border-white/10 px-2.5 py-1.5 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={selectedMerchantId}
                onChange={handleMerchantChange}
                className="bg-transparent text-xs text-white outline-none cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-white">All Merchants (Global)</option>
                {merchantsList.map((m) => (
                  <option key={m._id} value={m._id} className="bg-slate-900 text-white">
                    {m.name} ({m.merchantCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            icon={RefreshCw}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSimulateOpen(true)}
            icon={Zap}
          >
            Simulate Webhook
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonLoader count={4} className="h-28" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Processed Volume"
            value={`$${(metrics.totalVolume || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            subtitle={`Avg Ticket: $${(metrics.averageAmount || 0).toFixed(2)}`}
            icon={DollarSign}
            color="cyan"
            trend="+12.4%"
            trendDirection="up"
          />

          <StatCard
            title="Success Rate"
            value={`${metrics.successRate || 0}%`}
            subtitle={`${metrics.successfulPayments || 0} Successful / ${metrics.totalPayments || 0} Total`}
            icon={CheckCircle2}
            color="emerald"
            trend={`${metrics.failureRate || 0}% Failed`}
            trendDirection={metrics.failureRate > 10 ? 'down' : 'up'}
          />

          <StatCard
            title="Failed Transactions"
            value={(metrics.failedPayments || 0).toLocaleString()}
            subtitle={`Action Required: ISO Codes Normalizing`}
            icon={AlertOctagon}
            color="rose"
            trend="Monitored"
            trendDirection="up"
          />

          <StatCard
            title={isMerchant ? 'Assigned Merchant' : 'Active Merchants'}
            value={isMerchant ? (user?.merchant?.merchantCode || 'ACME_001') : `${merchants?.active || 0} / ${merchants?.total || 0}`}
            subtitle={isMerchant ? (user?.merchant?.name || 'Acme Merchant Corp') : 'Enterprise Multitenant Roster'}
            icon={Store}
            color="indigo"
          />
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Time-Series Volume & Success Trend */}
        <Card
          title="Payment Velocity & Outcome Trend"
          subtitle="Daily transaction volume and failure distribution over time"
          icon={TrendingUp}
          className="lg:col-span-2"
        >
          <div className="h-72 w-full mt-2">
            {trends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No trend points recorded for this timeframe
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="failGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.75rem',
                      backdropFilter: 'blur(12px)',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="successfulPayments"
                    name="Successful"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#volGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="failedPayments"
                    name="Failed"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#failGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Right Col: Failure Distribution by Category */}
        <Card
          title="Failure Categories"
          subtitle="Taxonomy normalization breakdown"
          icon={AlertOctagon}
        >
          <div className="h-72 w-full mt-2">
            {categories.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No failure data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.75rem',
                      backdropFilter: 'blur(12px)',
                      fontSize: '11px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-[10px] text-slate-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Live Recent Activity Table */}
      <Card
        title="Live Payment Ingestion Stream"
        subtitle="Recent payment events and classification outputs"
        icon={Activity}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Payment ID</th>
                <th className="pb-3 px-3">Merchant</th>
                <th className="pb-3 px-3">Gateway</th>
                <th className="pb-3 px-3">Bank</th>
                <th className="pb-3 px-3">Amount</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No transactions recorded yet. Use the "Simulate Webhook" button above to ingest events!
                  </td>
                </tr>
              ) : (
                recentActivity.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-cyan-300">
                      {item.paymentId}
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      {item.merchantName} ({item.merchantCode})
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-300">{item.gateway}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {item.issuingBank || 'Chase'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      ${item.amount?.toFixed(2)} {item.currency}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={item.status} size="sm" dot>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px] truncate max-w-xs">
                      {item.rawFailureReason || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Webhook Simulator Modal */}
      <Modal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        title="Simulate Asynchronous Payment Webhook"
        subtitle="Generates an HMAC-SHA256 signed event to test end-to-end ingestion, classification, and queue workers"
      >
        <form onSubmit={handleSimulateWebhook} className="space-y-4 text-xs">
          {simMessage && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                simMessage.startsWith('Success')
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {simMessage}
            </div>
          )}

          {/* Target Merchant Selector */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Merchant Tenant</label>
            {isMerchant && user?.merchant ? (
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-cyan-300 font-semibold font-mono text-xs flex items-center justify-between">
                <span>{user.merchant.name || 'Your Company'}</span>
                <span className="bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-[11px]">
                  {user.merchant.merchantCode}
                </span>
              </div>
            ) : (
              <select
                value={simMerchantCode}
                onChange={(e) => setSimMerchantCode(e.target.value)}
                className="glass-input w-full rounded-xl py-2 px-3 text-white"
              >
                {merchantsList.length > 0 ? (
                  merchantsList.map((m) => (
                    <option key={m._id} value={m.merchantCode} className="bg-slate-900">
                      {m.name} ({m.merchantCode})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="MCH_ACME_001" className="bg-slate-900">Acme Corporation (MCH_ACME_001)</option>
                    <option value="MCH_GLOBEX_002" className="bg-slate-900">Globex Retail (MCH_GLOBEX_002)</option>
                  </>
                )}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Gateway</label>
              <select
                value={simGateway}
                onChange={(e) => setSimGateway(e.target.value)}
                className="glass-input w-full rounded-xl py-2 px-3 text-white"
              >
                {((isMerchant && user?.merchant?.configuration?.supportedGateways) || [
                  'STRIPE',
                  'RAZORPAY',
                  'ADYEN',
                  'PAYPAL',
                ]).map((gw) => (
                  <option key={gw} value={gw} className="bg-slate-900">
                    {gw}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Outcome Status</label>
              <select
                value={simStatus}
                onChange={(e) => setSimStatus(e.target.value)}
                className="glass-input w-full rounded-xl py-2 px-3 text-white"
              >
                <option value="FAILED" className="bg-slate-900">FAILED (Triggers Classification)</option>
                <option value="SUCCESS" className="bg-slate-900">SUCCESS</option>
                <option value="PENDING" className="bg-slate-900">PENDING</option>
              </select>
            </div>
          </div>

          <Input
            label="Transaction Amount (USD)"
            type="number"
            step="0.01"
            value={simAmount}
            onChange={(e) => setSimAmount(e.target.value)}
            required
          />

          {simStatus === 'FAILED' && (
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Raw Decline Reason / ISO Code
              </label>
              <select
                value={simFailure}
                onChange={(e) => setSimFailure(e.target.value)}
                className="glass-input w-full rounded-xl py-2 px-3 text-white"
              >
                <option value="card_declined_insufficient_funds-51" className="bg-slate-900">
                  Insufficient Funds (ISO 51)
                </option>
                <option value="card_validity_expired-54" className="bg-slate-900">
                  Card Expired (ISO 54)
                </option>
                <option value="3ds_authentication_failed-05" className="bg-slate-900">
                  3D-Secure Failed (ISO 05)
                </option>
                <option value="high_risk_fraud_suspected-59" className="bg-slate-900">
                  Suspected Fraud (ISO 59)
                </option>
                <option value="gateway_timeout_upstream_issuer" className="bg-slate-900">
                  Gateway Timeout (NETWORK_TIMEOUT)
                </option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSimulateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={simLoading}
              icon={Zap}
            >
              Send Signed Webhook
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DashboardPage;
