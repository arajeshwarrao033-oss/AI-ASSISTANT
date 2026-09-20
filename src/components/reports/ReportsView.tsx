import React, { useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Receipt,
  Calculator,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { Voucher, Ledger, Company } from '../../types/accounting';

interface ReportsViewProps {
  company: Company | null;
  vouchers: Voucher[];
  ledgers: Ledger[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ company, vouchers, ledgers }) => {
  const [activeReport, setActiveReport] = useState<'PURCHASE' | 'GSTR3B' | 'TDS26Q' | 'TRIAL'>('PURCHASE');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  // Compute GSTR-3B Table 4 numbers
  let itcAllOther = 0;
  let itcBlocked = 0;
  let itcRcm = 0;

  vouchers.forEach((v) => {
    const taxSum = v.lines
      .filter((l) => ['CGST', 'SGST', 'IGST'].includes(l.lineType))
      .reduce((sum, l) => sum + l.debit, 0);

    if (v.gstAnalysis?.itcEligibility === 'Blocked') {
      itcBlocked += taxSum;
    } else if (v.gstAnalysis?.isRcm) {
      itcRcm += taxSum;
    } else {
      itcAllOther += taxSum;
    }
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Statutory Accounting Reports & Registers
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Purchase registers, GSTR-3B Table 4 Input Tax Credit readiness, and Form 26Q TDS schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Entity:</span>
          <span className="text-xs text-slate-200 font-semibold">{company?.name}</span>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveReport('PURCHASE')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeReport === 'PURCHASE' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          Purchase & Expense Register
        </button>

        <button
          onClick={() => setActiveReport('GSTR3B')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeReport === 'GSTR3B' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4 text-cyan-400" />
          GSTR-3B Table 4 (ITC Summary)
        </button>

        <button
          onClick={() => setActiveReport('TDS26Q')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeReport === 'TDS26Q' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4 text-indigo-400" />
          Form 26Q TDS Schedule
        </button>
      </div>

      {/* REPORT 1: PURCHASE REGISTER */}
      {activeReport === 'PURCHASE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Purchase Register for FY {company?.financialYear}
            </h2>
            <span className="text-xs text-slate-400 font-mono">{vouchers.length} Vouchers</span>
          </div>

          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-3">Voucher #</th>
                <th className="py-2.5 px-3">Supplier Name</th>
                <th className="py-2.5 px-3 text-right">Taxable Amount</th>
                <th className="py-2.5 px-3 text-right">CGST</th>
                <th className="py-2.5 px-3 text-right">SGST</th>
                <th className="py-2.5 px-3 text-right">IGST</th>
                <th className="py-2.5 px-3 text-right">TDS Ded.</th>
                <th className="py-2.5 px-3 text-right">Total Invoice Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {vouchers.map((v) => {
                const party = v.lines.find((l) => l.lineType === 'PARTY');
                const exp = v.lines.find((l) => l.lineType === 'EXPENSE');
                const cgst = v.lines.find((l) => l.lineType === 'CGST');
                const sgst = v.lines.find((l) => l.lineType === 'SGST');
                const igst = v.lines.find((l) => l.lineType === 'IGST');
                const tds = v.lines.find((l) => l.lineType === 'TDS');

                return (
                  <tr key={v.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono text-slate-400">{v.voucherDate}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-200">{v.referenceNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{party?.ledgerName}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                      {formatCurrency(exp?.debit || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {cgst ? formatCurrency(cgst.debit) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {sgst ? formatCurrency(sgst.debit) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {igst ? formatCurrency(igst.debit) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-400">
                      {tds ? formatCurrency(tds.credit) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(v.totalDebit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* REPORT 2: GSTR-3B TABLE 4 */}
      {activeReport === 'GSTR3B' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white">GSTR-3B Table 4: Eligible Input Tax Credit (ITC)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct mapping for GST return filing in the GST portal.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-200">(A) (3) Inward supplies liable to reverse charge (other than 1 & 2)</div>
                <div className="text-[11px] text-slate-500">Reverse charge mechanism transactions</div>
              </div>
              <div className="text-sm font-bold font-mono text-cyan-300">
                {formatCurrency(itcRcm)}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-200">(A) (5) All other ITC</div>
                <div className="text-[11px] text-slate-500">Normal input tax credit from registered vendors</div>
              </div>
              <div className="text-sm font-bold font-mono text-emerald-400">
                {formatCurrency(itcAllOther)}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-rose-300">(B) (2) Ineligible ITC under section 17(5)</div>
                <div className="text-[11px] text-slate-500">Blocked credits (food, employee welfare, motor vehicles)</div>
              </div>
              <div className="text-sm font-bold font-mono text-rose-400">
                {formatCurrency(itcBlocked)}
              </div>
            </div>

            <div className="p-4 bg-emerald-950/30 rounded-lg border border-emerald-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-emerald-300 text-sm">(C) Net ITC Available (A) - (B)</div>
                <div className="text-[11px] text-slate-400">Total credit set off against outward tax liability</div>
              </div>
              <div className="text-base font-bold font-mono text-emerald-300">
                {formatCurrency(itcAllOther + itcRcm - itcBlocked)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 3: FORM 26Q */}
      {activeReport === 'TDS26Q' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white">Quarterly Form 26Q TDS Return Readiness</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Summary of tax deductions for payments other than salary (Sections 194J, 194C, 194I).
            </p>
          </div>

          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Deductee PAN</th>
                <th className="py-2.5 px-3">Deductee Name</th>
                <th className="py-2.5 px-3 text-center">Section Code</th>
                <th className="py-2.5 px-3 text-right">Payment Amount</th>
                <th className="py-2.5 px-3 text-center">Rate</th>
                <th className="py-2.5 px-3 text-right">TDS Deducted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {vouchers
                .filter((v) => v.tdsAnalysis?.isApplicable)
                .map((v) => {
                  const party = v.lines.find((l) => l.lineType === 'PARTY');
                  const tds = v.lines.find((l) => l.lineType === 'TDS');
                  return (
                    <tr key={v.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {v.tdsAnalysis?.vendorPan || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {party?.ledgerName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-400">
                        {v.tdsAnalysis?.sectionCode}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                        {formatCurrency(v.totalDebit)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {v.tdsAnalysis?.applicableRate}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                        {formatCurrency(tds?.credit || 0)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
