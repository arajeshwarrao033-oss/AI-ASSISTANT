import React, { useState } from 'react';
import { Settings, Building2, Sliders, ShieldCheck, Save, CheckCircle2 } from 'lucide-react';
import { Company } from '../../types/accounting';
import { api } from '../../services/api';

interface SettingsViewProps {
  company: Company | null;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ company, onRefresh }) => {
  const [formData, setFormData] = useState<Partial<Company>>({
    name: company?.name || '',
    legalName: company?.legalName || '',
    gstin: company?.gstin || '',
    pan: company?.pan || '',
    tan: company?.tan || '',
    state: company?.state || '',
    stateCode: company?.stateCode || '',
    financialYear: company?.financialYear || '2024-2025',
    accountingSoftware: company?.accountingSoftware || 'TallyPrime',
    confidenceThresholds: company?.confidenceThresholds || {
      autoApprove: 0.95,
      reviewRecommended: 0.8,
      manualRequired: 0.6,
    },
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    try {
      setIsSaving(true);
      await api.updateCompany(company.id, formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-300" />
            Entity Configuration & AI Guardrails
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure Indian enterprise GSTIN, PAN, TAN, target accounting software bridge, and AI confidence thresholds.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 text-emerald-300 rounded-lg text-xs border border-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Settings Saved
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Master Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Statutory Company Master (India)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Company Display Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Legal Name as per MCA *</label>
              <input
                type="text"
                required
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">GSTIN (15 characters) *</label>
              <input
                type="text"
                required
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">PAN (Permanent Account Number) *</label>
              <input
                type="text"
                required
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">TAN (Tax Deduction Number)</label>
              <input
                type="text"
                value={formData.tan}
                onChange={(e) => setFormData({ ...formData, tan: e.target.value.toUpperCase() })}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Operating State & Code *</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State Name"
                  className="bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
                <input
                  type="text"
                  value={formData.stateCode}
                  onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                  placeholder="Code (e.g. 27)"
                  className="bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Financial Year</label>
              <input
                type="text"
                value={formData.financialYear}
                onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Target Accounting Software</label>
              <select
                value={formData.accountingSoftware}
                onChange={(e) => setFormData({ ...formData, accountingSoftware: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
              >
                <option value="TallyPrime">TallyPrime (XML Standard)</option>
                <option value="QuickBooks">QuickBooks Online (API Ready)</option>
                <option value="ZohoBooks">Zoho Books (API Ready)</option>
                <option value="None">Generic Standard GAAP</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI Confidence Thresholds & Guardrails */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            AI Confidence Thresholds & Approval Rules
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="font-semibold text-emerald-400">High Confidence Threshold</div>
              <p className="text-[11px] text-slate-400">
                Above this score, all ledger and tax mappings are marked as verified recommendations.
              </p>
              <div className="text-sm font-mono font-bold text-slate-200">
                {Math.round((formData.confidenceThresholds?.autoApprove ?? 0.95) * 100)}%
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="font-semibold text-amber-400">Review Recommended</div>
              <p className="text-[11px] text-slate-400">
                Between this score and high threshold, an alert advises line-by-line inspection.
              </p>
              <div className="text-sm font-mono font-bold text-slate-200">
                {Math.round((formData.confidenceThresholds?.reviewRecommended ?? 0.8) * 100)}%
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="font-semibold text-rose-400">Manual Interlock Threshold</div>
              <p className="text-[11px] text-slate-400">
                Below this score, voucher requires mandatory ledger reassignment by the user.
              </p>
              <div className="text-sm font-mono font-bold text-slate-200">
                &lt; {Math.round((formData.confidenceThresholds?.manualRequired ?? 0.6) * 100)}%
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
