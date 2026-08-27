import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../api/reports.api';
import {
  FileSpreadsheet,
  Download,
  Trash2,
  Plus,
  RefreshCw,
  FileText,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SkeletonLoader, EmptyState } from '../components/ui/EmptyState';

export const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate Report Modal State
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [reportType, setReportType] = useState('TRANSACTION_SUMMARY');
  const [format, setFormat] = useState('CSV');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await reportsApi.listReports();
      setReports(res.reports || []);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerateError('');

    try {
      await reportsApi.createReport({
        reportType,
        format,
        filtersUsed: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          gateway: gatewayFilter || undefined,
        },
      });

      setIsGenerateOpen(false);
      fetchReports();
    } catch (err) {
      setGenerateError(err.message || 'Report generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (report) => {
    try {
      const data = await reportsApi.downloadReport(report._id);
      const mimeType =
        report.format === 'XLSX'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv;charset=utf-8;';
      const blob = new Blob([data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = report.format === 'XLSX' ? 'xlsx' : 'csv';
      link.setAttribute('download', `${report.reportType}_${report._id}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await reportsApi.deleteReport(id);
      fetchReports();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Operational Report Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Export structured enterprise datasets in RFC 4180 CSV and Microsoft Excel SpreadsheetML formats.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={fetchReports} icon={RefreshCw}>
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsGenerateOpen(true)}
            icon={Plus}
          >
            Generate Report
          </Button>
        </div>
      </div>

      {/* Reports Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <SkeletonLoader count={4} className="h-14" />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="No reports generated yet"
            description="Create your first financial or failure analysis export by clicking 'Generate Report'."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Report Type</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Rows</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Generated At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.map((r) => (
                  <tr key={r._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        {r.reportType}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-cyan-300">
                        {r.format}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={r.status === 'READY' ? 'success' : r.status === 'FAILED' ? 'failed' : 'processing'} size="sm" dot>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {r.rowCount !== null ? r.rowCount.toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {r.fileSizeBytes ? `${(r.fileSizeBytes / 1024).toFixed(1)} KB` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {r.generatedAt ? new Date(r.generatedAt).toLocaleString() : new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === 'READY' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownload(r)}
                            icon={Download}
                          >
                            Download
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(r._id)}
                          icon={Trash2}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Generate Report Modal */}
      <Modal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Generate Operational Dataset Report"
        subtitle="Asynchronously queries and compiles verified payment logs and classification metadata"
      >
        <form onSubmit={handleGenerateReport} className="space-y-4 text-xs">
          {generateError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {generateError}
            </div>
          )}

          <div>
            <label className="block text-slate-400 font-medium mb-1">Report Domain</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="glass-input w-full rounded-xl py-2 px-3 text-white"
            >
              <option value="TRANSACTION_SUMMARY" className="bg-slate-900">
                Transaction Summary (Ledger details)
              </option>
              <option value="FAILURE_ANALYSIS" className="bg-slate-900">
                Failure Analysis (ISO codes & reasons)
              </option>
              <option value="MERCHANT_RECONCILIATION" className="bg-slate-900">
                Merchant Reconciliation (Volume & success rates)
              </option>
              <option value="GATEWAY_PERFORMANCE" className="bg-slate-900">
                Gateway Performance (Processor benchmarks)
              </option>
              <option value="AUDIT_TRAIL" className="bg-slate-900">
                Audit Trail (System events & compliance)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Export Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('CSV')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  format === 'CSV'
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                CSV (RFC 4180)
              </button>
              <button
                type="button"
                onClick={() => setFormat('XLSX')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  format === 'XLSX'
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                Microsoft Excel (XLSX)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={() => setIsGenerateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isGenerating} icon={FileSpreadsheet}>
              Compile & Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
