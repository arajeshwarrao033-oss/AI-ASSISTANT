import { BankTransaction, Voucher, VoucherLine } from '../../../src/types/accounting';

export interface BankMatchEvaluation {
  status: 'Matched' | 'Suggested Match' | 'Unmatched';
  matchedVoucherId?: string;
  confidence: number;
  notes: string;
}

export class BankMatchingService {
  /**
   * Matches bank statement transactions against approved accounting vouchers
   */
  evaluateMatch(transaction: BankTransaction, vouchers: Voucher[]): BankMatchEvaluation {
    const txAmount = transaction.amount;
    const txDate = new Date(transaction.date).getTime();
    const txDesc = transaction.description.toLowerCase();
    const txRef = transaction.referenceNumber?.toLowerCase();

    let bestVoucher: Voucher | null = null;
    let highestScore = 0;
    let matchNotes = '';

    for (const v of vouchers) {
      let score = 0;

      // 1. Amount matching
      // If transaction is DEBIT (money went out), voucher total should match net payable or vendor line
      const vendorLine = v.lines.find((l: VoucherLine) => l.lineType === 'PARTY');
      const targetAmount = vendorLine ? vendorLine.credit : v.totalCredit;

      if (Math.abs(targetAmount - txAmount) < 0.5) {
        score += 0.55;
      } else if (Math.abs(v.totalDebit - txAmount) < 0.5) {
        score += 0.45;
      } else {
        continue; // Amount mismatch is fatal for bank matching
      }

      // 2. Reference / Cheque / UTR number matching
      if (txRef && v.referenceNumber && (txRef.includes(v.referenceNumber.toLowerCase()) || v.referenceNumber.toLowerCase().includes(txRef))) {
        score += 0.35;
      }

      // 3. Date proximity (within 10 days of invoice date)
      const vDate = new Date(v.voucherDate).getTime();
      const dayDiff = Math.abs(txDate - vDate) / (1000 * 60 * 60 * 24);
      if (dayDiff <= 3) {
        score += 0.15;
      } else if (dayDiff <= 15) {
        score += 0.08;
      }

      // 4. Narration / Vendor name token match
      if (vendorLine && txDesc.includes(vendorLine.ledgerName.toLowerCase().split(' ')[0])) {
        score += 0.15;
      }

      if (score > highestScore) {
        highestScore = score;
        bestVoucher = v;
        matchNotes = `Matched against Voucher #${v.referenceNumber} (${v.voucherDate}) - Amount ₹${targetAmount}`;
      }
    }

    if (bestVoucher && highestScore >= 0.85) {
      return {
        status: 'Matched',
        matchedVoucherId: bestVoucher.id,
        confidence: Number(highestScore.toFixed(2)),
        notes: `High confidence auto-match: ${matchNotes}`,
      };
    }

    if (bestVoucher && highestScore >= 0.5) {
      return {
        status: 'Suggested Match',
        matchedVoucherId: bestVoucher.id,
        confidence: Number(highestScore.toFixed(2)),
        notes: `Suggested match (review required): ${matchNotes}`,
      };
    }

    return {
      status: 'Unmatched',
      confidence: 0.1,
      notes: 'No corresponding book transaction found with matching amount or reference.',
    };
  }
}

export const bankMatchingService = new BankMatchingService();
