import React from 'react';
import { Company } from '../../types/accounting';
import { Building2, ShieldCheck, Cpu, Bell, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  company: Company | null;
  openExceptionsCount: number;
  onNavigateToExceptions: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  company,
  openExceptionsCount,
  onNavigateToExceptions,
}) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between text-slate-100 sticky top-0 z-30">
      {/* Brand & Active Company */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-white text-base">
                AI Finance Assistant
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                Accounting Copilot
              </span>
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-700 hidden md:block" />

        {/* Company Quick Badge */}
        {company && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-200">{company.name}</span>
            <span className="px-1.5 py-0.2 bg-slate-800 rounded font-mono text-[11px] text-slate-300 border border-slate-700">
              GSTIN: {company.gstin}
            </span>
            <span className="text-slate-400 text-[11px]">
              FY {company.financialYear} ({company.state})
            </span>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Accounting Integration Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded text-xs border border-slate-700 text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Target:</span>
          <span className="font-medium text-emerald-300">{company?.accountingSoftware || 'TallyPrime'}</span>
        </div>

        {/* AI Engine Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 rounded text-xs border border-slate-700 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline">AI Engine:</span>
          <span className="font-medium text-cyan-300">Gemini 3.8 Ready</span>
        </div>

        {/* Exceptions Notification Button */}
        <button
          onClick={onNavigateToExceptions}
          className="relative p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
          title="Review Open Exceptions"
        >
          <Bell className="w-4 h-4" />
          {openExceptionsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-600 text-white text-[10px] font-bold rounded-full px-1">
              {openExceptionsCount}
            </span>
          )}
        </button>

        {/* User Identity / Persona */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-xs font-semibold border border-slate-600">
            CA
          </div>
          <div className="hidden xl:block text-left text-xs leading-tight">
            <div className="font-medium text-slate-200">Senior Accountant</div>
            <div className="text-[11px] text-slate-400">Review & Approve</div>
          </div>
        </div>
      </div>
    </header>
  );
};
