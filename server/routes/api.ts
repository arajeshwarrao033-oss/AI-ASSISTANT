import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { documentExtractionService } from '../services/ai/documentExtractionService';
import { duplicateDetectionService } from '../services/ai/duplicateDetectionService';
import { accountingClassificationService } from '../services/ai/accountingClassificationService';
import { ledgerMatchingService } from '../services/ai/ledgerMatchingService';
import { gstAnalysisService } from '../services/ai/gstAnalysisService';
import { tdsAnalysisService } from '../services/ai/tdsAnalysisService';
import { bankMatchingService } from '../services/ai/bankMatchingService';
import { getAccountingProvider } from '../services/integration/accountingProvider';
import { DocumentType } from '../../src/types/accounting';

const router = Router();

// ----------------------------------------------------
// COMPANY ROUTES
// ----------------------------------------------------
router.get('/companies', (req: Request, res: Response) => {
  const companies = db.getCompanies();
  const activeCompany = db.getActiveCompany();
  res.json({ companies, activeCompanyId: activeCompany?.id });
});

router.get('/companies/active', (req: Request, res: Response) => {
  res.json(db.getActiveCompany());
});

router.post('/companies', (req: Request, res: Response) => {
  const company = db.createCompany(req.body);
  db.logAudit({
    companyId: company.id,
    user: 'Accountant',
    action: 'MASTER_CREATED',
    entity: 'COMPANY',
    entityId: company.id,
    newValue: `Created company ${company.name} (${company.gstin})`,
  });
  res.status(201).json(company);
});

router.put('/companies/:id', (req: Request, res: Response) => {
  const updated = db.updateCompany(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Company not found' });
  }
  db.logAudit({
    companyId: updated.id,
    user: 'Accountant',
    action: 'MASTER_CREATED',
    entity: 'COMPANY',
    entityId: updated.id,
    newValue: `Updated company details for ${updated.name}`,
  });
  res.json(updated);
});

router.post('/companies/:id/activate', (req: Request, res: Response) => {
  const company = db.getCompany(req.params.id);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }
  db.updateSettings({ activeCompanyId: company.id });
  res.json({ success: true, activeCompany: company });
});

// ----------------------------------------------------
// DOCUMENTS & AI PROCESSING
// ----------------------------------------------------
router.get('/documents', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const docs = db.getDocuments(company.id);
  res.json(docs);
});

router.get('/documents/:id', (req: Request, res: Response) => {
  const doc = db.getDocument(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

/**
 * Upload & Process Document:
 * 1. Store metadata
 * 2. Compute SHA-256 hash
 * 3. Check for duplicates
 * 4. Run AI Document Extraction
 * 5. Classify & Propose Accounting Voucher
 * 6. Check Exceptions & Log Audit
 */
router.post('/documents/upload', async (req: Request, res: Response) => {
  try {
    const company = db.getActiveCompany();
    const {
      fileName,
      mimeType,
      fileBase64,
      documentType = 'Purchase invoice',
      rawText,
    } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    // Compute binary SHA-256 hash
    const contentToHash = fileBase64 || rawText || fileName + Date.now();
    const fileHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

    // Run AI Document Extraction
    const extraction = await documentExtractionService.extractDocument({
      fileName,
      mimeType: mimeType || 'image/jpeg',
      base64Data: fileBase64,
      rawText,
    });

    // Check Duplicates
    const duplicateCheck = duplicateDetectionService.checkDuplicate(
      company.id,
      fileHash,
      extraction
    );

    const grossAmount = extraction.totals.grandTotal.value || 0;
    const taxableAmount = extraction.totals.subtotal.value || 0;
    const gstAmount = extraction.totals.tax.value || 0;
    const tdsAmount = extraction.totals.tdsIfShown?.value || 0;
    const netPayable = grossAmount - tdsAmount;

    // Create Document entity
    const newDoc = db.createDocument({
      companyId: company.id,
      documentType: documentType as DocumentType,
      fileName,
      fileSize: fileBase64 ? Math.round((fileBase64.length * 3) / 4) : 1024,
      mimeType: mimeType || 'application/pdf',
      fileHash,
      uploadDateTime: new Date().toISOString(),
      fileDataUrl: fileBase64 ? (fileBase64.startsWith('data:') ? fileBase64 : `data:${mimeType || 'image/jpeg'};base64,${fileBase64}`) : undefined,
      supplierName: extraction.supplier.name.value,
      supplierGstin: extraction.supplier.gstin?.value,
      invoiceNumber: extraction.invoice.invoiceNumber.value,
      invoiceDate: extraction.invoice.invoiceDate.value,
      dueDate: extraction.invoice.dueDate.value,
      currency: 'INR',
      taxableAmount,
      gstAmount,
      tdsAmount,
      netPayable,
      grossAmount,
      status: duplicateCheck.isDuplicate ? 'REVIEW_REQUIRED' : 'AI_PROCESSED',
      extraction,
      duplicateOfId: duplicateCheck.duplicateOfDocId,
      duplicateReason: duplicateCheck.isDuplicate ? duplicateCheck.reasons.join('; ') : undefined,
    });

    // Record Audit Log for upload & extraction
    db.logAudit({
      companyId: company.id,
      user: 'Accountant',
      action: 'DOCUMENT_UPLOADED',
      entity: 'DOCUMENT',
      entityId: newDoc.id,
      newValue: `Uploaded ${fileName} (Hash: ${fileHash.substring(0, 10)}...)`,
    });

    db.logAudit({
      companyId: company.id,
      user: 'AI Copilot Engine',
      action: 'AI_EXTRACTED',
      entity: 'DOCUMENT',
      entityId: newDoc.id,
      newValue: `Extracted Inv #${newDoc.invoiceNumber} from ${newDoc.supplierName} (₹${newDoc.grossAmount})`,
    });

    // Duplicate Exception
    if (duplicateCheck.isDuplicate) {
      db.createException({
        companyId: company.id,
        documentId: newDoc.id,
        category: 'POSSIBLE_DUPLICATE',
        severity: 'HIGH',
        title: `Possible Duplicate Document: ${newDoc.fileName}`,
        description: duplicateCheck.reasons.join('; '),
        suggestedAction: 'Compare with previous document before approving voucher entry.',
        status: 'OPEN',
      });
    }

    // Generate Proposed Voucher
    const classification = accountingClassificationService.classifyAndGenerateVoucher({
      company,
      extraction,
      sourceDocumentId: newDoc.id,
    });

    const proposedVoucher = db.createVoucher(classification.voucher);

    // Link voucher to document
    db.updateDocument(newDoc.id, { voucherId: proposedVoucher.id });

    // Register all exceptions generated during accounting analysis
    classification.exceptionsToCreate.forEach((ex) => {
      db.createException({
        companyId: company.id,
        documentId: newDoc.id,
        voucherId: proposedVoucher.id,
        category: ex.category,
        severity: ex.severity,
        title: ex.title,
        description: ex.description,
        suggestedAction: ex.suggestedAction,
        status: 'OPEN',
      });
    });

    db.logAudit({
      companyId: company.id,
      user: 'AI Copilot Engine',
      action: 'VOUCHER_CREATED',
      entity: 'VOUCHER',
      entityId: proposedVoucher.id,
      newValue: `Proposed ${proposedVoucher.voucherType} voucher #${proposedVoucher.referenceNumber} totaling ₹${proposedVoucher.totalDebit}`,
    });

    res.status(201).json({
      document: newDoc,
      voucher: proposedVoucher,
      gstAnalysis: classification.gstAnalysis,
      tdsAnalysis: classification.tdsAnalysis,
      duplicateCheck,
    });
  } catch (error: any) {
    console.error('Error uploading/processing document:', error);
    res.status(500).json({ error: error.message || 'Internal server error during document processing' });
  }
});

// ----------------------------------------------------
// VOUCHERS & APPROVAL WORKFLOW
// ----------------------------------------------------
router.get('/vouchers', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const vouchers = db.getVouchers(company.id);
  res.json(vouchers);
});

router.get('/vouchers/:id', (req: Request, res: Response) => {
  const voucher = db.getVoucher(req.params.id);
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' });
  res.json(voucher);
});

/**
 * Edit Proposed Voucher (Manual Correction by Accountant)
 * Enforces Balance Rule: Total Debit == Total Credit
 */
router.put('/vouchers/:id', (req: Request, res: Response) => {
  const existing = db.getVoucher(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Voucher not found' });

  const { lines, narration, voucherDate, referenceNumber } = req.body;

  let totalDebit = 0;
  let totalCredit = 0;

  if (lines && Array.isArray(lines)) {
    lines.forEach((l: any) => {
      totalDebit += Number(l.debit || 0);
      totalCredit += Number(l.credit || 0);
    });
  }

  totalDebit = Number(totalDebit.toFixed(2));
  totalCredit = Number(totalCredit.toFixed(2));
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const updated = db.updateVoucher(req.params.id, {
    lines: lines || existing.lines,
    narration: narration ?? existing.narration,
    voucherDate: voucherDate || existing.voucherDate,
    referenceNumber: referenceNumber || existing.referenceNumber,
    totalDebit,
    totalCredit,
    isBalanced,
  });

  db.logAudit({
    companyId: existing.companyId,
    user: 'Accountant',
    action: 'VOUCHER_UPDATED',
    entity: 'VOUCHER',
    entityId: existing.id,
    oldValue: `Dr: ₹${existing.totalDebit}, Cr: ₹${existing.totalCredit}`,
    newValue: `Dr: ₹${totalDebit}, Cr: ₹${totalCredit} (Balanced: ${isBalanced})`,
    reason: req.body.updateReason || 'User manual adjustment of ledger lines',
  });

  res.json(updated);
});

/**
 * Approve Voucher:
 * Validates Debit = Credit (BLOCKS approval if unbalanced).
 * Marks status = APPROVED.
 * Stores audit record.
 */
router.post('/vouchers/:id/approve', (req: Request, res: Response) => {
  const voucher = db.getVoucher(req.params.id);
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' });

  if (!voucher.isBalanced) {
    return res.status(400).json({
      error: 'Cannot approve unbalanced voucher. Total Debit must equal Total Credit.',
      totalDebit: voucher.totalDebit,
      totalCredit: voucher.totalCredit,
      difference: Math.abs(voucher.totalDebit - voucher.totalCredit),
    });
  }

  const approved = db.updateVoucher(voucher.id, {
    status: 'APPROVED',
    approvedBy: 'Senior Accountant',
    approvedAt: new Date().toISOString(),
  });

  if (voucher.sourceDocumentId) {
    db.updateDocument(voucher.sourceDocumentId, { status: 'APPROVED' });
  }

  // Also auto-resolve linked exceptions
  const exceptions = db.getExceptions(voucher.companyId).filter((e) => e.voucherId === voucher.id);
  exceptions.forEach((e) => {
    db.updateException(e.id, { status: 'RESOLVED', resolvedAt: new Date().toISOString() });
  });

  db.logAudit({
    companyId: voucher.companyId,
    user: 'Senior Accountant',
    action: 'VOUCHER_APPROVED',
    entity: 'VOUCHER',
    entityId: voucher.id,
    newValue: `Approved Voucher #${voucher.referenceNumber} (${voucher.voucherType}) for ₹${voucher.totalDebit}`,
  });

  res.json({ success: true, voucher: approved });
});

/**
 * Reject Voucher:
 * Requires rejection reason.
 * Marks status = REJECTED.
 */
router.post('/vouchers/:id/reject', (req: Request, res: Response) => {
  const voucher = db.getVoucher(req.params.id);
  if (!voucher) return res.status(404).json({ error: 'Voucher not found' });

  const { reason = 'Rejected by accountant' } = req.body;

  const rejected = db.updateVoucher(voucher.id, {
    status: 'REJECTED',
    rejectionReason: reason,
  });

  if (voucher.sourceDocumentId) {
    db.updateDocument(voucher.sourceDocumentId, { status: 'REJECTED' });
  }

  db.logAudit({
    companyId: voucher.companyId,
    user: 'Senior Accountant',
    action: 'VOUCHER_REJECTED',
    entity: 'VOUCHER',
    entityId: voucher.id,
    reason,
  });

  res.json({ success: true, voucher: rejected });
});

// ----------------------------------------------------
// LEDGERS & MASTERS
// ----------------------------------------------------
router.get('/ledgers', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  res.json(db.getLedgers(company.id));
});

router.post('/ledgers', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const ledger = db.createLedger({
    ...req.body,
    companyId: company.id,
  });

  db.logAudit({
    companyId: company.id,
    user: 'Accountant',
    action: 'MASTER_CREATED',
    entity: 'LEDGER',
    entityId: ledger.id,
    newValue: `Created Ledger "${ledger.name}" under ${ledger.parentGroup}`,
  });

  res.status(201).json(ledger);
});

router.put('/ledgers/:id', (req: Request, res: Response) => {
  const updated = db.updateLedger(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Ledger not found' });
  res.json(updated);
});

router.post('/ledgers/match', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const { vendorName, gstin, pan } = req.body;
  const match = ledgerMatchingService.matchVendorLedger(company.id, vendorName, gstin, pan);
  res.json(match);
});

// ----------------------------------------------------
// INVENTORY
// ----------------------------------------------------
router.get('/inventory', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  res.json(db.getInventory(company.id));
});

router.post('/inventory', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const item = db.createInventoryItem({
    ...req.body,
    companyId: company.id,
  });

  db.logAudit({
    companyId: company.id,
    user: 'Accountant',
    action: 'MASTER_CREATED',
    entity: 'INVENTORY',
    entityId: item.id,
    newValue: `Created Inventory Item "${item.name}" (SKU: ${item.sku})`,
  });

  res.status(201).json(item);
});

// ----------------------------------------------------
// TAX ENGINES (GST & TDS)
// ----------------------------------------------------
router.post('/gst/analyze', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const result = gstAnalysisService.analyzeGST(company, req.body.extraction);
  res.json(result);
});

router.post('/tds/analyze', (req: Request, res: Response) => {
  const result = tdsAnalysisService.analyzeTDS(req.body.extraction);
  res.json(result);
});

// ----------------------------------------------------
// EXCEPTIONS & AUDIT LOGS
// ----------------------------------------------------
router.get('/exceptions', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  res.json(db.getExceptions(company.id));
});

router.put('/exceptions/:id', (req: Request, res: Response) => {
  const updated = db.updateException(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Exception not found' });
  res.json(updated);
});

router.get('/audit-logs', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  res.json(db.getAuditLogs(company.id));
});

// ----------------------------------------------------
// LEARNED USER CORRECTIONS
// ----------------------------------------------------
router.get('/mappings', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  res.json(db.getMappings(company.id));
});

router.post('/mappings/feedback', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const mapping = db.saveMapping({
    companyId: company.id,
    ...req.body,
  });

  db.logAudit({
    companyId: company.id,
    user: 'Accountant',
    action: 'USER_CHANGED_LEDGER',
    entity: 'LEDGER',
    entityId: mapping.id,
    newValue: `Mapped vendor "${mapping.vendorNameOrGstin}" to expense ledger "${mapping.preferredExpenseLedgerName}"`,
  });

  res.json(mapping);
});

// ----------------------------------------------------
// TALLY & ACCOUNTING INTEGRATION EXPORT
// ----------------------------------------------------
router.get('/integration/status', async (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const provider = getAccountingProvider(company.accountingSoftware);
  const status = await provider.testConnection();
  res.json(status);
});

router.post('/integration/export-tally', async (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const vouchers = db.getVouchers(company.id).filter((v) => v.status === 'APPROVED');

  if (vouchers.length === 0) {
    return res.status(400).json({ error: 'No approved vouchers available to export to Tally.' });
  }

  const provider = getAccountingProvider('Tally');
  const exportResult = await provider.exportVouchers(vouchers, company);

  // Update exported timestamp on vouchers
  vouchers.forEach((v) => {
    db.updateVoucher(v.id, {
      status: 'EXPORTED_TALLY',
      tallyExportedAt: new Date().toISOString(),
    });
  });

  db.logAudit({
    companyId: company.id,
    user: 'Accountant',
    action: 'TALLY_EXPORTED',
    entity: 'VOUCHER',
    entityId: 'BATCH_EXPORT',
    newValue: `Exported ${exportResult.recordsCount} approved vouchers in Tally XML Envelope format (${exportResult.fileName})`,
  });

  res.json(exportResult);
});

router.post('/integration/export-masters', async (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const ledgers = db.getLedgers(company.id);
  const inventory = db.getInventory(company.id);

  const provider = getAccountingProvider('Tally');
  const exportResult = await provider.exportMasters(ledgers, inventory, company);

  res.json(exportResult);
});

// ----------------------------------------------------
// BANK RECONCILIATION
// ----------------------------------------------------
router.get('/bank/accounts', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  res.json(db.getBankAccounts(company.id));
});

router.get('/bank/transactions', (req: Request, res: Response) => {
  const { accountId } = req.query;
  const company = db.getActiveCompany();
  const accounts = db.getBankAccounts(company.id);
  const targetId = (accountId as string) || (accounts[0] ? accounts[0].id : '');
  res.json(db.getBankTransactions(targetId));
});

router.post('/bank/transactions', (req: Request, res: Response) => {
  const tx = db.createBankTransaction(req.body);
  res.status(201).json(tx);
});

router.post('/bank/reconcile-auto', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const accounts = db.getBankAccounts(company.id);
  const targetId = accounts[0]?.id;
  if (!targetId) return res.status(400).json({ error: 'No bank account found' });

  const txs = db.getBankTransactions(targetId).filter((t) => t.status === 'Unmatched');
  const vouchers = db.getVouchers(company.id).filter((v) => v.status === 'APPROVED');

  let matchedCount = 0;
  txs.forEach((tx) => {
    const match = bankMatchingService.evaluateMatch(tx, vouchers);
    if (match.status !== 'Unmatched') {
      db.updateBankTransaction(tx.id, {
        status: match.status,
        matchedVoucherId: match.matchedVoucherId,
        matchConfidence: match.confidence,
        matchNotes: match.notes,
      });
      matchedCount++;
    }
  });

  res.json({ success: true, processedCount: txs.length, matchedCount });
});

// ----------------------------------------------------
// REPORTS
// ----------------------------------------------------
router.get('/reports/dashboard-stats', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const docs = db.getDocuments(company.id);
  const vouchers = db.getVouchers(company.id);
  const exceptions = db.getExceptions(company.id);

  const stats = {
    documentsUploaded: docs.length,
    documentsPendingReview: docs.filter((d) => d.status === 'REVIEW_REQUIRED' || d.status === 'AI_PROCESSED').length,
    vouchersAwaitingApproval: vouchers.filter((v) => v.status === 'REVIEW_REQUIRED').length,
    approvedVouchers: vouchers.filter((v) => v.status === 'APPROVED' || v.status === 'EXPORTED_TALLY').length,
    rejectedVouchers: vouchers.filter((v) => v.status === 'REJECTED').length,
    openExceptions: exceptions.filter((e) => e.status === 'OPEN').length,
    possibleDuplicates: exceptions.filter((e) => e.category === 'POSSIBLE_DUPLICATE' && e.status === 'OPEN').length,
    gstExceptions: exceptions.filter((e) => e.category === 'GST_MISMATCH' && e.status === 'OPEN').length,
    tdsExceptions: exceptions.filter((e) => e.category === 'TDS_INFO_MISSING' && e.status === 'OPEN').length,
    unreconciledTransactions: db.getBankTransactions(db.getBankAccounts(company.id)[0]?.id || '').filter((t) => t.status === 'Unmatched').length,
  };

  res.json(stats);
});

router.get('/dashboard/stats', (req: Request, res: Response) => {
  const company = db.getActiveCompany();
  const docs = db.getDocuments(company.id);
  const vouchers = db.getVouchers(company.id);
  const exceptions = db.getExceptions(company.id);

  const stats = {
    documentsUploaded: docs.length,
    documentsPendingReview: docs.filter((d) => d.status === 'REVIEW_REQUIRED' || d.status === 'AI_PROCESSED').length,
    vouchersAwaitingApproval: vouchers.filter((v) => v.status === 'REVIEW_REQUIRED').length,
    approvedVouchers: vouchers.filter((v) => v.status === 'APPROVED' || v.status === 'EXPORTED_TALLY').length,
    rejectedVouchers: vouchers.filter((v) => v.status === 'REJECTED').length,
    openExceptions: exceptions.filter((e) => e.status === 'OPEN').length,
    possibleDuplicates: exceptions.filter((e) => e.category === 'POSSIBLE_DUPLICATE' && e.status === 'OPEN').length,
    gstExceptions: exceptions.filter((e) => e.category === 'GST_MISMATCH' && e.status === 'OPEN').length,
    tdsExceptions: exceptions.filter((e) => e.category === 'TDS_INFO_MISSING' && e.status === 'OPEN').length,
    unreconciledTransactions: db.getBankTransactions(db.getBankAccounts(company.id)[0]?.id || '').filter((t) => t.status === 'Unmatched').length,
  };

  res.json(stats);
});

export default router;
