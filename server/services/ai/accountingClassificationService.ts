import crypto from 'crypto';
import { db } from '../../db/database';
import {
  Company,
  DocumentExtraction,
  ExtractedLineItem,
  Voucher,
  VoucherLine,
  VoucherType,
  GSTAnalysisResult,
  TDSAnalysisResult,
} from '../../../src/types/accounting';
import { ledgerMatchingService } from './ledgerMatchingService';
import { inventoryMatchingService } from './inventoryMatchingService';
import { gstAnalysisService } from './gstAnalysisService';
import { tdsAnalysisService } from './tdsAnalysisService';

export class AccountingClassificationService {
  classifyAndGenerateVoucher(params: {
    company: Company;
    extraction: DocumentExtraction;
    sourceDocumentId: string;
    overrideTdsDeduction?: boolean; // User choice if missing info
  }): {
    voucher: Omit<Voucher, 'id' | 'createdAt' | 'updatedAt'>;
    gstAnalysis: GSTAnalysisResult;
    tdsAnalysis: TDSAnalysisResult;
    exceptionsToCreate: Array<{
      category: any;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      title: string;
      description: string;
      suggestedAction: string;
    }>;
  } {
    const { company, extraction, sourceDocumentId } = params;
    const exceptionsToCreate: any[] = [];

    // 1. Run Tax Analyses
    const gstAnalysis = gstAnalysisService.analyzeGST(company, extraction);
    const tdsAnalysis = tdsAnalysisService.analyzeTDS(extraction);

    // 2. Match Vendor Ledger
    const vendorName = extraction.supplier.name.value || 'Unidentified Supplier';
    const vendorGstin = extraction.supplier.gstin?.value;
    const vendorPan = extraction.supplier.pan?.value;

    const vendorMatch = ledgerMatchingService.matchVendorLedger(
      company.id,
      vendorName,
      vendorGstin,
      vendorPan
    );

    let vendorLedger = vendorMatch.ledger;
    if (!vendorLedger && vendorMatch.recommendedNewLedger) {
      // Auto-register candidate vendor ledger so voucher lines can reference it
      vendorLedger = db.createLedger({
        companyId: company.id,
        name: vendorMatch.recommendedNewLedger.name,
        parentGroup: vendorMatch.recommendedNewLedger.parentGroup,
        ledgerType: 'Vendor',
        nature: vendorMatch.recommendedNewLedger.nature,
        gstApplicability: vendorMatch.recommendedNewLedger.gstApplicability,
        gstin: vendorGstin,
        pan: vendorPan,
        state: extraction.supplier.state?.value || company.state,
        tdsApplicability: vendorMatch.recommendedNewLedger.tdsApplicability,
        tdsSection: vendorMatch.recommendedNewLedger.tdsSection,
        active: true,
      });

      exceptionsToCreate.push({
        category: 'UNKNOWN_LEDGER',
        severity: 'MEDIUM',
        title: `New Vendor Ledger Created: ${vendorLedger.name}`,
        description: `No existing ledger matched "${vendorName}". Recommended under Sundry Creditors.`,
        suggestedAction: 'Review vendor master details, GSTIN, and credit terms.',
      });
    }

    // 3. Match Expense / Primary Ledger
    const lineItemDescriptions = extraction.lineItems.map((l: ExtractedLineItem) => l.description.value);
    const expenseMatch = ledgerMatchingService.matchExpenseLedger(
      company.id,
      vendorName,
      lineItemDescriptions
    );

    // Check inventory match if items present
    const inventoryLines: { itemMatch?: any; line: any }[] = [];
    extraction.lineItems.forEach((li: ExtractedLineItem) => {
      const invMatch = inventoryMatchingService.matchLineItem(company.id, li);
      if (invMatch.isNewRecommended) {
        exceptionsToCreate.push({
          category: 'UNKNOWN_INVENTORY',
          severity: 'LOW',
          title: `New Inventory Item Suggested: ${li.description.value}`,
          description: invMatch.reason,
          suggestedAction: 'Verify SKU and HSN code in Inventory Master.',
        });
      }
      inventoryLines.push({ itemMatch: invMatch, line: li });
    });

    // 4. Determine GST Input Tax Ledgers
    const ledgers = db.getLedgers(company.id);
    const cgstLedger = ledgers.find((l) => l.id === 'led_tax_cgst_in') || ledgers.find((l) => l.name.includes('Input CGST'));
    const sgstLedger = ledgers.find((l) => l.id === 'led_tax_sgst_in') || ledgers.find((l) => l.name.includes('Input SGST'));
    const igstLedger = ledgers.find((l) => l.id === 'led_tax_igst_in') || ledgers.find((l) => l.name.includes('Input IGST'));

    // 5. Determine TDS Ledger
    let tdsLedger = undefined;
    if (tdsAnalysis.isApplicable && tdsAnalysis.tdsAmount > 0) {
      if (tdsAnalysis.sectionCode === '194J') {
        tdsLedger = ledgers.find((l) => l.id === 'led_tax_tds_194j') || ledgers.find((l) => l.name.includes('194J'));
      } else if (tdsAnalysis.sectionCode === '194C') {
        tdsLedger = ledgers.find((l) => l.id === 'led_tax_tds_194c') || ledgers.find((l) => l.name.includes('194C'));
      } else if (tdsAnalysis.sectionCode === '194I') {
        tdsLedger = ledgers.find((l) => l.id === 'led_tax_tds_194i') || ledgers.find((l) => l.name.includes('194I'));
      } else {
        tdsLedger = ledgers.find((l) => l.name.includes('TDS Payable'));
      }
    }

    // 6. Build Double-Entry Accounting Lines
    const lines: VoucherLine[] = [];
    const taxableTotal = gstAnalysis.taxableValue || extraction.totals.subtotal.value || 0;
    const cgstAmount = gstAnalysis.cgstAmount || 0;
    const sgstAmount = gstAnalysis.sgstAmount || 0;
    const igstAmount = gstAnalysis.igstAmount || 0;
    const totalGst = cgstAmount + sgstAmount + igstAmount;
    const grandTotal = extraction.totals.grandTotal.value || taxableTotal + totalGst;
    const tdsDeduction = tdsAnalysis.isApplicable ? tdsAnalysis.tdsAmount : 0;
    const netPayableToVendor = grandTotal - tdsDeduction;

    // Line 1: Expense / Purchases Account (Debit)
    lines.push({
      id: `line_${crypto.randomUUID().slice(0, 8)}`,
      ledgerId: expenseMatch.ledger.id,
      ledgerName: expenseMatch.ledger.name,
      ledgerNature: expenseMatch.ledger.nature,
      debit: Number(taxableTotal.toFixed(2)),
      credit: 0,
      narration: `Taxable invoice value for ${vendorName} [Inv: ${extraction.invoice.invoiceNumber.value}]`,
      lineType: 'EXPENSE',
    });

    // Line 2 & 3: Input Taxes (Debit)
    if (gstAnalysis.isInterState) {
      if (igstAmount > 0 && igstLedger) {
        lines.push({
          id: `line_${crypto.randomUUID().slice(0, 8)}`,
          ledgerId: igstLedger.id,
          ledgerName: igstLedger.name,
          ledgerNature: 'Asset',
          debit: Number(igstAmount.toFixed(2)),
          credit: 0,
          narration: `Input IGST @ ${gstAnalysis.gstRate}% (Inter-state supply from ${gstAnalysis.supplierState})`,
          lineType: 'TAX_GST',
        });
      }
    } else {
      if (cgstAmount > 0 && cgstLedger) {
        lines.push({
          id: `line_${crypto.randomUUID().slice(0, 8)}`,
          ledgerId: cgstLedger.id,
          ledgerName: cgstLedger.name,
          ledgerNature: 'Asset',
          debit: Number(cgstAmount.toFixed(2)),
          credit: 0,
          narration: `Input CGST @ ${gstAnalysis.gstRate / 2}% (Intra-state Maharashtra)`,
          lineType: 'TAX_GST',
        });
      }
      if (sgstAmount > 0 && sgstLedger) {
        lines.push({
          id: `line_${crypto.randomUUID().slice(0, 8)}`,
          ledgerId: sgstLedger.id,
          ledgerName: sgstLedger.name,
          ledgerNature: 'Asset',
          debit: Number(sgstAmount.toFixed(2)),
          credit: 0,
          narration: `Input SGST @ ${gstAnalysis.gstRate / 2}% (Intra-state Maharashtra)`,
          lineType: 'TAX_GST',
        });
      }
    }

    // Line 4: TDS Payable (Credit) if applicable
    if (tdsDeduction > 0 && tdsLedger) {
      lines.push({
        id: `line_${crypto.randomUUID().slice(0, 8)}`,
        ledgerId: tdsLedger.id,
        ledgerName: tdsLedger.name,
        ledgerNature: 'Liability',
        debit: 0,
        credit: Number(tdsDeduction.toFixed(2)),
        narration: `TDS withheld u/s ${tdsAnalysis.sectionCode} @ ${tdsAnalysis.applicableRate}% on ₹${tdsAnalysis.baseAmount}`,
        lineType: 'TAX_TDS',
      });
    }

    // Line 5: Vendor Payable (Credit)
    if (vendorLedger) {
      lines.push({
        id: `line_${crypto.randomUUID().slice(0, 8)}`,
        ledgerId: vendorLedger.id,
        ledgerName: vendorLedger.name,
        ledgerNature: 'Liability',
        debit: 0,
        credit: Number(netPayableToVendor.toFixed(2)),
        narration: `Net payable to ${vendorLedger.name} against Inv #${extraction.invoice.invoiceNumber.value} dated ${extraction.invoice.invoiceDate.value}`,
        lineType: 'PARTY',
      });
    }

    // Validation & Round-off handling
    let totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    let totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
    const diff = Number((totalDebit - totalCredit).toFixed(2));

    if (Math.abs(diff) > 0.001 && Math.abs(diff) <= 2.0) {
      // Small rounding difference (standard in Indian billing)
      const roundOffLedger = ledgers.find((l) => l.id === 'led_round_off') || ledgers[0];
      if (diff > 0) {
        // Debits exceed credits, add credit round off
        lines.push({
          id: `line_${crypto.randomUUID().slice(0, 8)}`,
          ledgerId: roundOffLedger.id,
          ledgerName: roundOffLedger.name,
          debit: 0,
          credit: Math.abs(diff),
          narration: 'Invoice round-off adjustment',
          lineType: 'ROUND_OFF',
        });
      } else {
        // Credits exceed debits, add debit round off
        lines.push({
          id: `line_${crypto.randomUUID().slice(0, 8)}`,
          ledgerId: roundOffLedger.id,
          ledgerName: roundOffLedger.name,
          debit: Math.abs(diff),
          credit: 0,
          narration: 'Invoice round-off adjustment',
          lineType: 'ROUND_OFF',
        });
      }
      totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
    }

    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    if (!isBalanced) {
      exceptionsToCreate.push({
        category: 'DEBIT_CREDIT_IMBALANCE',
        severity: 'CRITICAL',
        title: 'Debit and Credit Imbalance Detected',
        description: `Total Debit (₹${totalDebit.toFixed(2)}) does not match Total Credit (₹${totalCredit.toFixed(2)}). Difference: ₹${(totalDebit - totalCredit).toFixed(2)}`,
        suggestedAction: 'Edit ledger line amounts to ensure mathematical balance before approval.',
      });
    }

    if (gstAnalysis.reviewRequired) {
      exceptionsToCreate.push({
        category: 'GST_MISMATCH',
        severity: 'HIGH',
        title: 'GST Treatment Review Required',
        description: gstAnalysis.reason,
        suggestedAction: 'Verify place of supply and invoice tax breakdown.',
      });
    }

    if (tdsAnalysis.insufficientInfo || tdsAnalysis.reviewRequired) {
      exceptionsToCreate.push({
        category: 'TDS_INFO_MISSING',
        severity: tdsAnalysis.panStatus === 'Missing' ? 'HIGH' : 'MEDIUM',
        title: 'TDS Applicability Clarification Needed',
        description: tdsAnalysis.reason,
        suggestedAction: tdsAnalysis.missingFields?.join(', ') || 'Confirm cumulative FY billing.',
      });
    }

    const voucher: Omit<Voucher, 'id' | 'createdAt' | 'updatedAt'> = {
      companyId: company.id,
      sourceDocumentId,
      voucherType: 'Purchase' as VoucherType,
      voucherDate: extraction.invoice.invoiceDate.value || new Date().toISOString().split('T')[0],
      referenceNumber: extraction.invoice.invoiceNumber.value || 'REF-AUTO',
      narration: `Being purchase from ${vendorName} vide invoice #${extraction.invoice.invoiceNumber.value} dated ${extraction.invoice.invoiceDate.value}. GST: ${gstAnalysis.treatment}, TDS: ${tdsAnalysis.isApplicable ? tdsAnalysis.sectionCode : 'None'}.`,
      lines,
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      isBalanced,
      aiConfidence: {
        vendorIdentification: vendorMatch.confidence,
        ledgerClassification: expenseMatch.confidence,
        gstTreatment: gstAnalysis.confidence,
        tdsClassification: tdsAnalysis.confidence,
        overall: Number(
          (
            (vendorMatch.confidence +
              expenseMatch.confidence +
              gstAnalysis.confidence +
              tdsAnalysis.confidence) /
            4
          ).toFixed(2)
        ),
      },
      gstAnalysis,
      tdsAnalysis,
      status: 'REVIEW_REQUIRED',
      createdBy: 'AI Copilot Engine',
    };

    return {
      voucher,
      gstAnalysis,
      tdsAnalysis,
      exceptionsToCreate,
    };
  }
}

export const accountingClassificationService = new AccountingClassificationService();
