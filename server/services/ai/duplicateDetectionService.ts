import { db } from '../../db/database';
import { AccountingDocument, DocumentExtraction } from '../../../src/types/accounting';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number;
  duplicateOfDocId?: string;
  matchedFields: string[];
  reasons: string[];
}

export class DuplicateDetectionService {
  checkDuplicate(
    companyId: string,
    fileHash: string,
    extraction: DocumentExtraction,
    currentDocId?: string
  ): DuplicateCheckResult {
    const existingDocs = db.getDocuments(companyId).filter((d) => d.id !== currentDocId);
    const matchedFields: string[] = [];
    const reasons: string[] = [];

    // 1. Exact File Content Hash Match (SHA-256)
    const exactHashMatch = existingDocs.find((d) => d.fileHash === fileHash);
    if (exactHashMatch) {
      matchedFields.push('fileHash');
      reasons.push(`Exact binary duplicate of existing document ID: ${exactHashMatch.id} (${exactHashMatch.fileName})`);
      return {
        isDuplicate: true,
        confidence: 0.99,
        duplicateOfDocId: exactHashMatch.id,
        matchedFields,
        reasons,
      };
    }

    const newInvNum = extraction.invoice.invoiceNumber?.value?.trim().toLowerCase();
    const newGstin = extraction.supplier.gstin?.value?.trim().toLowerCase();
    const newGross = extraction.totals.grandTotal?.value || 0;
    const newDate = extraction.invoice.invoiceDate?.value;

    for (const doc of existingDocs) {
      const docInvNum = doc.invoiceNumber?.trim().toLowerCase();
      const docGstin = doc.supplierGstin?.trim().toLowerCase();
      const docGross = doc.grossAmount || 0;
      const docDate = doc.invoiceDate;

      const invMatches = newInvNum && docInvNum && newInvNum === docInvNum;
      const gstinMatches = newGstin && docGstin && newGstin === docGstin;
      const amountMatches = Math.abs(newGross - docGross) < 1.0;
      const dateMatches = newDate && docDate && newDate === docDate;

      // Strongest duplicate: Same GSTIN + Same Invoice Number
      if (invMatches && gstinMatches) {
        matchedFields.push('invoiceNumber', 'supplierGstin');
        if (amountMatches) matchedFields.push('grossAmount');
        if (dateMatches) matchedFields.push('invoiceDate');

        reasons.push(
          `Document #${doc.invoiceNumber} from GSTIN ${doc.supplierGstin} was already uploaded as Doc ID ${doc.id} on ${doc.uploadDateTime.split('T')[0]}`
        );

        return {
          isDuplicate: true,
          confidence: 0.97,
          duplicateOfDocId: doc.id,
          matchedFields,
          reasons,
        };
      }

      // Fuzzy duplicate: Same Invoice Number + Exact Same Gross Amount
      if (invMatches && amountMatches) {
        matchedFields.push('invoiceNumber', 'grossAmount');
        reasons.push(
          `Identical invoice number "${doc.invoiceNumber}" and exact gross amount (₹${docGross}) matches existing Doc ID ${doc.id}`
        );

        return {
          isDuplicate: true,
          confidence: 0.88,
          duplicateOfDocId: doc.id,
          matchedFields,
          reasons,
        };
      }
    }

    return {
      isDuplicate: false,
      confidence: 0.95,
      matchedFields: [],
      reasons: ['No duplicate document hash or invoice attributes found.'],
    };
  }
}

export const duplicateDetectionService = new DuplicateDetectionService();
