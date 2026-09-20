import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Ledger, LedgerNature } from '../../types/accounting';
import { api } from '../../services/api';

interface MastersViewProps {
  ledgers: Ledger[];
  onRefresh: () => void;
}

export const MastersView: React.FC<MastersViewProps> = ({ ledgers, onRefresh }) => {
  const [filterNature, setFilterNature] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [fuzzySearchQuery, setFuzzySearchQuery] = useState('');
  const [fuzzyResult, setFuzzyResult] = useState<any>(null);
  const [isFuzzyLoading, setIsFuzzyLoading] = useState(false);

  // New Ledger Form State
  const [newLedger, setNewLedger] = useState({
    name: '',
    parentGroup: 'Sundry Creditors',
    ledgerType: 'Vendor',
    nature: 'Liability' as LedgerNature,
    gstApplicability: true,
    gstin: '',
    pan: '',
    state: 'Maharashtra',
    tdsApplicability: true,
    tdsSection: '194J',
    active: true,
  });

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLedger(newLedger);
      setShowAddModal(false);
      setNewLedger({
        name: '',
        parentGroup: 'Sundry Creditors',
        ledgerType: 'Vendor',
        nature: 'Liability',
        gstApplicability: true,
        gstin: '',
        pan: '',
        state: 'Maharashtra',
        tdsApplicability: true,
        tdsSection: '194J',
        active: true,
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create ledger');
    }
  };

  const handleTestFuzzyMatch = async () => {
    if (!fuzzySearchQuery) return;
    try {
      setIsFuzzyLoading(true);
      const res = await api.matchLedger(fuzzySearchQuery);
      setFuzzyResult(res);
    } catch (err: any) {
      alert(err.message || 'Matching test failed');
    } finally {
      setIsFuzzyLoading(false);
    }
  };

  const filteredLedgers = ledgers.filter((l) => {
    const matchesNature = filterNature === 'ALL' || l.nature === filterNature;
    const matchesQuery =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.parentGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.gstin && l.gstin.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesNature && matchesQuery;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Ledger Masters & Chart of Accounts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Indian GAAP Chart of Accounts compliant with Tally Groups (Sundry Creditors, Indirect Expenses, Duties & Taxes).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Ledger
        </button>
      </div>

      {/* Fuzzy Matching Tester Card (Section 9 requirement) */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>AI Fuzzy Ledger Matching Sandbox</span>
        </div>
        <p className="text-xs text-slate-400">
          Test fuzzy matching between variant invoice trade names (e.g., &quot;ABC Electricals Private Limited&quot; vs &quot;ABC Electricals Pvt Ltd&quot;) to prevent duplicate ledger creation.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={fuzzySearchQuery}
            onChange={(e) => setFuzzySearchQuery(e.target.value)}
            placeholder="Type vendor name to test AI ledger resolution..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleTestFuzzyMatch}
            disabled={isFuzzyLoading || !fuzzySearchQuery}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            {isFuzzyLoading ? 'Matching...' : 'Evaluate Match'}
          </button>
        </div>

        {fuzzyResult && (
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs mt-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">
                Resolution Status: <span className="text-cyan-400">{fuzzyResult.status}</span>
              </span>
              <span className="font-mono text-[11px] font-bold text-emerald-400">
                Confidence: {Math.round((fuzzyResult.confidence || 0) * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{fuzzyResult.reason}</p>
            {fuzzyResult.ledger && (
              <div className="text-[11px] text-slate-300 pt-1 font-mono">
                Matched Ledger: {fuzzyResult.ledger.name} [{fuzzyResult.ledger.parentGroup}]
              </div>
            )}
            {fuzzyResult.recommendedNewLedger && (
              <div className="text-[11px] text-amber-300 pt-1">
                Recommendation: Create under {fuzzyResult.recommendedNewLedger.parentGroup} ({fuzzyResult.recommendedNewLedger.nature})
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {['ALL', 'Asset', 'Liability', 'Expense', 'Income'].map((nature) => (
            <button
              key={nature}
              onClick={() => setFilterNature(nature)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                filterNature === nature
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {nature === 'ALL' ? 'All Groups' : nature}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ledgers..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Ledgers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4">Ledger Name</th>
              <th className="py-2.5 px-3">Parent Group</th>
              <th className="py-2.5 px-3">Nature</th>
              <th className="py-2.5 px-3">GSTIN / PAN</th>
              <th className="py-2.5 px-3 text-center">GST App.</th>
              <th className="py-2.5 px-3 text-center">TDS Section</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredLedgers.map((l) => (
              <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-4 font-semibold text-slate-200">{l.name}</td>
                <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">{l.parentGroup}</td>
                <td className="py-2.5 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      l.nature === 'Expense'
                        ? 'bg-rose-950 text-rose-300'
                        : l.nature === 'Liability'
                        ? 'bg-amber-950 text-amber-300'
                        : l.nature === 'Asset'
                        ? 'bg-cyan-950 text-cyan-300'
                        : 'bg-emerald-950 text-emerald-300'
                    }`}
                  >
                    {l.nature}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                  {l.gstin || l.pan || '—'}
                </td>
                <td className="py-2.5 px-3 text-center">
                  {l.gstApplicability ? (
                    <span className="text-emerald-400 font-bold">Yes</span>
                  ) : (
                    <span className="text-slate-500">No</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                  {l.tdsSection || '—'}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-800 text-emerald-400">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Ledger Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg w-full space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Create New Chart of Accounts Ledger
            </h3>

            <form onSubmit={handleCreateLedger} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Ledger Name *</label>
                <input
                  type="text"
                  required
                  value={newLedger.name}
                  onChange={(e) => setNewLedger({ ...newLedger, name: e.target.value })}
                  placeholder="e.g. Acme Tech Infrastructure Pvt Ltd"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Parent Group *</label>
                  <select
                    value={newLedger.parentGroup}
                    onChange={(e) => setNewLedger({ ...newLedger, parentGroup: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  >
                    <option value="Sundry Creditors">Sundry Creditors</option>
                    <option value="Sundry Debtors">Sundry Debtors</option>
                    <option value="Indirect Expenses">Indirect Expenses</option>
                    <option value="Direct Expenses">Direct Expenses</option>
                    <option value="Purchase Accounts">Purchase Accounts</option>
                    <option value="Duties & Taxes">Duties & Taxes</option>
                    <option value="Bank Accounts">Bank Accounts</option>
                    <option value="Fixed Assets">Fixed Assets</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nature *</label>
                  <select
                    value={newLedger.nature}
                    onChange={(e) => setNewLedger({ ...newLedger, nature: e.target.value as LedgerNature })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  >
                    <option value="Liability">Liability</option>
                    <option value="Asset">Asset</option>
                    <option value="Expense">Expense</option>
                    <option value="Income">Income</option>
                    <option value="Equity">Equity</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">GSTIN (15 chars)</label>
                  <input
                    type="text"
                    value={newLedger.gstin}
                    onChange={(e) => setNewLedger({ ...newLedger, gstin: e.target.value.toUpperCase() })}
                    placeholder="27AABCS1429B1Z8"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">PAN (10 chars)</label>
                  <input
                    type="text"
                    value={newLedger.pan}
                    onChange={(e) => setNewLedger({ ...newLedger, pan: e.target.value.toUpperCase() })}
                    placeholder="AABCS1429B"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">TDS Section (if applicable)</label>
                  <select
                    value={newLedger.tdsSection}
                    onChange={(e) => setNewLedger({ ...newLedger, tdsSection: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  >
                    <option value="194J">Sec 194J (Professional / Tech)</option>
                    <option value="194C">Sec 194C (Contractors)</option>
                    <option value="194I">Sec 194I (Rent)</option>
                    <option value="194H">Sec 194H (Commission)</option>
                    <option value="194Q">Sec 194Q (Purchase of Goods)</option>
                    <option value="">None / Not Applicable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">State</label>
                  <input
                    type="text"
                    value={newLedger.state}
                    onChange={(e) => setNewLedger({ ...newLedger, state: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer"
                >
                  Save Ledger Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
