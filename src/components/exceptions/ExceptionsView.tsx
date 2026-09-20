import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  ShieldAlert,
  ArrowRight,
  Check,
  RotateCcw,
} from 'lucide-react';
import { AccountingException } from '../../types/accounting';
import { api } from '../../services/api';

interface ExceptionsViewProps {
  exceptions: AccountingException[];
  onRefresh: () => void;
  onSelectDocument: (id: string) => void;
  onSelectVoucher: (id: string) => void;
}

export const ExceptionsView: React.FC<ExceptionsViewProps> = ({
  exceptions,
  onRefresh,
  onSelectDocument,
  onSelectVoucher,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('OPEN');

  const handleResolve = async (id: string) => {
    try {
      await api.updateException(id, {
        status: 'RESOLVED',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'Senior Accountant',
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update exception');
    }
  };

  const filtered = exceptions.filter((ex) => {
    const matchesSev = filterSeverity === 'ALL' || ex.severity === filterSeverity;
    const matchesStat = filterStatus === 'ALL' || ex.status === filterStatus;
    return matchesSev && matchesStat;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            Central Accounting Exceptions & Risk Board
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Categorized risk alerts covering duplicate invoices, tax rate anomalies, missing HSN/SAC codes, and unmapped parties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Total Exceptions:</span>
          <span className="px-2.5 py-1 rounded bg-slate-800 text-rose-300 font-mono text-xs font-bold border border-slate-700">
            {exceptions.filter((e) => e.status === 'OPEN').length} Open
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Severity:
          </span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterSeverity === s
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Status:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {['OPEN', 'RESOLVED', 'ALL'].map((stat) => (
              <button
                key={stat}
                onClick={() => setFilterStatus(stat)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterStatus === stat
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {stat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Exceptions List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/80" />
            <p className="text-sm font-semibold text-slate-300">No Exceptions in this view</p>
            <p className="text-xs text-slate-500 mt-1">
              All statutory rules and ledger mappings are verified.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Issue Title & Description</th>
                <th className="py-2.5 px-3">Recommended Action</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((ex) => (
                <tr key={ex.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ex.severity === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : ex.severity === 'HIGH'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : ex.severity === 'MEDIUM'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {ex.severity}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                    {ex.category}
                  </td>

                  <td className="py-3 px-3 max-w-sm">
                    <div className="font-bold text-slate-200">{ex.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {ex.description}
                    </div>
                    {ex.relatedDocumentId && (
                      <button
                        onClick={() => onSelectDocument(ex.relatedDocumentId!)}
                        className="text-[11px] text-cyan-400 hover:underline mt-1 inline-flex items-center gap-1"
                      >
                        <span>View Document ({ex.relatedDocumentId})</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    {ex.relatedVoucherId && (
                      <button
                        onClick={() => onSelectVoucher(ex.relatedVoucherId!)}
                        className="text-[11px] text-emerald-400 hover:underline mt-1 inline-flex items-center gap-1 ml-3"
                      >
                        <span>View Voucher ({ex.relatedVoucherId})</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </td>

                  <td className="py-3 px-3 text-[11px] text-slate-300 max-w-xs font-medium">
                    {ex.suggestedAction || 'Review and take corrective action.'}
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                    {ex.createdAt.split('T')[0]}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ex.status === 'RESOLVED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {ex.status}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    {ex.status === 'OPEN' ? (
                      <button
                        onClick={() => handleResolve(ex.id)}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
