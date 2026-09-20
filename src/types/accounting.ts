// Core TypeScript Types for AI Finance Assistant (Indian Accounting Domain)

export type AccountingSoftware =
  | 'Tally'
  | 'QuickBooks Online'
  | 'Zoho Books'
  | 'None'
  | 'TallyPrime'
  | 'QuickBooks'
  | 'ZohoBooks';

export type DocumentStatus =
  | 'DRAFT'
  | 'AI_PROCESSED'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'POSTED'
  | 'ERROR';

export type VoucherStatus =
  | 'DRAFT'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'POSTED'
  | 'EXPORTED_TALLY';

export type DocumentType =
  | 'Purchase invoice'
  | 'Sales invoice'
  | 'Expense bill'
  | 'Receipt'
  | 'Debit note'
  | 'Credit note'
  | 'Bank statement'
  | 'Other';

export type VoucherType =
  | 'Purchase'
  | 'Sales'
  | 'Payment'
  | 'Receipt'
  | 'Journal'
  | 'Contra'
  | 'Debit Note'
  | 'Credit Note';

export type LedgerNature = 'Asset' | 'Liability' | 'Income' | 'Expense' | 'Equity';

export type GSTTreatment =
  | 'CGST_SGST'
  | 'IGST'
  | 'Exempt'
  | 'Nil_Rated'
  | 'Zero_Rated'
  | 'Reverse_Charge'
  | 'Unknown_Review_Required';

export type ITCEligibility =
  | 'Eligible'
  | 'Potentially_Ineligible'
  | 'Requires_Review'
  | 'Blocked'
  | 'Ineligible';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Company {
  id: string;
  name: string;
  legalName: string;
  tradeName?: string;
  pan: string;
  gstin: string;
  tan?: string;
  cin?: string;
  address: string;
  city: string;
  state: string; // e.g. "Maharashtra"
  stateCode: string; // e.g. "27"
  pincode: string;
  financialYear: string; // e.g. "2024-2025"
  booksStartDate: string;
  baseCurrency: string; // "INR"
  accountingSoftware: AccountingSoftware;
  confidenceThresholds?: {
    autoApprove: number;
    reviewRecommended: number;
    manualRequired: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedField<T = string | number | boolean> {
  value: T;
  confidence: number; // 0.0 - 1.0
  source?: string;
  reviewRequired?: boolean;
}

export interface ExtractedLineItem {
  id: string;
  description: ExtractedField<string>;
  sku?: ExtractedField<string>;
  hsnSac?: ExtractedField<string>;
  quantity: ExtractedField<number>;
  unit: ExtractedField<string>;
  rate: ExtractedField<number>;
  discount: ExtractedField<number>;
  taxableValue: ExtractedField<number>;
  gstRate: ExtractedField<number>; // e.g., 18
  cgst: ExtractedField<number>;
  sgst: ExtractedField<number>;
  igst: ExtractedField<number>;
  cess?: ExtractedField<number>;
  suggestedLedgerId?: string;
  suggestedLedgerName?: string;
}

export interface DocumentExtraction {
  supplier: {
    name: ExtractedField<string>;
    gstin: ExtractedField<string>;
    pan: ExtractedField<string>;
    address: ExtractedField<string>;
    state: ExtractedField<string>;
    stateCode: ExtractedField<string>;
  };
  customer?: {
    name: ExtractedField<string>;
    gstin: ExtractedField<string>;
    address: ExtractedField<string>;
    state: ExtractedField<string>;
  };
  invoice: {
    invoiceNumber: ExtractedField<string>;
    invoiceDate: ExtractedField<string>;
    dueDate: ExtractedField<string>;
    poNumber?: ExtractedField<string>;
    placeOfSupply: ExtractedField<string>;
  };
  lineItems: ExtractedLineItem[];
  totals: {
    subtotal: ExtractedField<number>;
    tax: ExtractedField<number>;
    tdsIfShown?: ExtractedField<number>;
    roundOff: ExtractedField<number>;
    grandTotal: ExtractedField<number>;
  };
  rawText?: string;
  aiNotes?: string[];
  extractionTimestamp: string;
}

export interface AccountingDocument {
  id: string;
  companyId: string;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string; // SHA-256 for duplicate detection
  uploadDateTime: string;
  fileDataUrl?: string; // Stored locally for preview
  supplierName?: string;
  supplierGstin?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  currency: string;
  taxableAmount: number;
  gstAmount: number;
  tdsAmount: number;
  netPayable: number;
  grossAmount: number;
  status: DocumentStatus;
  extraction?: DocumentExtraction;
  voucherId?: string;
  duplicateOfId?: string;
  duplicateReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerGroup {
  id: string;
  name: string;
  nature: LedgerNature;
  parentGroupId?: string;
}

export interface Ledger {
  id: string;
  companyId: string;
  name: string;
  parentGroup: string;
  ledgerType: string;
  nature: LedgerNature;
  gstApplicability: boolean;
  gstType?: 'CGST' | 'SGST' | 'IGST' | 'Cess' | 'Not Applicable';
  tdsApplicability: boolean;
  tdsSection?: string;
  defaultTaxTreatment?: string;
  pan?: string;
  gstin?: string;
  state?: string;
  active: boolean;
  externalSystemId?: string; // Tally GUID or Name
  openingBalance?: number;
  balanceType?: 'Dr' | 'Cr';
}

export interface InventoryItem {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  hsn: string;
  hsnCode?: string;
  unit: string;
  stockGroup: string;
  gstRate: number;
  purchaseRate: number;
  salesRate: number;
  openingQuantity: number;
  openingValue: number;
  currentStock: number;
  stockQuantity?: number;
  costPrice?: number;
  sellingPrice?: number;
  active: boolean;
  externalSystemId?: string;
}

export interface GSTAnalysisResult {
  treatment: GSTTreatment;
  gstRate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  supplierGstin: string;
  supplierState: string;
  companyState: string;
  placeOfSupply: string;
  isInterState: boolean;
  isRcmApplicable: boolean;
  isRcm?: boolean;
  itcEligibility: ITCEligibility;
  confidence: number;
  reason: string;
  reviewRequired: boolean;
  hsnSacCodes: string[];
}

export interface TDSAnalysisResult {
  isApplicable: boolean;
  sectionCode?: string; // e.g. "194J", "194C", "194I"
  sectionDescription?: string;
  thresholdAmount?: number;
  applicableRate?: number; // e.g. 10 or 2 or 1
  tdsAmount: number;
  baseAmount: number;
  panStatus: 'Valid' | 'Missing' | 'Invalid' | 'Unknown';
  vendorPan?: string;
  confidence: number;
  reason: string;
  insufficientInfo: boolean;
  missingFields?: string[];
  reviewRequired: boolean;
}

export interface VoucherLine {
  id: string;
  ledgerId: string;
  ledgerName: string;
  ledgerNature?: LedgerNature;
  debit: number;
  credit: number;
  narration?: string;
  lineType:
    | 'EXPENSE'
    | 'ASSET'
    | 'PARTY'
    | 'TAX_GST'
    | 'TAX_TDS'
    | 'ROUND_OFF'
    | 'BANK_CASH'
    | 'CGST'
    | 'SGST'
    | 'IGST'
    | 'TDS';
  inventoryItemId?: string;
  inventoryQuantity?: number;
  inventoryRate?: number;
}

export interface Voucher {
  id: string;
  companyId: string;
  sourceDocumentId?: string;
  voucherType: VoucherType;
  voucherDate: string;
  referenceNumber: string;
  narration: string;
  lines: VoucherLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  aiConfidence: {
    vendorIdentification: number;
    ledgerClassification: number;
    gstTreatment: number;
    tdsClassification: number;
    overall: number;
  };
  gstAnalysis?: GSTAnalysisResult;
  tdsAnalysis?: TDSAnalysisResult;
  status: VoucherStatus;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  tallyExportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingException {
  id: string;
  companyId: string;
  documentId?: string;
  voucherId?: string;
  relatedDocumentId?: string;
  relatedVoucherId?: string;
  category:
    | 'LOW_CONFIDENCE'
    | 'MISSING_GSTIN'
    | 'POSSIBLE_DUPLICATE'
    | 'TDS_INFO_MISSING'
    | 'GST_MISMATCH'
    | 'DEBIT_CREDIT_IMBALANCE'
    | 'UNKNOWN_LEDGER'
    | 'UNKNOWN_INVENTORY'
    | 'TAX_MISMATCH'
    | 'DUPLICATE_INVOICE';
  severity: ExceptionSeverity;
  title: string;
  description: string;
  suggestedAction: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';
  assignedUser?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AuditLogEntry {
  id: string;
  companyId: string;
  timestamp: string;
  user: string;
  userName?: string;
  userId?: string;
  action:
    | 'DOCUMENT_UPLOADED'
    | 'AI_EXTRACTED'
    | 'USER_CHANGED_VENDOR'
    | 'USER_CHANGED_LEDGER'
    | 'USER_CHANGED_TDS'
    | 'USER_CHANGED_GST'
    | 'VOUCHER_CREATED'
    | 'VOUCHER_UPDATED'
    | 'VOUCHER_APPROVED'
    | 'VOUCHER_REJECTED'
    | 'TALLY_EXPORTED'
    | 'MASTER_CREATED';
  entity: 'DOCUMENT' | 'VOUCHER' | 'LEDGER' | 'INVENTORY' | 'COMPANY';
  entityType?: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  details?: any;
}

export interface AccountingMapping {
  id: string;
  companyId: string;
  vendorNameOrGstin: string;
  keyword?: string;
  preferredExpenseLedgerId: string;
  preferredExpenseLedgerName: string;
  preferredTdsSection?: string;
  preferredGstRate?: number;
  appliedCount: number;
  lastUpdated: string;
}

export interface BankAccount {
  id: string;
  companyId: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  ledgerId: string;
  currentBookBalance: number;
  balance?: number;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  date: string;
  description: string;
  referenceNumber?: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  status: 'Unmatched' | 'Suggested Match' | 'Matched' | 'Manually Matched' | 'Exception' | 'Suggested';
  matchedVoucherId?: string;
  matchConfidence?: number;
  matchNotes?: string;
}

export interface ConfidenceThresholds {
  suggested: number; // e.g. 0.90
  reviewRecommended: number; // e.g. 0.70
  manualReviewRequired: number; // < 0.70
}
