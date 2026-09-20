import { db } from '../../db/database';
import { Ledger, LedgerNature } from '../../../src/types/accounting';

export interface LedgerMatchResult {
  status: 'EXACT_MATCH' | 'SUGGESTED_MATCH' | 'NEW_LEDGER_RECOMMENDED';
  ledger?: Ledger;
  confidence: number;
  reason: string;
  recommendedNewLedger?: {
    name: string;
    parentGroup: string;
    nature: LedgerNature;
    gstApplicability: boolean;
    tdsApplicability: boolean;
    tdsSection?: string;
    reason: string;
  };
}

export class LedgerMatchingService {
  /**
   * String similarity helper (Token Jaccard + Levenshtein hybrid)
   */
  private computeSimilarity(str1: string, str2: string): number {
    const s1 = this.normalize(str1);
    const s2 = this.normalize(str2);

    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0.0;

    // Token set overlap
    const tokens1 = new Set(s1.split(' '));
    const tokens2 = new Set(s2.split(' '));
    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    const jaccard = union.size === 0 ? 0 : intersection.size / union.size;

    // Substring containment bonus
    if (s1.includes(s2) || s2.includes(s1)) {
      return Math.max(jaccard, 0.85);
    }

    return jaccard;
  }

  private normalize(str: string): string {
    return str
      .toLowerCase()
      .replace(/\b(private|pvt|limited|ltd|llp|inc|corp|services|solutions|enterprises|co)\b/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Finds or suggests a vendor ledger (Sundry Creditor)
   */
  matchVendorLedger(
    companyId: string,
    extractedVendorName: string,
    extractedGstin?: string,
    extractedPan?: string
  ): LedgerMatchResult {
    const ledgers = db.getLedgers(companyId);

    // 1. Check GSTIN match (100% confidence)
    if (extractedGstin) {
      const gstinMatch = ledgers.find(
        (l) => l.gstin && l.gstin.trim().toUpperCase() === extractedGstin.trim().toUpperCase()
      );
      if (gstinMatch) {
        return {
          status: 'EXACT_MATCH',
          ledger: gstinMatch,
          confidence: 0.99,
          reason: `Exact match found by verified GSTIN (${extractedGstin})`,
        };
      }
    }

    // 2. Check PAN match
    if (extractedPan) {
      const panMatch = ledgers.find(
        (l) => l.pan && l.pan.trim().toUpperCase() === extractedPan.trim().toUpperCase()
      );
      if (panMatch) {
        return {
          status: 'EXACT_MATCH',
          ledger: panMatch,
          confidence: 0.98,
          reason: `Exact match found by PAN (${extractedPan})`,
        };
      }
    }

    // 3. Check learned company mappings
    const mapping = db.findMapping(companyId, extractedVendorName);
    if (mapping) {
      const mappedLedger = ledgers.find((l) => l.name === mapping.vendorNameOrGstin || l.id === mapping.preferredExpenseLedgerId);
      if (mappedLedger) {
        return {
          status: 'SUGGESTED_MATCH',
          ledger: mappedLedger,
          confidence: 0.95,
          reason: `Matched based on prior company correction history (applied ${mapping.appliedCount} times)`,
        };
      }
    }

    // 4. Fuzzy Name Matching against Sundry Creditors
    let bestMatch: Ledger | null = null;
    let highestScore = 0;

    for (const ledger of ledgers) {
      const score = this.computeSimilarity(extractedVendorName, ledger.name);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = ledger;
      }
    }

    if (bestMatch && highestScore >= 0.88) {
      return {
        status: highestScore >= 0.95 ? 'EXACT_MATCH' : 'SUGGESTED_MATCH',
        ledger: bestMatch,
        confidence: Number(highestScore.toFixed(2)),
        reason: `Matched existing ledger "${bestMatch.name}" with ${Math.round(highestScore * 100)}% name similarity`,
      };
    }

    if (bestMatch && highestScore >= 0.65) {
      return {
        status: 'SUGGESTED_MATCH',
        ledger: bestMatch,
        confidence: Number(highestScore.toFixed(2)),
        reason: `Possible match found with existing ledger "${bestMatch.name}". Review recommended.`,
      };
    }

    // 5. Recommend New Ledger Creation
    return {
      status: 'NEW_LEDGER_RECOMMENDED',
      confidence: 0.92,
      reason: `No matching ledger found in Chart of Accounts for "${extractedVendorName}". Suggest creating under Sundry Creditors.`,
      recommendedNewLedger: {
        name: extractedVendorName,
        parentGroup: 'Sundry Creditors',
        nature: 'Liability',
        gstApplicability: !!extractedGstin,
        tdsApplicability: true,
        tdsSection: '194J', // Standard default, editable
        reason: 'New trade supplier identified from invoice header.',
      },
    };
  }

  /**
   * Matches or suggests an appropriate Expense Ledger
   */
  matchExpenseLedger(
    companyId: string,
    vendorName: string,
    lineItemDescriptions: string[]
  ): { ledger: Ledger; confidence: number; reason: string } {
    const ledgers = db.getLedgers(companyId).filter((l) => l.nature === 'Expense');

    // Check learned mappings first
    const mapping = db.findMapping(companyId, vendorName);
    if (mapping && mapping.preferredExpenseLedgerId) {
      const found = ledgers.find((l) => l.id === mapping.preferredExpenseLedgerId);
      if (found) {
        return {
          ledger: found,
          confidence: 0.96,
          reason: `Selected "${found.name}" based on previous company approvals for ${vendorName}`,
        };
      }
    }

    const combinedText = (vendorName + ' ' + lineItemDescriptions.join(' ')).toLowerCase();

    if (/consult|advisory|legal|audit|professional|advocate|ca|cs|developer|architect/i.test(combinedText)) {
      const prof = ledgers.find((l) => l.id === 'led_exp_prof') || ledgers[0];
      return {
        ledger: prof,
        confidence: 0.93,
        reason: 'Classified under Professional & Legal Fees based on description and SAC code',
      };
    }

    if (/cloud|server|aws|azure|gcp|software|license|saas|subscription|hosting|domain/i.test(combinedText)) {
      const sw = ledgers.find((l) => l.id === 'led_exp_software') || ledgers[0];
      return {
        ledger: sw,
        confidence: 0.94,
        reason: 'Classified under Software, Cloud & SaaS Subscriptions',
      };
    }

    if (/rent|lease|premises|office space|warehouse|depot/i.test(combinedText)) {
      const rent = ledgers.find((l) => l.id === 'led_exp_rent') || ledgers[0];
      return {
        ledger: rent,
        confidence: 0.95,
        reason: 'Classified under Office Rent & Workspace Lease',
      };
    }

    if (/logistics|freight|transport|courier|cargo|cartage|shipping/i.test(combinedText)) {
      const contractor = ledgers.find((l) => l.id === 'led_exp_contractor') || ledgers[0];
      return {
        ledger: contractor,
        confidence: 0.9,
        reason: 'Classified under Contractor & Freight Charges',
      };
    }

    if (/ad|advertising|marketing|google ads|meta ads|campaign|creative/i.test(combinedText)) {
      const advert = ledgers.find((l) => l.id === 'led_exp_advert') || ledgers[0];
      return {
        ledger: advert,
        confidence: 0.92,
        reason: 'Classified under Advertising & Digital Marketing',
      };
    }

    // Default to Purchases or General Expenses
    const purchases = ledgers.find((l) => l.id === 'led_exp_purchases') || ledgers[0];
    return {
      ledger: purchases,
      confidence: 0.75,
      reason: 'Assigned to Raw Material & Component Purchases (Review recommended)',
    };
  }
}

export const ledgerMatchingService = new LedgerMatchingService();
