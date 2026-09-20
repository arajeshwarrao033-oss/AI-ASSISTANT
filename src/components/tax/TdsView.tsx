import React from 'react';
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Percent,
  Receipt,
  FileCheck2,
} from 'lucide-react';
import { Voucher } from '../../types/accounting';

interface TdsViewProps {
  vouchers: Voucher[];
  onSelectVoucher: (id: string) => void;
}

export const TdsView: React.FC<TdsViewProps> = ({ vouchers, onSelectVoucher }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  let totalTdsDeducted = 0;
  let section194JTotal = 0;
  let section194ITotal = 0;
  let section194CTotal = 0;
  let missingPanCount = 0;
  let totalDeductionsCount = 0;

  vouchers.forEach((v) => {
    if (v.tdsAnalysis?.isApplicable) {
      totalDeductionsCount++;
      const tds = v.tdsAnalysis.tdsAmount || 0;
      totalTdsDeducted += tds;

      if (v.tdsAnalysis.sectionCode === '194J') section194JTotal += tds;
      if (v.tdsAnalysis.sectionCode === '194I') section194ITotal += tds;
      if (v.tdsAnalysis.sectionCode === '194C') section194CTotal += tds;

      if (v.tdsAnalysis.panStatus === 'Missing' || v.tdsAnalysis.panStatus === 'Invalid') {
        missingPanCount++;
      }
    }
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            TDS (Tax Deducted at Source) Engine & Form 26Q
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Statutory withholding tax compliance under Income Tax Act: Sections 194J, 194C, 194I, 194Q & Sec 206AA penal rate enforcement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Total Deductions:</span>
          <span className="px-2.5 py-1 rounded bg-slate-800 text-indigo-300 font-mono text-xs font-bold border border-slate-700">
            {totalDeductionsCount} Transactions
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total TDS Withheld */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Total TDS Payable (Booked)</div>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {formatCurrency(totalTdsDeducted)}
          </div>
          <div className="text-[11px] text-slate-500">Credited to TDS Payable Ledgers</div>
        </div>

        {/* Section 194J */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-semibold">Sec 194J (Professional / Tech)</div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatCurrency(section194JTotal)}
          </div>
          <div className="text-[11px] text-slate-500">Threshold: ₹30,000 / year (10% or 2%)</div>
        </div>

        {/* Section 194I */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-semibold">Sec 194I (Rent)</div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatCurrency(section194ITotal)}
          </div>
          <div className="text-[11px] text-slate-500">Threshold: ₹2,40,000 / year (10%)</div>
        </div>

        {/* Section 206AA Warning Widget */}
        <div
          className={`p-4 rounded-xl border space-y-1 ${
            missingPanCount > 0
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <div className="text-xs font-semibold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Sec 206AA Penal Warnings</span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{missingPanCount}</div>
          <div className="text-[11px]">
            {missingPanCount > 0
              ? '20% penal deduction triggered for missing PAN'
              : 'All vendors have verified PAN numbers'}
          </div>
        </div>
      </div>

      {/* Statutory Rules Reference */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="space-y-1">
          <div className="font-bold text-white">Section 194J</div>
          <p className="text-[11px] text-slate-400">
            Professional fees (10%) & Technical services (2%). Threshold: ₹30,000 per financial year.
          </p>
        </div>
        <div className="space-y-1">
          <div className="font-bold text-white">Section 194C</div>
          <p className="text-[11px] text-slate-400">
            Contractors: 1% for Individual/HUF, 2% for Companies. Threshold: ₹30,000 single / ₹1,00,000 annual.
          </p>
        </div>
        <div className="space-y-1">
          <div className="font-bold text-white">Section 194I</div>
          <p className="text-[11px] text-slate-400">
            Rent of land, building or furniture: 10%. Rent of plant/machinery: 2%. Threshold: ₹2,40,000.
          </p>
        </div>
        <div className="space-y-1">
          <div className="font-bold text-rose-400">Section 206AA (Penal)</div>
          <p className="text-[11px] text-slate-400">
            Mandatory higher rate of <strong>20%</strong> if vendor fails to furnish valid PAN.
          </p>
        </div>
      </div>

      {/* TDS Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            TDS Withholding Register (Form 26Q Preview)
          </h2>
        </div>

        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4">Date</th>
              <th className="py-2.5 px-3">Ref #</th>
              <th className="py-2.5 px-3">Vendor / Deductee</th>
              <th className="py-2.5 px-3">Vendor PAN</th>
              <th className="py-2.5 px-3 text-center">Section</th>
              <th className="py-2.5 px-3 text-right">Gross Bill</th>
              <th className="py-2.5 px-3 text-center">Rate</th>
              <th className="py-2.5 px-3 text-right">TDS Withheld</th>
              <th className="py-2.5 px-3 text-right">Net Payable to Party</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {vouchers.map((v) => {
              const partyLine = v.lines.find((l) => l.lineType === 'PARTY');
              const tdsLine = v.lines.find((l) => l.lineType === 'TDS');
              const isApplicable = v.tdsAnalysis?.isApplicable || (tdsLine && tdsLine.credit > 0);

              return (
                <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-slate-400">{v.voucherDate}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-200">{v.referenceNumber}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-200 truncate max-w-[150px]">
                    {partyLine?.ledgerName}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                    {v.tdsAnalysis?.vendorPan || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-400">
                    {isApplicable ? `Sec ${v.tdsAnalysis?.sectionCode || '194'}` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                    {formatCurrency(v.totalDebit)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                    {isApplicable ? `${v.tdsAnalysis?.applicableRate ?? 10}%` : '0%'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                    {tdsLine ? formatCurrency(tdsLine.credit) : '₹0.00'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                    {partyLine ? formatCurrency(partyLine.credit) : formatCurrency(v.totalDebit)}
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
