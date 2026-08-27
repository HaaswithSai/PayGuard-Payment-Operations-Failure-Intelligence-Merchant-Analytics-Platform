import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../api/analytics.api';
import { webhooksApi } from '../api/webhooks.api';
import {
  CreditCard,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  AlertOctagon,
  Building,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SkeletonLoader, EmptyState } from '../components/ui/EmptyState';

export const PaymentsPage = () => {
  const { isMerchant } = useAuth();

  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Payment Details Modal State
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await analyticsApi.getRecentActivity({
        limit: 50,
      });
      setPayments(res.data?.activity || []);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      !search ||
      p.paymentId?.toLowerCase().includes(search.toLowerCase()) ||
      p.merchantName?.toLowerCase().includes(search.toLowerCase()) ||
      p.merchantCode?.toLowerCase().includes(search.toLowerCase()) ||
      p.issuingBank?.toLowerCase().includes(search.toLowerCase());

    const matchesGateway = !gatewayFilter || p.gateway === gatewayFilter;
    const matchesStatus = !statusFilter || p.status === statusFilter;

    return matchesSearch && matchesGateway && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Payment Financial Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Searchable log of verified payment transactions, metadata snapshots, and gateway outcomes.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchPayments}
          icon={RefreshCw}
        >
          Refresh Ledger
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by Payment ID, Merchant, or Bank (e.g. pay_stripe_101)..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              className="glass-input rounded-xl text-xs py-2.5 px-3 text-white"
            >
              <option value="" className="bg-slate-900">All Gateways</option>
              <option value="STRIPE" className="bg-slate-900">Stripe</option>
              <option value="RAZORPAY" className="bg-slate-900">Razorpay</option>
              <option value="ADYEN" className="bg-slate-900">Adyen</option>
              <option value="PAYPAL" className="bg-slate-900">PayPal</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="glass-input rounded-xl text-xs py-2.5 px-3 text-white"
            >
              <option value="" className="bg-slate-900">All Statuses</option>
              <option value="SUCCESS" className="bg-slate-900">Success</option>
              <option value="FAILED" className="bg-slate-900">Failed</option>
              <option value="PENDING" className="bg-slate-900">Pending</option>
              <option value="REFUNDED" className="bg-slate-900">Refunded</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Payments Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <SkeletonLoader count={5} className="h-14" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payment records found"
            description="No transactions match your search query and filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">Issuing Bank</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Processed Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-cyan-300">
                      {payment.paymentId}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      <div>{payment.merchantName}</div>
                      <div className="text-[10px] text-slate-400">{payment.merchantCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-300">{payment.gateway}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        {payment.issuingBank || 'Chase'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      ${payment.amount?.toFixed(2)} {payment.currency}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={payment.status} size="sm" dot>
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(payment.processedAt).toLocaleDateString()} {new Date(payment.processedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setIsDetailsOpen(true);
                        }}
                        icon={Eye}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title={`Payment Transaction: ${selectedPayment.paymentId}`}
          subtitle={`Merchant: ${selectedPayment.merchantName} (${selectedPayment.merchantCode})`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div>
                <span className="text-slate-400">Amount:</span>
                <p className="font-bold text-base text-white mt-0.5">
                  ${selectedPayment.amount?.toFixed(2)} {selectedPayment.currency}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <div className="mt-1">
                  <Badge variant={selectedPayment.status} size="sm" dot>
                    {selectedPayment.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-slate-400">Gateway:</span>
                <p className="font-semibold text-slate-200 mt-0.5">{selectedPayment.gateway}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Issuing Bank:</span>
                <span className="text-white font-medium">{selectedPayment.issuingBank || 'Chase'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Processed At:</span>
                <span className="text-white font-mono">{new Date(selectedPayment.processedAt).toLocaleString()}</span>
              </div>
              {selectedPayment.rawFailureReason && (
                <div className="pt-2 border-t border-white/10">
                  <span className="text-rose-400 font-semibold block mb-1">
                    Raw Gateway Decline Reason:
                  </span>
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 font-mono text-rose-300 break-all">
                    {selectedPayment.rawFailureReason}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
