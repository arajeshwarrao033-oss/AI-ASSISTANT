import React, { useState } from 'react';
import {
  Share2,
  Download,
  CheckCircle2,
  FileCode,
  Layers,
  AlertCircle,
  Copy,
  Check,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { Voucher, Company } from '../../types/accounting';
import { api } from '../../services/api';

interface TallyExportViewProps {
  company: Company | null;
  vouchers: Voucher[];
  onRefresh: () => void;
}

export const TallyExportView: React.FC<TallyExportViewProps> = ({ company, vouchers, onRefresh }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>({
    connected: true,
    providerName: 'TallyPrime XML Connector',
    message: 'Tally XML Envelope Bridge active. Ready to export approved transactions.',
  });

  const approvedVouchers = vouchers.filter(
    (v) => v.status === 'APPROVED' || v.status === 'EXPORTED_TALLY'
  );

  const handleExportVouchers = async () => {
    try {
      setIsExporting(true);
      const result = await api.exportTallyVouchers();
      setExportResult(result);
      onRefresh();

      // Trigger automatic browser file download of the XML file
      const blob = new Blob([result.payload], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName || 'Tally_Import_Vouchers.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export to Tally failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMasters = async () => {
    try {
      setIsExporting(true);
      const result = await api.exportTallyMasters();
      setExportResult(result);

      // Download masters XML
      const blob = new Blob([result.payload], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName || 'Tally_Masters.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Masters export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyXml = () => {
    if (exportResult?.payload) {
      navigator.clipboard.writeText(exportResult.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-400" />
            TallyPrime Integration & XML Export Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Export approved accounting entries directly into official Tally XML Envelope standard format for import into TallyPrime or Tally.ERP 9.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMasters}
            disabled={isExporting}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            Export All Masters (XML)
          </button>
          <button
            onClick={handleExportVouchers}
            disabled={isExporting || approvedVouchers.length === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md ${
              approvedVouchers.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Download className="w-4 h-4" />
            Export Approved Vouchers ({approvedVouchers.length})
          </button>
        </div>
      </div>

      {/* Integration Adapter Overview & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tally Adapter */}
        <div className="p-4 rounded-xl bg-slate-900 border border-emerald-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-400" />
              TallyPrime Connector
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
              Active Adapter
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Produces standard XML Envelope format with UTF-8 encoding. Ready for import via Alt+O in TallyPrime.
          </p>
          <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 pt-1">
            <CheckCircle2 className="w-3 h-3" />
            Target: {company?.name}
          </div>
        </div>

        {/* QuickBooks Adapter */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 opacity-80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">QuickBooks Online</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
              Adapter Ready
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            QuickBooksProvider interface architecture implemented for future OAuth 2.0 API connection.
          </p>
        </div>

        {/* Zoho Books Adapter */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 opacity-80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Zoho Books</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
              Adapter Ready
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            ZohoBooksProvider interface architecture implemented for future REST API v3 connection.
          </p>
        </div>
      </div>

      {/* Approved Vouchers Table ready for export */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Approved Vouchers Ready for Tally Export ({approvedVouchers.length})
            </h2>
            <p className="text-xs text-slate-400">
              Only approved, balanced vouchers can be exported to prevent unbalanced ledger postings.
            </p>
          </div>
        </div>

        {approvedVouchers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
            <FileCode className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-xs font-medium text-slate-400">No approved vouchers yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Go to the Vouchers module to review and approve proposed accounting entries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reference #</th>
                  <th className="py-2.5 px-3">Party Ledger</th>
                  <th className="py-2.5 px-3 text-right">Debit / Credit</th>
                  <th className="py-2.5 px-3">Approved By</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {approvedVouchers.map((v) => {
                  const partyLine = v.lines.find((l) => l.lineType === 'PARTY');
                  return (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{v.voucherDate}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">{v.voucherType}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{v.referenceNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">{partyLine?.ledgerName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        ₹{v.totalDebit.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{v.approvedBy || 'Accountant'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Tally XML Payload Inspector */}
      {exportResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">Generated Tally XML Preview:</span>
              <span className="text-[11px] font-mono text-slate-400">{exportResult.fileName}</span>
            </div>

            <button
              onClick={handleCopyXml}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy XML'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
            {exportResult.payload}
          </pre>

          {/* Import instructions */}
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-200">How to Import into TallyPrime:</div>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
              <li>Open TallyPrime and load company <strong className="text-slate-200">{company?.name}</strong>.</li>
              <li>Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-200">Alt + O</kbd> (Import Menu).</li>
              <li>Select <strong className="text-slate-200">Transactions</strong> or <strong className="text-slate-200">Masters</strong>.</li>
              <li>Choose the downloaded XML file to complete posting.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
