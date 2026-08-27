import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { classificationsApi } from '../api/classifications.api';
import {
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Search,
  Filter,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SkeletonLoader, EmptyState } from '../components/ui/EmptyState';

export const ClassificationsPage = () => {
  const { isAdmin, isSupport } = useAuth();

  const [classifications, setClassifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Manual Override Modal
  const [selectedClass, setSelectedClass] = useState(null);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState('INSUFFICIENT_FUNDS');
  const [overrideIso, setOverrideIso] = useState('51');
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Queue Processing
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const fetchClassifications = async () => {
    setIsLoading(true);
    try {
      const res = await classificationsApi.getClassifications({
        category: categoryFilter || undefined,
        source: sourceFilter || undefined,
      });
      setClassifications(res.classifications || []);
    } catch (err) {
      console.error('Failed to load classifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassifications();
  }, [categoryFilter, sourceFilter]);

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClass) return;
    setOverrideLoading(true);

    try {
      await classificationsApi.overrideClassification(selectedClass.payment?._id || selectedClass.payment, {
        predictedCategory: overrideCategory,
        isoCode: overrideIso,
      });
      setIsOverrideOpen(false);
      fetchClassifications();
    } catch (err) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleDrainQueue = async () => {
    setIsProcessingQueue(true);
    try {
      await classificationsApi.triggerQueueProcess(10);
      fetchClassifications();
    } catch (err) {
      alert(`Queue trigger error: ${err.message}`);
    } finally {
      setIsProcessingQueue(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Failure Classification & ISO 8583 Taxonomy
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Normalizes arbitrary gateway decline messages into 10 canonical failure domains with ISO codes.
          </p>
        </div>

        {(isAdmin || isSupport) && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleDrainQueue}
            isLoading={isProcessingQueue}
            icon={Zap}
          >
            Process Pending Queue Jobs
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="glass-input rounded-xl text-xs py-2.5 px-3 text-white"
            >
              <option value="" className="bg-slate-900">All Categories</option>
              <option value="INSUFFICIENT_FUNDS" className="bg-slate-900">Insufficient Funds (51)</option>
              <option value="CARD_EXPIRED" className="bg-slate-900">Card Expired (54)</option>
              <option value="AUTHENTICATION_FAILED" className="bg-slate-900">Auth Failed (05)</option>
              <option value="FRAUD_SUSPECTED" className="bg-slate-900">Fraud Suspected (59)</option>
              <option value="NETWORK_TIMEOUT" className="bg-slate-900">Network Timeout</option>
              <option value="LIMIT_EXCEEDED" className="bg-slate-900">Limit Exceeded (61)</option>
              <option value="OTHERS" className="bg-slate-900">Others</option>
            </select>
          </div>

          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="glass-input rounded-xl text-xs py-2.5 px-3 text-white"
            >
              <option value="" className="bg-slate-900">All Sources</option>
              <option value="RULE_BASED" className="bg-slate-900">Rule-Based Heuristic</option>
              <option value="ML" className="bg-slate-900">Python ML Microservice</option>
              <option value="MANUAL" className="bg-slate-900">Manual Override</option>
            </select>
          </div>

          <Button variant="secondary" size="md" onClick={fetchClassifications} icon={RefreshCw}>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Classifications Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <SkeletonLoader count={5} className="h-14" />
          </div>
        ) : classifications.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No classifications recorded"
            description="Failed payments ingested via webhooks will automatically appear here once classified."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Raw Gateway Reason</th>
                  <th className="py-3 px-4">Normalized Category</th>
                  <th className="py-3 px-4">ISO Code</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {classifications.map((item) => (
                  <tr key={item._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-cyan-300">
                      {item.payment?.paymentId || item.payment}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300 max-w-xs truncate">
                      {item.rawText}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      <span className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-1 rounded-md">
                        {item.predictedCategory}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">
                      {item.isoCode || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-300">
                      {(item.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold bg-white/5 px-2 py-0.5 rounded text-slate-300 border border-white/10">
                        {item.source}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {(isAdmin || isSupport) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedClass(item);
                            setOverrideCategory(item.predictedCategory);
                            setOverrideIso(item.isoCode || '51');
                            setIsOverrideOpen(true);
                          }}
                          icon={Sliders}
                        >
                          Override
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Manual Override Modal */}
      {selectedClass && (
        <Modal
          isOpen={isOverrideOpen}
          onClose={() => setIsOverrideOpen(false)}
          title="Manual Failure Taxonomy Override"
          subtitle={`Adjust classification for payment ${selectedClass.payment?.paymentId || selectedClass.payment}`}
        >
          <form onSubmit={handleOverrideSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-slate-400 block mb-1">Raw Error Message:</span>
              <p className="font-mono text-slate-200">{selectedClass.rawText}</p>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                New Standardized Category
              </label>
              <select
                value={overrideCategory}
                onChange={(e) => setOverrideCategory(e.target.value)}
                className="glass-input w-full rounded-xl py-2 px-3 text-white"
              >
                <option value="INSUFFICIENT_FUNDS" className="bg-slate-900">INSUFFICIENT_FUNDS</option>
                <option value="CARD_EXPIRED" className="bg-slate-900">CARD_EXPIRED</option>
                <option value="AUTHENTICATION_FAILED" className="bg-slate-900">AUTHENTICATION_FAILED</option>
                <option value="FRAUD_SUSPECTED" className="bg-slate-900">FRAUD_SUSPECTED</option>
                <option value="NETWORK_TIMEOUT" className="bg-slate-900">NETWORK_TIMEOUT</option>
                <option value="LIMIT_EXCEEDED" className="bg-slate-900">LIMIT_EXCEEDED</option>
                <option value="INVALID_DETAILS" className="bg-slate-900">INVALID_DETAILS</option>
                <option value="GATEWAY_ERROR" className="bg-slate-900">GATEWAY_ERROR</option>
                <option value="SYSTEM_ERROR" className="bg-slate-900">SYSTEM_ERROR</option>
                <option value="OTHERS" className="bg-slate-900">OTHERS</option>
              </select>
            </div>

            <Input
              label="ISO 8583 Code"
              value={overrideIso}
              onChange={(e) => setOverrideIso(e.target.value)}
              placeholder="51, 54, 05..."
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button type="button" variant="ghost" onClick={() => setIsOverrideOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={overrideLoading}>
                Save Override (1.0 Conf)
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
