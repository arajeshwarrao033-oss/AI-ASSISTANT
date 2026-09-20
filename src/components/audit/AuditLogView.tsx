import React from 'react';
import { History, ShieldCheck, User, Clock, FileText } from 'lucide-react';
import { AuditLogEntry } from '../../types/accounting';

interface AuditLogViewProps {
  logs: AuditLogEntry[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            Immutable Audit Trail & Compliance Log
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Section 128 Companies Act & Income Tax compliant chronological audit logs for all AI suggestions and user approval actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Total Events:</span>
          <span className="px-2.5 py-1 rounded bg-slate-800 text-cyan-300 font-mono text-xs font-bold border border-slate-700">
            {logs.length} Recorded
          </span>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4">Timestamp</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">User / Actor</th>
              <th className="py-2.5 px-3">Entity</th>
              <th className="py-2.5 px-3">Details</th>
              <th className="py-2.5 px-3">Reason / Narration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString('en-IN', {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  })}
                </td>

                <td className="py-3 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      log.action.includes('APPROVED')
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : log.action.includes('REJECTED')
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : log.action.includes('TALLY')
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {log.action}
                  </span>
                </td>

                <td className="py-3 px-3 text-slate-200 font-sans text-xs">
                  {log.userName || log.userId}
                </td>

                <td className="py-3 px-3 text-slate-400 text-[11px]">
                  {log.entityType} ({log.entityId.substring(0, 10)}...)
                </td>

                <td className="py-3 px-3 text-slate-300 font-sans text-xs max-w-sm leading-relaxed">
                  {typeof log.details === 'object'
                    ? JSON.stringify(log.details).substring(0, 100) + '...'
                    : log.details || '—'}
                </td>

                <td className="py-3 px-3 text-slate-400 font-sans text-xs italic">
                  {log.reason || 'Standard system event'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
