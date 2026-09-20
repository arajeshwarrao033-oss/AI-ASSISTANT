import React from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Receipt,
  Landmark,
  ArrowUpRight,
  UploadCloud,
  FileCheck2,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { AccountingDocument, Voucher, AccountingException } from '../../types/accounting';

interface DashboardViewProps {
  stats: any;
  recentDocuments: AccountingDocument[];
  recentVouchers: Voucher[];
  exceptions: AccountingException[];
  onNavigateToTab: (tab: any) => void;
  onSelectVoucher: (voucherId: string) => void;
  onSelectDocument: (docId: string) => void;
  onLoadSampleInvoice: (type: 'consulting' | 'cloud' | 'rent') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentDocuments,
  recentVouchers,
  exceptions,
  onNavigateToTab,
  onSelectVoucher,
  onSelectDocument,
  onLoadSampleInvoice,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'EXPORTED_TALLY':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            {status === 'EXPORTED_TALLY' ? 'TALLY EXPORTED' : 'APPROVED'}
          </span>
        );
      case 'REVIEW_REQUIRED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
            REVIEW REQUIRED
          </span>
        );
      case 'AI_PROCESSED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
            AI PROCESSED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
            REJECTED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner with Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Accounting Copilot Workspace</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-400 border border-emerald-800 font-normal">
              Active FY 2024-25
            </span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Automate invoice extraction, Indian GST/TDS tax treatment, and proposed voucher generation with reviewable human approval.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateToTab('documents')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Document
          </button>

          {/* Quick test sample invoice presets */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <span className="text-[11px] text-slate-400 px-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Test Sample:
            </span>
            <button
              onClick={() => onLoadSampleInvoice('consulting')}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors cursor-pointer"
              title="Tech Consulting Bill with 18% Intra-State GST and Section 194J TDS"
            >
              194J Advisory
            </button>
            <button
              onClick={() => onLoadSampleInvoice('cloud')}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors cursor-pointer"
              title="Inter-State Karnataka Cloud Server invoice with 18% IGST"
            >
              IGST Cloud
            </button>
            <button
              onClick={() => onLoadSampleInvoice('rent')}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors cursor-pointer"
              title="Commercial Office Rent Bill with 10% Section 194I TDS"
            >
              194I Rent
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Total Docs */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Uploaded</span>
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {stats?.documentsUploaded ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats?.documentsPendingReview ?? 0} awaiting review
          </div>
        </div>

        {/* Awaiting Approval */}
        <div className="bg-slate-900 border border-amber-900/50 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-medium">Awaiting Approval</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-300 font-mono">
            {stats?.vouchersAwaitingApproval ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Proposed vouchers</div>
        </div>

        {/* Approved Vouchers */}
        <div className="bg-slate-900 border border-emerald-900/50 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-medium">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-300 font-mono">
            {stats?.approvedVouchers ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Ready for Tally export</div>
        </div>

        {/* Open Exceptions */}
        <div className="bg-slate-900 border border-rose-900/50 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-medium">Open Exceptions</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-300 font-mono">
            {stats?.openExceptions ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats?.possibleDuplicates ?? 0} duplicates flagged
          </div>
        </div>

        {/* GST / TDS Issues */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Tax Exceptions</span>
            <Receipt className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-200 font-mono">
            {(stats?.gstExceptions ?? 0) + (stats?.tdsExceptions ?? 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            GST: {stats?.gstExceptions ?? 0} | TDS: {stats?.tdsExceptions ?? 0}
          </div>
        </div>
      </div>

      {/* Main Split Sections: Vouchers Queue & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vouchers Awaiting Approval (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-amber-400" />
                Vouchers Awaiting Accountant Approval
              </h2>
              <p className="text-xs text-slate-400">
                AI proposed double-entry vouchers with GST & TDS classifications.
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('vouchers')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium cursor-pointer"
            >
              View All ({recentVouchers.length})
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentVouchers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
              <FileCheck2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium text-slate-400">No vouchers pending approval</p>
              <p className="text-xs text-slate-500 mt-1">
                Upload an invoice or load a sample invoice to test the accounting classification.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Ref / Invoice</th>
                    <th className="py-2.5 px-3">Party Ledger</th>
                    <th className="py-2.5 px-3 text-right">Debit / Credit</th>
                    <th className="py-2.5 px-3 text-center">AI Conf.</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {recentVouchers.slice(0, 5).map((v) => {
                    const partyLine = v.lines.find((l) => l.lineType === 'PARTY');
                    return (
                      <tr key={v.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{v.voucherDate}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-200">{v.voucherType}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{v.referenceNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-200 truncate max-w-[160px]">
                          {partyLine?.ledgerName || 'Vendor'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">
                          {formatCurrency(v.totalDebit)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                            {Math.round((v.aiConfidence?.overall ?? 0.9) * 100)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">{getStatusBadge(v.status)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onSelectVoucher(v.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer border border-slate-700"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Critical Alerts & Exceptions Widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Active Accounting Exceptions
              </h2>
              <button
                onClick={() => onNavigateToTab('exceptions')}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                View All
              </button>
            </div>

            {exceptions.filter((e) => e.status === 'OPEN').length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/80" />
                <p className="text-xs font-medium text-slate-300">Clean Audit Status</p>
                <p className="text-[11px] text-slate-500 mt-1">No open tax or ledger exceptions.</p>
              </div>
            ) : (
              <div className="space-y-2.5 mt-3">
                {exceptions
                  .filter((e) => e.status === 'OPEN')
                  .slice(0, 4)
                  .map((ex) => (
                    <div
                      key={ex.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            ex.severity === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : ex.severity === 'HIGH'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {ex.severity}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {ex.createdAt.split('T')[0]}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-200">{ex.title}</div>
                      <div className="text-[11px] text-slate-400 leading-tight">
                        {ex.description}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800">
            <button
              onClick={() => onNavigateToTab('tally')}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
              Ready to Export to TallyPrime
            </button>
          </div>
        </div>
      </div>

      {/* Recent Documents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Recent Documents & Extraction Log
            </h2>
            <p className="text-xs text-slate-400">
              Uploaded invoices with file hashes and duplicate detection verification.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('documents')}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium cursor-pointer"
          >
            All Documents ({recentDocuments.length})
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentDocuments.length === 0 ? (
          <div className="py-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
            <FileText className="w-7 h-7 mx-auto mb-2 text-slate-600" />
            <p className="text-xs font-medium text-slate-400">No documents uploaded yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Click &quot;Upload Document&quot; or test with one of the sample invoices above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Supplier GSTIN</th>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">Gross Amount</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentDocuments.slice(0, 5).map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-200 truncate max-w-[180px]">
                      {d.fileName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 truncate max-w-[160px]">
                      {d.supplierName || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {d.supplierGstin || 'Unregistered'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{d.invoiceNumber || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{d.invoiceDate || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {formatCurrency(d.taxableAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">
                      {formatCurrency(d.grossAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">{getStatusBadge(d.status)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectDocument(d.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer border border-slate-700"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
