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
} from '../types/accounting';

export const api = {
  // Company
  async getActiveCompany(): Promise<Company> {
    const res = await fetch('/api/companies/active');
    if (!res.ok) throw new Error('Failed to fetch active company');
    return res.json();
  },

  async updateCompany(id: string, data: Partial<Company>): Promise<Company> {
    const res = await fetch(`/api/companies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update company');
    return res.json();
  },

  // Documents
  async getDocuments(): Promise<AccountingDocument[]> {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async getDocument(id: string): Promise<AccountingDocument> {
    const res = await fetch(`/api/documents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch document');
    return res.json();
  },

  async uploadDocument(data: {
    fileName: string;
    mimeType?: string;
    fileBase64?: string;
    documentType?: string;
    rawText?: string;
  }): Promise<{
    document: AccountingDocument;
    voucher: Voucher;
    gstAnalysis: any;
    tdsAnalysis: any;
    duplicateCheck: any;
  }> {
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload and process document');
    }
    return res.json();
  },

  // Vouchers
  async getVouchers(): Promise<Voucher[]> {
    const res = await fetch('/api/vouchers');
    if (!res.ok) throw new Error('Failed to fetch vouchers');
    return res.json();
  },

  async getVoucher(id: string): Promise<Voucher> {
    const res = await fetch(`/api/vouchers/${id}`);
    if (!res.ok) throw new Error('Failed to fetch voucher');
    return res.json();
  },

  async updateVoucher(id: string, updates: Partial<Voucher>): Promise<Voucher> {
    const res = await fetch(`/api/vouchers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update voucher');
    return res.json();
  },

  async approveVoucher(id: string): Promise<{ success: boolean; voucher: Voucher }> {
    const res = await fetch(`/api/vouchers/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve voucher');
    }
    return res.json();
  },

  async rejectVoucher(id: string, reason: string): Promise<{ success: boolean; voucher: Voucher }> {
    const res = await fetch(`/api/vouchers/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Failed to reject voucher');
    return res.json();
  },

  // Ledgers
  async getLedgers(): Promise<Ledger[]> {
    const res = await fetch('/api/ledgers');
    if (!res.ok) throw new Error('Failed to fetch ledgers');
    return res.json();
  },

  async createLedger(data: Partial<Ledger>): Promise<Ledger> {
    const res = await fetch('/api/ledgers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create ledger');
    return res.json();
  },

  async matchLedger(vendorName: string, gstin?: string, pan?: string): Promise<any> {
    const res = await fetch('/api/ledgers/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorName, gstin, pan }),
    });
    if (!res.ok) throw new Error('Failed to match ledger');
    return res.json();
  },

  // Inventory
  async getInventory(): Promise<InventoryItem[]> {
    const res = await fetch('/api/inventory');
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
  },

  async createInventoryItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create inventory item');
    return res.json();
  },

  // Exceptions
  async getExceptions(): Promise<AccountingException[]> {
    const res = await fetch('/api/exceptions');
    if (!res.ok) throw new Error('Failed to fetch exceptions');
    return res.json();
  },

  async updateException(id: string, updates: Partial<AccountingException>): Promise<AccountingException> {
    const res = await fetch(`/api/exceptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update exception');
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await fetch('/api/audit-logs');
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // Tally & Integration
  async getIntegrationStatus(): Promise<any> {
    const res = await fetch('/api/integration/status');
    if (!res.ok) throw new Error('Failed to fetch integration status');
    return res.json();
  },

  async exportTallyVouchers(): Promise<any> {
    const res = await fetch('/api/integration/export-tally', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to export vouchers to Tally');
    }
    return res.json();
  },

  async exportTallyMasters(): Promise<any> {
    const res = await fetch('/api/integration/export-masters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to export masters to Tally');
    return res.json();
  },

  // Bank
  async getBankAccounts(): Promise<BankAccount[]> {
    const res = await fetch('/api/bank/accounts');
    if (!res.ok) throw new Error('Failed to fetch bank accounts');
    return res.json();
  },

  async getBankTransactions(accountId?: string): Promise<BankTransaction[]> {
    const url = accountId ? `/api/bank/transactions?accountId=${accountId}` : '/api/bank/transactions';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch bank transactions');
    return res.json();
  },

  async autoReconcileBank(): Promise<any> {
    const res = await fetch('/api/bank/reconcile-auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to run bank reconciliation');
    return res.json();
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<any> {
    const res = await fetch('/api/reports/dashboard-stats');
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },
};
