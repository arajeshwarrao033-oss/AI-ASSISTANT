import React from 'react';
import {
  LayoutDashboard,
  FileText,
  FileCheck2,
  Share2,
  BookOpen,
  Boxes,
  Percent,
  Calculator,
  Landmark,
  BarChart3,
  AlertTriangle,
  History,
  Settings,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'documents'
  | 'vouchers'
  | 'tally'
  | 'masters'
  | 'inventory'
  | 'gst'
  | 'tds'
  | 'bank'
  | 'reports'
  | 'exceptions'
  | 'audit'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingVouchersCount: number;
  openExceptionsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingVouchersCount,
  openExceptionsCount,
}) => {
  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    {
      id: 'vouchers',
      label: 'Vouchers',
      icon: <FileCheck2 className="w-4 h-4" />,
      badge: pendingVouchersCount > 0 ? pendingVouchersCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-900',
    },
    { id: 'tally', label: 'Tally Export', icon: <Share2 className="w-4 h-4" /> },
    { id: 'masters', label: 'Ledger Masters', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <Boxes className="w-4 h-4" /> },
    { id: 'gst', label: 'GST Engine', icon: <Percent className="w-4 h-4" /> },
    { id: 'tds', label: 'TDS Engine', icon: <Calculator className="w-4 h-4" /> },
    { id: 'bank', label: 'Bank Reconcile', icon: <Landmark className="w-4 h-4" /> },
    { id: 'reports', label: 'Registers & Reports', icon: <BarChart3 className="w-4 h-4" /> },
    {
      id: 'exceptions',
      label: 'Exceptions',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: openExceptionsCount > 0 ? openExceptionsCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'audit', label: 'Audit Trail', icon: <History className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 text-slate-300">
      <div className="p-4 border-b border-slate-900">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2">
          Accounting Modules
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Safety Principle reminder */}
      <div className="p-3.5 m-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
        <div className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Safety Guardrail
        </div>
        AI suggests. Rules validate. Human accountant approves. Zero silent postings.
      </div>
    </aside>
  );
};
