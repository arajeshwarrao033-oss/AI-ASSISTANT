import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Company,
  Ledger,
  InventoryItem,
  AccountingDocument,
  Voucher,
  AccountingException,
  AuditLogEntry,
  AccountingMapping,
  BankAccount,
  BankTransaction,
} from '../../src/types/accounting';

interface DatabaseSchema {
  companies: Company[];
  ledgers: Ledger[];
  inventory: InventoryItem[];
  documents: AccountingDocument[];
  vouchers: Voucher[];
  exceptions: AccountingException[];
  auditLogs: AuditLogEntry[];
  mappings: AccountingMapping[];
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  settings: {
    confidenceThresholds: {
      suggested: number;
      reviewRecommended: number;
      manualReviewRequired: number;
    };
    activeCompanyId: string;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class AccountingDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private getDefaultData(): DatabaseSchema {
    const demoCompanyId = 'comp_suryavanshi_01';
    
    // Default Demo Company (Indian context: Maharashtra - 27)
    const demoCompany: Company = {
      id: demoCompanyId,
      name: 'Suryavanshi Industrial Solutions Pvt Ltd',
      legalName: 'Suryavanshi Industrial Solutions Private Limited',
      tradeName: 'Suryavanshi Tech & Spares',
      pan: 'AABCS1429B',
      gstin: '27AABCS1429B1Z8',
      tan: 'PNEA02394F',
      cin: 'U72200PN2021PTC199824',
      address: 'Plot 42, Hinjawadi Phase 2, IT Park',
      city: 'Pune',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '411057',
      financialYear: '2024-2025',
      booksStartDate: '2024-04-01',
      baseCurrency: 'INR',
      accountingSoftware: 'Tally',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Standard Indian Chart of Accounts (Ledgers)
    const defaultLedgers: Ledger[] = [
      // Sundry Creditors (Vendors)
      {
        id: 'led_cred_01',
        companyId: demoCompanyId,
        name: 'ABC Tech Consultants LLP',
        parentGroup: 'Sundry Creditors',
        ledgerType: 'Vendor',
        nature: 'Liability',
        gstApplicability: true,
        gstin: '27AAHFA8821R1ZG',
        pan: 'AAHFA8821R',
        state: 'Maharashtra',
        tdsApplicability: true,
        tdsSection: '194J',
        active: true,
      },
      {
        id: 'led_cred_02',
        companyId: demoCompanyId,
        name: 'Apex Cloud & Infrastructure Services',
        parentGroup: 'Sundry Creditors',
        ledgerType: 'Vendor',
        nature: 'Liability',
        gstApplicability: true,
        gstin: '29AABCA9901C1ZH', // Karnataka (Inter-state)
        pan: 'AABCA9901C',
        state: 'Karnataka',
        tdsApplicability: true,
        tdsSection: '194J',
        active: true,
      },
      {
        id: 'led_cred_03',
        companyId: demoCompanyId,
        name: 'Mahalaxmi Properties & Commercial Estates',
        parentGroup: 'Sundry Creditors',
        ledgerType: 'Vendor',
        nature: 'Liability',
        gstApplicability: true,
        gstin: '27AAECM4432K1Z9',
        pan: 'AAECM4432K',
        state: 'Maharashtra',
        tdsApplicability: true,
        tdsSection: '194I',
        active: true,
      },
      {
        id: 'led_cred_04',
        companyId: demoCompanyId,
        name: 'Speedex Logistics & Freight Movers',
        parentGroup: 'Sundry Creditors',
        ledgerType: 'Vendor',
        nature: 'Liability',
        gstApplicability: true,
        gstin: '27AAMCS1234D1ZF',
        pan: 'AAMCS1234D',
        state: 'Maharashtra',
        tdsApplicability: true,
        tdsSection: '194C',
        active: true,
      },

      // Expense Ledgers (Indirect & Direct)
      {
        id: 'led_exp_prof',
        companyId: demoCompanyId,
        name: 'Professional & Legal Fees',
        parentGroup: 'Indirect Expenses',
        ledgerType: 'Expense',
        nature: 'Expense',
        gstApplicability: true,
        tdsApplicability: true,
        tdsSection: '194J',
        defaultTaxTreatment: '18% GST',
        active: true,
      },
      {
        id: 'led_exp_rent',
        companyId: demoCompanyId,
        name: 'Office Rent & Workspace Lease',
        parentGroup: 'Indirect Expenses',
        ledgerType: 'Expense',
        nature: 'Expense',
        gstApplicability: true,
        tdsApplicability: true,
        tdsSection: '194I',
        defaultTaxTreatment: '18% GST',
        active: true,
      },
      {
        id: 'led_exp_software',
        companyId: demoCompanyId,
        name: 'Software, Cloud & SaaS Subscriptions',
        parentGroup: 'Indirect Expenses',
        ledgerType: 'Expense',
        nature: 'Expense',
        gstApplicability: true,
        tdsApplicability: true,
        tdsSection: '194J',
        defaultTaxTreatment: '18% GST',
        active: true,
      },
      {
        id: 'led_exp_contractor',
        companyId: demoCompanyId,
        name: 'Contractor & Maintenance Charges',
        parentGroup: 'Indirect Expenses',
        ledgerType: 'Expense',
        nature: 'Expense',
        gstApplicability: true,
        tdsApplicability: true,
        tdsSection: '194C',
        defaultTaxTreatment: '18% GST',
        active: true,
      },
      {
        id: 'led_exp_travel',
        companyId: demoCompanyId,
        name: 'Travel, Lodging & Conveyance',
        parentGroup: 'Indirect Expenses',
        ledgerType: 'Expense',
        nature: 'Expense',
        gstApplicability: true,
        tdsApplicability: false,
        active: true,
      },
      {
        id: 'led_exp_electricity',
        companyId: demoCompanyId,
        name: 'Electricity & Power Utility',
        parentGroup: 'Indirect Expenses',
        ledgerType: 'Expense',
        nature: 'Expense',
        gstApplicability: false,
        tdsApplicability: false,
        active: true,
      },
      {
        id: 'led_exp_advert',
        companyId: demoCompanyId,
        name: 'Advertising & Digital Marketing',
        parentGroup: 'Indirect Expenses',
        ledgerType: 'Expense',
        nature: 'Expense',
        gstApplicability: true,
        tdsApplicability: true,
        tdsSection: '194C',
        active: true,
      },
      {
        id: 'led_exp_purchases',
        companyId: demoCompanyId,
        name: 'Raw Material & Component Purchases',
        parentGroup: 'Purchase Accounts',
        ledgerType: 'Expense',
        nature: 'Expense',
        gstApplicability: true,
        tdsApplicability: true,
        tdsSection: '194Q',
        active: true,
      },

      // Duties & Taxes (GST)
      {
        id: 'led_tax_cgst_in',
        companyId: demoCompanyId,
        name: 'Input CGST',
        parentGroup: 'Duties & Taxes',
        ledgerType: 'Tax',
        nature: 'Asset',
        gstApplicability: true,
        gstType: 'CGST',
        tdsApplicability: false,
        active: true,
      },
      {
        id: 'led_tax_sgst_in',
        companyId: demoCompanyId,
        name: 'Input SGST',
        parentGroup: 'Duties & Taxes',
        ledgerType: 'Tax',
        nature: 'Asset',
        gstApplicability: true,
        gstType: 'SGST',
        tdsApplicability: false,
        active: true,
      },
      {
        id: 'led_tax_igst_in',
        companyId: demoCompanyId,
        name: 'Input IGST',
        parentGroup: 'Duties & Taxes',
        ledgerType: 'Tax',
        nature: 'Asset',
        gstApplicability: true,
        gstType: 'IGST',
        tdsApplicability: false,
        active: true,
      },
      {
        id: 'led_tax_cgst_out',
        companyId: demoCompanyId,
        name: 'Output CGST',
        parentGroup: 'Duties & Taxes',
        ledgerType: 'Tax',
        nature: 'Liability',
        gstApplicability: true,
        gstType: 'CGST',
        tdsApplicability: false,
        active: true,
      },
      {
        id: 'led_tax_sgst_out',
        companyId: demoCompanyId,
        name: 'Output SGST',
        parentGroup: 'Duties & Taxes',
        ledgerType: 'Tax',
        nature: 'Liability',
        gstApplicability: true,
        gstType: 'SGST',
        tdsApplicability: false,
        active: true,
      },
      {
        id: 'led_tax_igst_out',
        companyId: demoCompanyId,
        name: 'Output IGST',
        parentGroup: 'Duties & Taxes',
        ledgerType: 'Tax',
        nature: 'Liability',
        gstApplicability: true,
        gstType: 'IGST',
        tdsApplicability: false,
        active: true,
      },

      // TDS Payable Ledgers (Duties & Taxes)
      {
        id: 'led_tax_tds_194j',
        companyId: demoCompanyId,
        name: 'TDS Payable - Sec 194J (Professional / Tech)',
        parentGroup: 'Duties & Taxes',
        ledgerType: 'Tax',
        nature: 'Liability',
        gstApplicability: false,
        tdsApplicability: true,
        tdsSection: '194J',
        active: true,
      },
      {
        id: 'led_tax_tds_194c',
        companyId: demoCompanyId,
        name: 'TDS Payable - Sec 194C (Contractors)',
        parentGroup: 'Duties & Taxes',
        ledgerType: 'Tax',
        nature: 'Liability',
        gstApplicability: false,
        tdsApplicability: true,
        tdsSection: '194C',
        active: true,
      },
      {
        id: 'led_tax_tds_194i',
        companyId: demoCompanyId,
        name: 'TDS Payable - Sec 194I (Rent)',
        parentGroup: 'Duties & Taxes',
        ledgerType: 'Tax',
        nature: 'Liability',
        gstApplicability: false,
        tdsApplicability: true,
        tdsSection: '194I',
        active: true,
      },
      {
        id: 'led_tax_tds_194q',
        companyId: demoCompanyId,
        name: 'TDS Payable - Sec 194Q (Purchase of Goods)',
        parentGroup: 'Duties & Taxes',
        ledgerType: 'Tax',
        nature: 'Liability',
        gstApplicability: false,
        tdsApplicability: true,
        tdsSection: '194Q',
        active: true,
      },

      // Other System Ledgers
      {
        id: 'led_round_off',
        companyId: demoCompanyId,
        name: 'Round Off',
        parentGroup: 'Indirect Expenses',
        ledgerType: 'General',
        nature: 'Expense',
        gstApplicability: false,
        tdsApplicability: false,
        active: true,
      },
      {
        id: 'led_bank_hdfc',
        companyId: demoCompanyId,
        name: 'HDFC Bank Current A/c - 50200049281',
        parentGroup: 'Bank Accounts',
        ledgerType: 'Bank',
        nature: 'Asset',
        gstApplicability: false,
        tdsApplicability: false,
        active: true,
      },
      {
        id: 'led_bank_icici',
        companyId: demoCompanyId,
        name: 'ICICI Bank Current A/c - 00470501239',
        parentGroup: 'Bank Accounts',
        ledgerType: 'Bank',
        nature: 'Asset',
        gstApplicability: false,
        tdsApplicability: false,
        active: true,
      },
    ];

    // Inventory Items
    const defaultInventory: InventoryItem[] = [
      {
        id: 'inv_item_01',
        companyId: demoCompanyId,
        name: 'Precision Stepper Motor 24V NEMA 23',
        sku: 'MOT-NEMA23-24V',
        hsn: '8501',
        unit: 'NOS',
        stockGroup: 'Motors & Actuators',
        gstRate: 18,
        purchaseRate: 2450,
        salesRate: 3600,
        openingQuantity: 100,
        openingValue: 245000,
        currentStock: 82,
        active: true,
      },
      {
        id: 'inv_item_02',
        companyId: demoCompanyId,
        name: 'Microcontroller Controller Board V3.2',
        sku: 'PCB-CTRL-V32',
        hsn: '8537',
        unit: 'NOS',
        stockGroup: 'Electronics',
        gstRate: 18,
        purchaseRate: 1150,
        salesRate: 1850,
        openingQuantity: 250,
        openingValue: 287500,
        currentStock: 195,
        active: true,
      },
      {
        id: 'inv_item_03',
        companyId: demoCompanyId,
        name: 'Industrial Linear Optical Sensor',
        sku: 'SNS-LIN-OPT-01',
        hsn: '9031',
        unit: 'NOS',
        stockGroup: 'Sensors',
        gstRate: 18,
        purchaseRate: 3200,
        salesRate: 4800,
        openingQuantity: 40,
        openingValue: 128000,
        currentStock: 35,
        active: true,
      },
    ];

    // Bank Accounts
    const defaultBankAccounts: BankAccount[] = [
      {
        id: 'bank_acc_01',
        companyId: demoCompanyId,
        bankName: 'HDFC Bank',
        accountNumber: '50200049281190',
        ifscCode: 'HDFC0000039',
        branch: 'Hinjawadi, Pune',
        ledgerId: 'led_bank_hdfc',
        currentBookBalance: 1450200.5,
      },
    ];

    return {
      companies: [demoCompany],
      ledgers: defaultLedgers,
      inventory: defaultInventory,
      documents: [],
      vouchers: [],
      exceptions: [],
      auditLogs: [
        {
          id: 'log_init_01',
          companyId: demoCompanyId,
          timestamp: new Date().toISOString(),
          user: 'System Admin (Accountant)',
          action: 'MASTER_CREATED',
          entity: 'COMPANY',
          entityId: demoCompanyId,
          newValue: 'Initialized Company Chart of Accounts and GST/TDS tax engines',
        },
      ],
      mappings: [],
      bankAccounts: defaultBankAccounts,
      bankTransactions: [],
      settings: {
        confidenceThresholds: {
          suggested: 0.9,
          reviewRecommended: 0.7,
          manualReviewRequired: 0.5,
        },
        activeCompanyId: demoCompanyId,
      },
    };
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading database file, initializing defaults:', e);
    }
    const defaultData = this.getDefaultData();
    this.saveDatabase(defaultData);
    return defaultData;
  }

  private saveDatabase(data: DatabaseSchema): void {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  private persist(): void {
    this.saveDatabase(this.data);
  }

  // Company API
  getCompanies(): Company[] {
    return this.data.companies;
  }

  getCompany(id: string): Company | undefined {
    return this.data.companies.find((c) => c.id === id);
  }

  getActiveCompany(): Company {
    const active = this.data.companies.find((c) => c.id === this.data.settings.activeCompanyId);
    return active || this.data.companies[0];
  }

  createCompany(companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Company {
    const newCompany: Company = {
      ...companyData,
      id: `comp_${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.companies.push(newCompany);
    this.persist();
    return newCompany;
  }

  updateCompany(id: string, updates: Partial<Company>): Company | undefined {
    const idx = this.data.companies.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.data.companies[idx] = {
      ...this.data.companies[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.companies[idx];
  }

  // Ledgers API
  getLedgers(companyId: string): Ledger[] {
    return this.data.ledgers.filter((l) => l.companyId === companyId);
  }

  getLedger(id: string): Ledger | undefined {
    return this.data.ledgers.find((l) => l.id === id);
  }

  findLedgerByName(companyId: string, name: string): Ledger | undefined {
    const clean = name.trim().toLowerCase();
    return this.data.ledgers.find(
      (l) => l.companyId === companyId && l.name.trim().toLowerCase() === clean
    );
  }

  createLedger(ledgerData: Omit<Ledger, 'id'>): Ledger {
    const newLedger: Ledger = {
      ...ledgerData,
      id: `led_${crypto.randomUUID().slice(0, 8)}`,
    };
    this.data.ledgers.push(newLedger);
    this.persist();
    return newLedger;
  }

  updateLedger(id: string, updates: Partial<Ledger>): Ledger | undefined {
    const idx = this.data.ledgers.findIndex((l) => l.id === id);
    if (idx === -1) return undefined;
    this.data.ledgers[idx] = {
      ...this.data.ledgers[idx],
      ...updates,
    };
    this.persist();
    return this.data.ledgers[idx];
  }

  // Inventory API
  getInventory(companyId: string): InventoryItem[] {
    return this.data.inventory.filter((i) => i.companyId === companyId);
  }

  createInventoryItem(itemData: Omit<InventoryItem, 'id'>): InventoryItem {
    const newItem: InventoryItem = {
      ...itemData,
      id: `inv_${crypto.randomUUID().slice(0, 8)}`,
    };
    this.data.inventory.push(newItem);
    this.persist();
    return newItem;
  }

  // Documents API
  getDocuments(companyId: string): AccountingDocument[] {
    return this.data.documents.filter((d) => d.companyId === companyId);
  }

  getDocument(id: string): AccountingDocument | undefined {
    return this.data.documents.find((d) => d.id === id);
  }

  findDocumentByHash(fileHash: string): AccountingDocument | undefined {
    return this.data.documents.find((d) => d.fileHash === fileHash);
  }

  findDuplicateInvoice(
    companyId: string,
    supplierGstin: string | undefined,
    invoiceNumber: string | undefined,
    grossAmount: number
  ): AccountingDocument | undefined {
    if (!invoiceNumber) return undefined;
    const cleanInv = invoiceNumber.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return this.data.documents.find((d) => {
      if (d.companyId !== companyId) return false;
      const dCleanInv = d.invoiceNumber?.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const invMatches = dCleanInv && dCleanInv === cleanInv;
      const gstinMatches = supplierGstin && d.supplierGstin && supplierGstin.toLowerCase() === d.supplierGstin.toLowerCase();
      const amountMatches = Math.abs(d.grossAmount - grossAmount) < 1.0;
      return (invMatches && gstinMatches) || (invMatches && amountMatches);
    });
  }

  createDocument(doc: Omit<AccountingDocument, 'id' | 'createdAt' | 'updatedAt'>): AccountingDocument {
    const newDoc: AccountingDocument = {
      ...doc,
      id: `doc_${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.documents.push(newDoc);
    this.persist();
    return newDoc;
  }

  updateDocument(id: string, updates: Partial<AccountingDocument>): AccountingDocument | undefined {
    const idx = this.data.documents.findIndex((d) => d.id === id);
    if (idx === -1) return undefined;
    this.data.documents[idx] = {
      ...this.data.documents[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.documents[idx];
  }

  // Vouchers API
  getVouchers(companyId: string): Voucher[] {
    return this.data.vouchers.filter((v) => v.companyId === companyId);
  }

  getVoucher(id: string): Voucher | undefined {
    return this.data.vouchers.find((v) => v.id === id);
  }

  createVoucher(voucher: Omit<Voucher, 'id' | 'createdAt' | 'updatedAt'>): Voucher {
    const newVoucher: Voucher = {
      ...voucher,
      id: `vch_${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.vouchers.push(newVoucher);
    this.persist();
    return newVoucher;
  }

  updateVoucher(id: string, updates: Partial<Voucher>): Voucher | undefined {
    const idx = this.data.vouchers.findIndex((v) => v.id === id);
    if (idx === -1) return undefined;
    this.data.vouchers[idx] = {
      ...this.data.vouchers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.vouchers[idx];
  }

  // Exceptions API
  getExceptions(companyId: string): AccountingException[] {
    return this.data.exceptions.filter((e) => e.companyId === companyId);
  }

  createException(ex: Omit<AccountingException, 'id' | 'createdAt'>): AccountingException {
    const newException: AccountingException = {
      ...ex,
      id: `exc_${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.exceptions.push(newException);
    this.persist();
    return newException;
  }

  updateException(id: string, updates: Partial<AccountingException>): AccountingException | undefined {
    const idx = this.data.exceptions.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.data.exceptions[idx] = {
      ...this.data.exceptions[idx],
      ...updates,
    };
    this.persist();
    return this.data.exceptions[idx];
  }

  // Audit Logs API
  getAuditLogs(companyId: string): AuditLogEntry[] {
    return this.data.auditLogs
      .filter((l) => l.companyId === companyId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const newLog: AuditLogEntry = {
      ...entry,
      id: `log_${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.push(newLog);
    this.persist();
    return newLog;
  }

  // Learned Mappings (Company corrections)
  getMappings(companyId: string): AccountingMapping[] {
    return this.data.mappings.filter((m) => m.companyId === companyId);
  }

  findMapping(companyId: string, vendorOrKeyword: string): AccountingMapping | undefined {
    const needle = vendorOrKeyword.toLowerCase().trim();
    return this.data.mappings.find((m) => {
      if (m.companyId !== companyId) return false;
      return (
        m.vendorNameOrGstin.toLowerCase().includes(needle) ||
        (m.keyword && needle.includes(m.keyword.toLowerCase()))
      );
    });
  }

  saveMapping(mapping: Omit<AccountingMapping, 'id' | 'lastUpdated' | 'appliedCount'>): AccountingMapping {
    const existing = this.data.mappings.find(
      (m) =>
        m.companyId === mapping.companyId &&
        m.vendorNameOrGstin.toLowerCase() === mapping.vendorNameOrGstin.toLowerCase()
    );

    if (existing) {
      existing.preferredExpenseLedgerId = mapping.preferredExpenseLedgerId;
      existing.preferredExpenseLedgerName = mapping.preferredExpenseLedgerName;
      existing.preferredTdsSection = mapping.preferredTdsSection;
      existing.preferredGstRate = mapping.preferredGstRate;
      existing.appliedCount += 1;
      existing.lastUpdated = new Date().toISOString();
      this.persist();
      return existing;
    }

    const newMapping: AccountingMapping = {
      ...mapping,
      id: `map_${crypto.randomUUID().slice(0, 8)}`,
      appliedCount: 1,
      lastUpdated: new Date().toISOString(),
    };
    this.data.mappings.push(newMapping);
    this.persist();
    return newMapping;
  }

  // Bank Reconciliation
  getBankAccounts(companyId: string): BankAccount[] {
    return this.data.bankAccounts.filter((b) => b.companyId === companyId);
  }

  getBankTransactions(bankAccountId: string): BankTransaction[] {
    return this.data.bankTransactions.filter((t) => t.bankAccountId === bankAccountId);
  }

  createBankTransaction(tx: Omit<BankTransaction, 'id'>): BankTransaction {
    const newTx: BankTransaction = {
      ...tx,
      id: `tx_${crypto.randomUUID().slice(0, 8)}`,
    };
    this.data.bankTransactions.push(newTx);
    this.persist();
    return newTx;
  }

  updateBankTransaction(id: string, updates: Partial<BankTransaction>): BankTransaction | undefined {
    const idx = this.data.bankTransactions.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    this.data.bankTransactions[idx] = {
      ...this.data.bankTransactions[idx],
      ...updates,
    };
    this.persist();
    return this.data.bankTransactions[idx];
  }

  // Settings
  getSettings() {
    return this.data.settings;
  }

  updateSettings(updates: Partial<DatabaseSchema['settings']>) {
    this.data.settings = {
      ...this.data.settings,
      ...updates,
    };
    this.persist();
    return this.data.settings;
  }
}

export const db = new AccountingDatabase();
