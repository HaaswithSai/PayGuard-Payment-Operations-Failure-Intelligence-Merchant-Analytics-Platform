import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analytics.api';
import {
  BarChart3,
  TrendingUp,
  Building,
  CreditCard,
  Store,
  Layers,
  RefreshCw,
  PieChart as PieIcon,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SkeletonLoader } from '../components/ui/EmptyState';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

export const AnalyticsPage = () => {
  const [trends, setTrends] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [banks, setBanks] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [queue, setQueue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('day');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [trendRes, gwRes, bankRes, merchRes, queueRes] = await Promise.all([
        analyticsApi.getPaymentsTrend({ groupBy }).catch(() => ({ data: { trend: [] } })),
        analyticsApi.getFailuresByGateway().catch(() => ({ data: { gateways: [] } })),
        analyticsApi.getFailuresByBank().catch(() => ({ data: { banks: [] } })),
        analyticsApi.getMerchantPerformance().catch(() => ({ data: { merchants: [] } })),
        analyticsApi.getQueueStats().catch(() => ({ data: {} })),
      ]);

      setTrends(trendRes.data?.trend || []);
      setGateways(gwRes.data?.gateways || []);
      setBanks(bankRes.data?.banks || []);
      setMerchants(merchRes.data?.merchants || []);
      setQueue(queueRes.data || {});
    } catch (err) {
      console.error('Failed to load analytics engine:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [groupBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Analytics Aggregation Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-dimensional aggregations, processor latency evaluations, and issuing bank trends.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="glass-input rounded-xl text-xs py-2 px-3 text-white"
          >
            <option value="hour" className="bg-slate-900">Group by Hour</option>
            <option value="day" className="bg-slate-900">Group by Day</option>
            <option value="week" className="bg-slate-900">Group by Week</option>
            <option value="month" className="bg-slate-900">Group by Month</option>
          </select>

          <Button variant="secondary" size="sm" onClick={fetchAnalytics} icon={RefreshCw}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Trends Chart */}
      <Card
        title="Transaction Volume ($) & Failure Velocity Over Time"
        subtitle={`Aggregated on MongoDB by ${groupBy}`}
        icon={TrendingUp}
      >
        <div className="h-72 w-full mt-2">
          {isLoading ? (
            <SkeletonLoader count={1} className="h-64" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
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
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalVolume"
                  name="Gross Volume ($)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#volGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Gateway & Bank Comparisons Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gateway Performance Bar Chart */}
        <Card
          title="Gateway Reliability & Success Rates"
          subtitle="Comparative volume and failure rates across active processors"
          icon={CreditCard}
        >
          <div className="h-64 w-full mt-2">
            {isLoading ? (
              <SkeletonLoader count={1} className="h-56" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gateways}>
                  <XAxis dataKey="gateway" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.75rem',
                      backdropFilter: 'blur(12px)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="successRate" name="Success Rate (%)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failureRate" name="Failure Rate (%)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Issuing Bank Failure Breakdown */}
        <Card
          title="Issuing Bank Failure Distribution"
          subtitle="Top decline counts across card-issuing financial institutions"
          icon={Building}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="pb-3 px-2">Issuing Bank</th>
                  <th className="pb-3 px-2">Failed Count</th>
                  <th className="pb-3 px-2">Share (%)</th>
                  <th className="pb-3 px-2">Failed Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {banks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No bank declines recorded
                    </td>
                  </tr>
                ) : (
                  banks.map((b) => (
                    <tr key={b.bankName} className="hover:bg-white/5">
                      <td className="py-2.5 px-2 font-medium text-white">{b.bankName}</td>
                      <td className="py-2.5 px-2 font-bold text-rose-400">{b.failedCount}</td>
                      <td className="py-2.5 px-2 text-slate-300">{b.percentage}%</td>
                      <td className="py-2.5 px-2 font-mono text-slate-200">${b.failedVolume?.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Merchant Performance Leaderboard */}
      <Card
        title="Merchant Revenue & Health Leaderboard"
        subtitle="Performance, transaction counts, and success rates by tenant"
        icon={Store}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="pb-3 px-3">Merchant Code</th>
                <th className="pb-3 px-3">Merchant Name</th>
                <th className="pb-3 px-3">Total Processed</th>
                <th className="pb-3 px-3">Success Rate</th>
                <th className="pb-3 px-3">Gross Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {merchants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No merchant transaction data available
                  </td>
                </tr>
              ) : (
                merchants.map((m) => (
                  <tr key={m.merchantCode} className="hover:bg-white/5">
                    <td className="py-3 px-3 font-mono font-medium text-cyan-300">{m.merchantCode}</td>
                    <td className="py-3 px-3 text-white font-medium">{m.name}</td>
                    <td className="py-3 px-3 text-slate-300">{m.totalPayments}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-emerald-400">{m.successRate}%</span>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">${m.totalVolume?.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
