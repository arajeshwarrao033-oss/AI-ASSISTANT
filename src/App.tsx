import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { DocumentsView } from './components/documents/DocumentsView';
import { VouchersView } from './components/vouchers/VouchersView';
import { TallyExportView } from './components/tally/TallyExportView';
import { MastersView } from './components/masters/MastersView';
import { InventoryView } from './components/inventory/InventoryView';
import { GstView } from './components/tax/GstView';
import { TdsView } from './components/tax/TdsView';
import { ExceptionsView } from './components/exceptions/ExceptionsView';
import { AuditLogView } from './components/audit/AuditLogView';
import { BankReconciliationView } from './components/bank/BankReconciliationView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { api } from './services/api';
import {
  Company,
  AccountingDocument,
  Voucher,
  Ledger,
  InventoryItem,
  AccountingException,
  AuditLogEntry,
  BankAccount,
  BankTransaction,
} from './types/accounting';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [company, setCompany] = useState<Company | null>(null);
  const [documents, setDocuments] = useState<AccountingDocument[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [exceptions, setExceptions] = useState<AccountingException[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  const [selectedDocId, setSelectedDocId] = useState<string | undefined>();
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Load all initial state
  const loadAllData = async () => {
    try {
      const [comp, docs, vchs, leds, inv, exc, logs, bAccts, bTx, stats] = await Promise.all([
        api.getActiveCompany(),
        api.getDocuments(),
        api.getVouchers(),
        api.getLedgers(),
        api.getInventory(),
        api.getExceptions(),
        api.getAuditLogs(),
        api.getBankAccounts(),
        api.getBankTransactions(),
        api.getDashboardStats(),
      ]);

      setCompany(comp);
      setDocuments(docs);
      setVouchers(vchs);
      setLedgers(leds);
      setInventory(inv);
      setExceptions(exc);
      setAuditLogs(logs);
      setBankAccounts(bAccts);
      setBankTransactions(bTx);
      setDashboardStats(stats);
    } catch (err) {
      console.error('Error fetching accounting data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handlers
  const handleSelectDocument = (id: string) => {
    setSelectedDocId(id);
    setCurrentTab('documents');
  };

  const handleSelectVoucher = (id: string) => {
    setSelectedVoucherId(id);
    setCurrentTab('vouchers');
  };

  const handleUploadDocument = async (data: any) => {
    const result = await api.uploadDocument(data);
    await loadAllData();
    if (result?.voucher?.id) {
      setSelectedVoucherId(result.voucher.id);
    }
    return result;
  };

  const handleApproveVoucher = async (id: string) => {
    await api.approveVoucher(id);
    await loadAllData();
  };

  const handleRejectVoucher = async (id: string, reason: string) => {
    await api.rejectVoucher(id, reason);
    await loadAllData();
  };

  const handleUpdateVoucher = async (id: string, updates: Partial<Voucher>) => {
    await api.updateVoucher(id, updates);
    await loadAllData();
  };

  // Preset Sample Invoices for direct testing
  const handleLoadSampleInvoice = async (type: 'consulting' | 'cloud' | 'rent') => {
    try {
      setIsLoading(true);
      let sampleData: any;

      if (type === 'consulting') {
        sampleData = {
          fileName: 'TechConsulting_Inv8841.pdf',
          mimeType: 'application/pdf',
          documentType: 'Expense bill',
          rawText: `
TAX INVOICE
Supplier: ABC Tech Consultants LLP
Address: 402 Crystal Tower, Andheri East, Mumbai, Maharashtra
GSTIN: 27AABCT9981C1Z4
PAN: AABCT9981C
State: Maharashtra (State Code: 27)

Invoice No: INV-2024-8841
Date: 20-09-2024
Due Date: 30-09-2024
Place of Supply: Maharashtra (27)

Bill To:
Suryavanshi Industrial Solutions Pvt Ltd
Plot 44, MIDC Bhosari, Pune, Maharashtra - 411026
GSTIN: 27AABCS1429B1Z8

Line Items:
1. Enterprise Cloud ERP Implementation & Security Architecture Advisory
   SAC Code: 998313
   Quantity: 1 Job
   Rate: Rs. 60,000.00
   Taxable Value: Rs. 60,000.00
   CGST @ 9%: Rs. 5,400.00
   SGST @ 9%: Rs. 5,400.00

Subtotal Taxable: Rs. 60,000.00
CGST (9%): Rs. 5,400.00
SGST (9%): Rs. 5,400.00
Total Invoice Value: Rs. 70,800.00
          `,
        };
      } else if (type === 'cloud') {
        sampleData = {
          fileName: 'ApexCloud_Server_INV491.pdf',
          mimeType: 'application/pdf',
          documentType: 'Purchase invoice',
          rawText: `
TAX INVOICE (INTER-STATE SUPPLY)
Supplier: Apex Cloud Services India Pvt Ltd
Address: 12 Whitefield Tech Park, Bengaluru, Karnataka
GSTIN: 29AAACA2019E1Z2
PAN: AAACA2019E
State: Karnataka (State Code: 29)

Invoice No: BLR-SRV-491
Date: 18-09-2024
Place of Supply: Maharashtra (27)

Recipient:
Suryavanshi Industrial Solutions Pvt Ltd
Pune, Maharashtra
GSTIN: 27AABCS1429B1Z8

Line Items:
1. Dedicated Production Compute Cluster (Month of August)
   SAC: 998315
   Qty: 1
   Rate: Rs. 40,000.00
   Taxable: Rs. 40,000.00
   IGST @ 18%: Rs. 7,200.00

Total Taxable: Rs. 40,000.00
IGST (18%): Rs. 7,200.00
Total Amount Payable: Rs. 47,200.00
          `,
        };
      } else {
        sampleData = {
          fileName: 'MIDC_Rent_Office_Bill.pdf',
          mimeType: 'application/pdf',
          documentType: 'Expense bill',
          rawText: `
RENT BILL
Landlord / Lessor: Synergy Commercial Spaces Pvt Ltd
Address: Senapati Bapat Road, Pune, Maharashtra
GSTIN: 27AAACS8831A1Z9
PAN: AAACS8831A
State: Maharashtra (27)

Invoice No: RENT-SEP-2024
Date: 01-09-2024
Place of Supply: Maharashtra (27)

Tenant:
Suryavanshi Industrial Solutions Pvt Ltd
GSTIN: 27AABCS1429B1Z8

Particulars:
1. Monthly Commercial Office Rent for Pune Head Office (September 2024)
   SAC Code: 997212
   Taxable Value: Rs. 1,00,000.00
   CGST @ 9%: Rs. 9,000.00
   SGST @ 9%: Rs. 9,000.00

Total Amount: Rs. 1,18,000.00
Note: Subject to TDS deduction under Section 194I of Income Tax Act.
          `,
        };
      }

      const result = await api.uploadDocument(sampleData);
      await loadAllData();
      if (result?.voucher?.id) {
        setSelectedVoucherId(result.voucher.id);
        setCurrentTab('vouchers');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load test invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const openExceptionsCount = exceptions.filter((e) => e.status === 'OPEN').length;
  const pendingVouchersCount = vouchers.filter((v) => v.status === 'REVIEW_REQUIRED').length;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Global Top App Header */}
      <Header
        company={company}
        openExceptionsCount={openExceptionsCount}
        onNavigateToExceptions={() => setCurrentTab('exceptions')}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingVouchersCount={pendingVouchersCount}
          openExceptionsCount={openExceptionsCount}
        />

        {/* Content View Body */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {isLoading && !company ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-medium text-slate-300">
                  Bootstrapping AI Finance Assistant & Indian Chart of Accounts...
                </p>
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  stats={dashboardStats}
                  recentDocuments={documents}
                  recentVouchers={vouchers}
                  exceptions={exceptions}
                  onNavigateToTab={setCurrentTab}
                  onSelectVoucher={handleSelectVoucher}
                  onSelectDocument={handleSelectDocument}
                  onLoadSampleInvoice={handleLoadSampleInvoice}
                />
              )}

              {currentTab === 'documents' && (
                <DocumentsView
                  documents={documents}
                  selectedDocumentId={selectedDocId}
                  onUploadDocument={handleUploadDocument}
                  onSelectVoucher={handleSelectVoucher}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'vouchers' && (
                <VouchersView
                  vouchers={vouchers}
                  ledgers={ledgers}
                  selectedVoucherId={selectedVoucherId}
                  onApproveVoucher={handleApproveVoucher}
                  onRejectVoucher={handleRejectVoucher}
                  onUpdateVoucher={handleUpdateVoucher}
                  onNavigateToTab={setCurrentTab}
                />
              )}

              {currentTab === 'tally' && (
                <TallyExportView company={company} vouchers={vouchers} onRefresh={loadAllData} />
              )}

              {currentTab === 'masters' && (
                <MastersView ledgers={ledgers} onRefresh={loadAllData} />
              )}

              {currentTab === 'inventory' && (
                <InventoryView inventory={inventory} onRefresh={loadAllData} />
              )}

              {currentTab === 'gst' && (
                <GstView company={company} vouchers={vouchers} onSelectVoucher={handleSelectVoucher} />
              )}

              {currentTab === 'tds' && (
                <TdsView vouchers={vouchers} onSelectVoucher={handleSelectVoucher} />
              )}

              {currentTab === 'bank' && (
                <BankReconciliationView
                  accounts={bankAccounts}
                  transactions={bankTransactions}
                  vouchers={vouchers}
                  onRefresh={loadAllData}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsView company={company} vouchers={vouchers} ledgers={ledgers} />
              )}

              {currentTab === 'exceptions' && (
                <ExceptionsView
                  exceptions={exceptions}
                  onRefresh={loadAllData}
                  onSelectDocument={handleSelectDocument}
                  onSelectVoucher={handleSelectVoucher}
                />
              )}

              {currentTab === 'audit' && <AuditLogView logs={auditLogs} />}

              {currentTab === 'settings' && (
                <SettingsView company={company} onRefresh={loadAllData} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
