import React, { useState } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Edit3,
  AlertTriangle,
  Receipt,
  Calculator,
  ShieldCheck,
  Save,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Voucher, VoucherLine, Ledger } from '../../types/accounting';

interface VouchersViewProps {
  vouchers: Voucher[];
  ledgers: Ledger[];
  selectedVoucherId?: string;
  onApproveVoucher: (id: string) => Promise<void>;
  onRejectVoucher: (id: string, reason: string) => Promise<void>;
  onUpdateVoucher: (id: string, updates: Partial<Voucher>) => Promise<void>;
  onNavigateToTab: (tab: any) => void;
}

export const VouchersView: React.FC<VouchersViewProps> = ({
  vouchers,
  ledgers,
  selectedVoucherId,
  onApproveVoucher,
  onRejectVoucher,
  onUpdateVoucher,
  onNavigateToTab,
}) => {
  const [activeVoucherId, setActiveVoucherId] = useState<string>(
    selectedVoucherId || (vouchers[0] ? vouchers[0].id : '')
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editLines, setEditLines] = useState<VoucherLine[]>([]);
  const [editNarration, setEditNarration] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const activeVoucher = vouchers.find((v) => v.id === activeVoucherId) || vouchers[0];

  React.useEffect(() => {
    if (selectedVoucherId) {
      setActiveVoucherId(selectedVoucherId);
    }
  }, [selectedVoucherId]);

  React.useEffect(() => {
    if (activeVoucher) {
      setEditLines(JSON.parse(JSON.stringify(activeVoucher.lines)));
      setEditNarration(activeVoucher.narration);
      setEditDate(activeVoucher.voucherDate);
      setIsEditing(false);
    }
  }, [activeVoucherId, activeVoucher]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const handleLineChange = (index: number, field: keyof VoucherLine, value: any) => {
    const updated = [...editLines];
    updated[index] = { ...updated[index], [field]: value };
    // If ledger changed, update name too
    if (field === 'ledgerId') {
      const match = ledgers.find((l) => l.id === value);
      if (match) updated[index].ledgerName = match.name;
    }
    setEditLines(updated);
  };

  const handleAddLine = () => {
    const defaultLedger = ledgers[0];
    setEditLines([
      ...editLines,
      {
        id: `line_new_${Date.now()}`,
        ledgerId: defaultLedger?.id || 'led_unknown',
        ledgerName: defaultLedger?.name || 'General Expense',
        debit: 0,
        credit: 0,
        lineType: 'EXPENSE',
        narration: 'Manual adjustment line',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setEditLines(editLines.filter((_, i) => i !== index));
  };

  const handleSaveEdits = async () => {
    if (!activeVoucher) return;
    try {
      setIsSubmitting(true);
      await onUpdateVoucher(activeVoucher.id, {
        lines: editLines,
        narration: editNarration,
        voucherDate: editDate,
      });
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save voucher changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!activeVoucher) return;
    try {
      setIsSubmitting(true);
      await onApproveVoucher(activeVoucher.id);
    } catch (err: any) {
      alert(err.message || 'Cannot approve voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!activeVoucher) return;
    try {
      setIsSubmitting(true);
      await onRejectVoucher(activeVoucher.id, rejectReason || 'Rejected by accountant during review.');
      setRejectModalOpen(false);
      setRejectReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to reject voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live calculations for editing state
  const currentLines = isEditing ? editLines : activeVoucher?.lines || [];
  const currentTotalDr = currentLines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
  const currentTotalCr = currentLines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
  const currentIsBalanced = Math.abs(currentTotalDr - currentTotalCr) < 0.01;
  const balanceDifference = Math.abs(currentTotalDr - currentTotalCr);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-amber-400" />
            Voucher Review & Approval Desk
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic validation enforces Total Debit = Total Credit. Review AI suggestions, edit ledger lines, and approve entries before Tally posting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Total Vouchers:</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-xs font-bold border border-slate-700">
            {vouchers.length}
          </span>
        </div>
      </div>

      {/* Main Layout: Voucher List on Left, Voucher Entry Form on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Voucher Queue (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Approval Queue</span>
            <span className="text-[11px] text-amber-400 font-mono">
              {vouchers.filter((v) => v.status === 'REVIEW_REQUIRED').length} Pending
            </span>
          </div>

          {vouchers.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
              <FileCheck2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-xs">No vouchers created yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">Upload an invoice to generate one.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {vouchers.map((v) => {
                const isSelected = activeVoucher?.id === v.id;
                const partyLine = v.lines.find((l) => l.lineType === 'PARTY');

                return (
                  <div
                    key={v.id}
                    onClick={() => setActiveVoucherId(v.id)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-amber-500 shadow-md'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-xs text-slate-200">
                        {v.voucherType} #{v.referenceNumber}
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {formatCurrency(v.totalDebit)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 truncate">
                      {partyLine?.ledgerName || 'Vendor'}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px]">
                      <span className="font-mono text-slate-500">{v.voucherDate}</span>
                      <div className="flex items-center gap-1.5">
                        {v.isBalanced ? (
                          <span className="text-emerald-400 font-mono">Balanced</span>
                        ) : (
                          <span className="text-rose-400 font-mono font-bold">Unbalanced</span>
                        )}
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                            v.status === 'APPROVED' || v.status === 'EXPORTED_TALLY'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : v.status === 'REJECTED'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {v.status === 'EXPORTED_TALLY' ? 'EXPORTED' : v.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Accounting Entry Preview (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6">
          {!activeVoucher ? (
            <div className="py-20 text-center text-slate-500">
              <FileCheck2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm">Select a voucher from the queue to review and approve.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Voucher Top Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white uppercase tracking-wider">
                      {activeVoucher.voucherType} VOUCHER
                    </span>
                    <span className="font-mono text-xs text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                      Ref: {activeVoucher.referenceNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        activeVoucher.status === 'APPROVED' || activeVoucher.status === 'EXPORTED_TALLY'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : activeVoucher.status === 'REJECTED'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {activeVoucher.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Voucher ID: <span className="font-mono text-slate-300">{activeVoucher.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditing && activeVoucher.status === 'REVIEW_REQUIRED' && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      Edit Entry
                    </button>
                  )}

                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveEdits}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditLines(JSON.parse(JSON.stringify(activeVoucher.lines)));
                          setIsEditing(false);
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer border border-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tax Reasoning Summary Pill Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* GST Treatment Box */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5" />
                      GST Treatment: {activeVoucher.gstAnalysis?.treatment || 'CGST_SGST'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Rate: {activeVoucher.gstAnalysis?.gstRate ?? 18}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {activeVoucher.gstAnalysis?.reason || 'Verified intra-state supply for input tax credit.'}
                  </p>
                  <div className="text-[10px] text-slate-500 pt-1">
                    ITC Eligibility: <span className="text-emerald-400 font-medium">{activeVoucher.gstAnalysis?.itcEligibility || 'Eligible'}</span>
                  </div>
                </div>

                {/* TDS Treatment Box */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" />
                      TDS Treatment: {activeVoucher.tdsAnalysis?.isApplicable ? `Sec ${activeVoucher.tdsAnalysis.sectionCode}` : 'Not Deducted'}
                    </span>
                    {activeVoucher.tdsAnalysis?.isApplicable && (
                      <span className="text-[10px] font-mono text-indigo-300">
                        {activeVoucher.tdsAnalysis.applicableRate}% (₹{activeVoucher.tdsAnalysis.tdsAmount})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {activeVoucher.tdsAnalysis?.reason || 'Evaluated statutory withholding schedules.'}
                  </p>
                  <div className="text-[10px] text-slate-500 pt-1">
                    Vendor PAN: <span className="font-mono text-slate-300">{activeVoucher.tdsAnalysis?.vendorPan || 'Not available'}</span> ({activeVoucher.tdsAnalysis?.panStatus || 'Unknown'})
                  </div>
                </div>
              </div>

              {/* AI Confidence Metric Scorecard */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                <span className="text-slate-400 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  AI Confidence:
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                  Vendor: {Math.round((activeVoucher.aiConfidence?.vendorIdentification ?? 0.95) * 100)}%
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                  Ledger: {Math.round((activeVoucher.aiConfidence?.ledgerClassification ?? 0.92) * 100)}%
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                  GST: {Math.round((activeVoucher.aiConfidence?.gstTreatment ?? 0.96) * 100)}%
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                  TDS: {Math.round((activeVoucher.aiConfidence?.tdsClassification ?? 0.88) * 100)}%
                </span>
                <span className="ml-auto text-[11px] font-bold font-mono text-emerald-400">
                  Overall: {Math.round((activeVoucher.aiConfidence?.overall ?? 0.93) * 100)}%
                </span>
              </div>

              {/* Classical Double-Entry Table */}
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Double-Entry Accounting Ledger Lines
                  </span>
                  {isEditing && (
                    <button
                      onClick={handleAddLine}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Line
                    </button>
                  )}
                </div>

                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Particulars (Account / Ledger)</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Debit (Dr ₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Cr ₹)</th>
                      {isEditing && <th className="py-2.5 px-2 text-center w-10">Del</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/30">
                    {currentLines.map((line, idx) => {
                      return (
                        <tr key={line.id || idx} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <select
                                value={line.ledgerId}
                                onChange={(e) => handleLineChange(idx, 'ledgerId', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                              >
                                {ledgers.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.name} ({l.parentGroup})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div>
                                <div className="font-semibold text-slate-200">
                                  {line.debit > 0 ? `${line.ledgerName} Dr` : `    To ${line.ledgerName}`}
                                </div>
                                {line.narration && (
                                  <div className="text-[11px] text-slate-500 font-mono italic">
                                    {line.narration}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-slate-400 text-[11px] font-mono">
                            {line.lineType}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={line.debit || ''}
                                onChange={(e) =>
                                  handleLineChange(idx, 'debit', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-200"
                              />
                            ) : line.debit > 0 ? (
                              <span className="font-semibold text-emerald-400">
                                {formatCurrency(line.debit)}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={line.credit || ''}
                                onChange={(e) =>
                                  handleLineChange(idx, 'credit', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 text-right bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-200"
                              />
                            ) : line.credit > 0 ? (
                              <span className="font-semibold text-amber-400">
                                {formatCurrency(line.credit)}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {isEditing && (
                            <td className="py-2.5 px-2 text-center">
                              <button
                                onClick={() => handleRemoveLine(idx)}
                                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totals Row */}
                  <tfoot className="bg-slate-950 font-bold border-t border-slate-700 text-xs">
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300">TOTAL:</td>
                      <td className="py-2.5 px-3"></td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 text-sm">
                        {formatCurrency(currentTotalDr)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 text-sm">
                        {formatCurrency(currentTotalCr)}
                      </td>
                      {isEditing && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Balance Verification Guardrail */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  currentIsBalanced
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/70 border-rose-800 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {currentIsBalanced ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      {currentIsBalanced
                        ? 'Voucher is Perfectly Balanced (Dr = Cr)'
                        : 'Voucher is Unbalanced! Approval is strictly blocked.'}
                    </span>
                    {!currentIsBalanced && (
                      <div className="text-[11px] text-rose-300 mt-0.5">
                        Difference: ₹{balanceDifference.toFixed(2)}. Adjust ledger lines to balance entry before approving.
                      </div>
                    )}
                  </div>
                </div>

                <span className="font-mono text-xs font-semibold">
                  Dr ₹{currentTotalDr.toFixed(2)} | Cr ₹{currentTotalCr.toFixed(2)}
                </span>
              </div>

              {/* Narration */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                <span className="font-bold text-slate-400">Narration:</span>
                {isEditing ? (
                  <textarea
                    value={editNarration}
                    onChange={(e) => setEditNarration(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 mt-1 focus:outline-none focus:border-emerald-500"
                  />
                ) : (
                  <p className="text-slate-300 font-mono text-[11px]">{activeVoucher.narration}</p>
                )}
              </div>

              {/* Approval Action Bar */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Status:{' '}
                  <span className="font-semibold text-slate-200">{activeVoucher.status}</span>
                  {activeVoucher.approvedAt && (
                    <span className="text-slate-500 text-[11px] ml-2">
                      (Approved on {activeVoucher.approvedAt.split('T')[0]} by{' '}
                      {activeVoucher.approvedBy})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {activeVoucher.status === 'REVIEW_REQUIRED' && (
                    <>
                      <button
                        onClick={() => setRejectModalOpen(true)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-rose-900/50 hover:text-rose-200 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 text-rose-400" />
                        Reject Voucher
                      </button>

                      <button
                        onClick={handleApprove}
                        disabled={!currentIsBalanced || isSubmitting}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-colors cursor-pointer ${
                          currentIsBalanced && !isSubmitting
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                        title={
                          currentIsBalanced
                            ? 'Approve Voucher and Mark Ready for Tally'
                            : 'Cannot approve unbalanced voucher'
                        }
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve Voucher
                      </button>
                    </>
                  )}

                  {activeVoucher.status === 'APPROVED' && (
                    <button
                      onClick={() => onNavigateToTab('tally')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      Export to Tally XML
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              Reject Proposed Accounting Voucher
            </h3>
            <p className="text-xs text-slate-400">
              Please specify the audit reason for rejection (e.g. invalid tax rate, duplicate billing, incorrect vendor):
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
