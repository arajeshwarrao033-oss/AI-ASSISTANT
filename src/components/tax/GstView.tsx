import React from 'react';
import {
  Percent,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileCheck2,
  ShieldCheck,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { Company, Voucher } from '../../types/accounting';

interface GstViewProps {
  company: Company | null;
  vouchers: Voucher[];
  onSelectVoucher: (id: string) => void;
}

export const GstView: React.FC<GstViewProps> = ({ company, vouchers, onSelectVoucher }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  // Compute aggregate GST numbers across vouchers
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalEligibleItc = 0;
  let totalBlockedItc = 0;
  let rcmTransactionsCount = 0;

  vouchers.forEach((v) => {
    v.lines.forEach((l) => {
      if (l.lineType === 'CGST') totalCgst += l.debit;
      if (l.lineType === 'SGST') totalSgst += l.debit;
      if (l.lineType === 'IGST') totalIgst += l.debit;
    });

    if (v.gstAnalysis?.isRcm) rcmTransactionsCount++;

    if (v.gstAnalysis?.itcEligibility === 'Blocked' || v.gstAnalysis?.itcEligibility === 'Ineligible') {
      const taxSum = v.lines
        .filter((l) => ['CGST', 'SGST', 'IGST'].includes(l.lineType))
        .reduce((sum, l) => sum + l.debit, 0);
      totalBlockedItc += taxSum;
    } else {
      const taxSum = v.lines
        .filter((l) => ['CGST', 'SGST', 'IGST'].includes(l.lineType))
        .reduce((sum, l) => sum + l.debit, 0);
      totalEligibleItc += taxSum;
    }
  });

  const totalInputGst = totalCgst + totalSgst + totalIgst;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Percent className="w-5 h-5 text-emerald-400" />
            Indian GST Rule Engine & ITC Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Validates Place of Supply, intra-state vs inter-state tax routing, Section 17(5) blocked credit, and RCM applicability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Recipient State:</span>
          <span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-300 font-mono text-xs font-semibold border border-slate-700">
            {company?.state} (Code {company?.stateCode})
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Input Tax Credit */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Total Input GST Available</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {formatCurrency(totalInputGst)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            CGST: ₹{totalCgst.toFixed(0)} | SGST: ₹{totalSgst.toFixed(0)} | IGST: ₹{totalIgst.toFixed(0)}
          </div>
        </div>

        {/* Eligible ITC */}
        <div className="p-4 rounded-xl bg-slate-900 border border-emerald-900/60 space-y-1">
          <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Eligible ITC (Table 4A)
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatCurrency(totalEligibleItc)}
          </div>
          <div className="text-[11px] text-slate-400">Fully claimable in GSTR-3B</div>
        </div>

        {/* Ineligible / Blocked ITC */}
        <div className="p-4 rounded-xl bg-slate-900 border border-rose-900/60 space-y-1">
          <div className="text-xs text-rose-400 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Blocked Credit u/s 17(5)
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300">
            {formatCurrency(totalBlockedItc)}
          </div>
          <div className="text-[11px] text-slate-400">Food, personal, motor vehicles</div>
        </div>

        {/* Reverse Charge (RCM) */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">RCM Transactions</div>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            {rcmTransactionsCount}
          </div>
          <div className="text-[11px] text-slate-400">GTA / Legal / Specific services</div>
        </div>
      </div>

      {/* Rules Logic Explanation Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="space-y-1">
          <div className="font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Intra-State Rule
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Supplier State = Recipient State ({company?.stateCode}): Split equally into <strong>Input CGST</strong> and <strong>Input SGST</strong> ledgers.
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Inter-State Rule
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Supplier State ≠ Recipient State ({company?.stateCode}): Route entire tax into <strong>Input IGST</strong> ledger.
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Section 17(5) Blocked Credit
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Expenses like food & beverage, personal consumption, and motor vehicles must be capitalized into expense instead of claimed as ITC.
          </p>
        </div>
      </div>

      {/* Vouchers GST Audit Register */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            GST Classification Audit Register
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">
            {vouchers.length} Vouchers Evaluated
          </span>
        </div>

        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4">Date</th>
              <th className="py-2.5 px-3">Ref #</th>
              <th className="py-2.5 px-3">Vendor / Party</th>
              <th className="py-2.5 px-3">Place of Supply</th>
              <th className="py-2.5 px-3">Treatment</th>
              <th className="py-2.5 px-3 text-right">Taxable</th>
              <th className="py-2.5 px-3 text-right">CGST</th>
              <th className="py-2.5 px-3 text-right">SGST</th>
              <th className="py-2.5 px-3 text-right">IGST</th>
              <th className="py-2.5 px-3 text-center">ITC Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {vouchers.map((v) => {
              const partyLine = v.lines.find((l) => l.lineType === 'PARTY');
              const cgstLine = v.lines.find((l) => l.lineType === 'CGST');
              const sgstLine = v.lines.find((l) => l.lineType === 'SGST');
              const igstLine = v.lines.find((l) => l.lineType === 'IGST');
              const expenseLine = v.lines.find((l) => l.lineType === 'EXPENSE');

              return (
                <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-slate-400">{v.voucherDate}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-200">{v.referenceNumber}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-200 truncate max-w-[140px]">
                    {partyLine?.ledgerName}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {v.gstAnalysis?.placeOfSupply || company?.state}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-cyan-300">
                    {v.gstAnalysis?.treatment || 'CGST_SGST'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                    {formatCurrency(expenseLine?.debit || 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                    {cgstLine ? formatCurrency(cgstLine.debit) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                    {sgstLine ? formatCurrency(sgstLine.debit) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                    {igstLine ? formatCurrency(igstLine.debit) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.gstAnalysis?.itcEligibility === 'Blocked'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {v.gstAnalysis?.itcEligibility || 'Eligible'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onSelectVoucher(v.id)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
