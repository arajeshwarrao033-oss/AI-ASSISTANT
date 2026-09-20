import React, { useState } from 'react';
import { Landmark, CheckCircle2, AlertCircle, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { BankAccount, BankTransaction, Voucher } from '../../types/accounting';
import { api } from '../../services/api';

interface BankReconciliationViewProps {
  accounts: BankAccount[];
  transactions: BankTransaction[];
  vouchers: Voucher[];
  onRefresh: () => void;
}

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({
  accounts,
  transactions,
  vouchers,
  onRefresh,
}) => {
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<any>(null);

  const activeAccount = accounts[0];

  const handleRunAutoReconcile = async () => {
    try {
      setIsReconciling(true);
      const res = await api.autoReconcileBank();
      setReconcileResult(res);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Auto reconciliation failed');
    } finally {
      setIsReconciling(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5 text-cyan-400" />
            Bank Statement Reconciliation Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Match bank statement transactions against approved book vouchers using fuzzy reference number matching and date proximity.
          </p>
        </div>

        <button
          onClick={handleRunAutoReconcile}
          disabled={isReconciling}
          className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          {isReconciling ? 'Evaluating Matches...' : 'Run Auto-Reconciliation'}
        </button>
      </div>

      {/* Account Info Cards */}
      {activeAccount && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400">Bank Account</div>
            <div className="text-base font-bold text-white">{activeAccount.bankName}</div>
            <div className="text-[11px] font-mono text-slate-400">
              A/c: {activeAccount.accountNumber} | IFSC: {activeAccount.ifscCode}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400">Bank Balance</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatCurrency(activeAccount.balance || activeAccount.currentBookBalance || 0)}
            </div>
            <div className="text-[11px] text-slate-500">As per bank statement</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400">Reconciliation Status</div>
            <div className="text-2xl font-bold font-mono text-cyan-300">
              {transactions.filter((t) => t.status === 'Matched').length} / {transactions.length}
            </div>
            <div className="text-[11px] text-slate-500">Transactions matched to books</div>
          </div>
        </div>
      )}

      {/* Reconciliation Results Flash Banner */}
      {reconcileResult && (
        <div className="p-4 rounded-xl bg-slate-900 border border-cyan-800/80 text-xs space-y-2">
          <div className="font-bold text-cyan-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Auto-Reconciliation Evaluated
          </div>
          <p className="text-slate-300">
            Processed {reconcileResult.totalTransactions} bank statement lines. Identified{' '}
            <strong className="text-emerald-400">{reconcileResult.matchedCount} exact matches</strong>{' '}
            and{' '}
            <strong className="text-amber-400">
              {reconcileResult.suggestedCount} potential candidate matches
            </strong>.
          </p>
        </div>
      )}

      {/* Bank Statement Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Statement Transactions
          </h2>
          <span className="text-xs text-slate-400 font-mono">{transactions.length} Lines</span>
        </div>

        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4">Date</th>
              <th className="py-2.5 px-3">Description / Narration</th>
              <th className="py-2.5 px-3">Ref / UTR Number</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Matched Voucher</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-4 font-mono text-slate-400">{tx.date}</td>
                <td className="py-2.5 px-3 text-slate-200 font-medium max-w-xs">{tx.description}</td>
                <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                  {tx.referenceNumber || '—'}
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      tx.type === 'DEBIT' ? 'text-rose-400 bg-rose-950' : 'text-emerald-400 bg-emerald-950'
                    }`}
                  >
                    {tx.type}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">
                  {formatCurrency(tx.amount)}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      tx.status === 'Matched'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : tx.status === 'Suggested'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[11px] text-cyan-400">
                  {tx.matchedVoucherId ? `#${tx.matchedVoucherId}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
