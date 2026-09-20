import { TDSAnalysisResult, DocumentExtraction, ExtractedLineItem } from '../../../src/types/accounting';

export interface TDSRule {
  sectionCode: string;
  name: string;
  categoryKeyword: RegExp;
  threshold: number;
  rates: {
    individualHuf: number;
    others: number;
    specific?: number;
  };
  description: string;
}

export const TDS_RULES_FY2024_2026: TDSRule[] = [
  {
    sectionCode: '194J',
    name: 'Fees for Professional or Technical Services',
    categoryKeyword: /consult|advisory|legal|audit|professional|advocate|architect|tech|software|developer|ca\b|cs\b|doctor|engineering/i,
    threshold: 30000,
    rates: {
      individualHuf: 10,
      others: 10,
      specific: 2, // 2% for pure technical services or call center operations
    },
    description: 'Sec 194J: Threshold ₹30,000 per financial year. 10% on professional fees, 2% on technical services / royalty.',
  },
  {
    sectionCode: '194C',
    name: 'Payment to Contractors and Sub-contractors',
    categoryKeyword: /contractor|freight|logistics|transport|maintenance|amc|housekeeping|security service|catering|fabrication|printing/i,
    threshold: 30000, // Single contract > 30k or aggregate > 1 lakh
    rates: {
      individualHuf: 1,
      others: 2,
    },
    description: 'Sec 194C: Threshold ₹30,000 (single contract) or ₹1,00,000 (annual aggregate). 1% for Ind/HUF, 2% for others.',
  },
  {
    sectionCode: '194I',
    name: 'Rent on Land, Building or Furniture',
    categoryKeyword: /rent|lease|office space|premises|godown|warehouse|tenancy/i,
    threshold: 240000,
    rates: {
      individualHuf: 10,
      others: 10,
      specific: 2, // 2% for plant/machinery/equipment
    },
    description: 'Sec 194I: Threshold ₹2,40,000 per financial year. 10% on land/building rent, 2% on plant/machinery.',
  },
  {
    sectionCode: '194H',
    name: 'Commission or Brokerage',
    categoryKeyword: /commission|brokerage|agency fee|incentive/i,
    threshold: 15000,
    rates: {
      individualHuf: 2, // Budget 2024 revised to 2%
      others: 2,
    },
    description: 'Sec 194H: Threshold ₹15,000 per financial year. Rate 2% (reduced from 5% w.e.f Oct 2024).',
  },
  {
    sectionCode: '194Q',
    name: 'Purchase of Goods exceeding ₹50 Lakhs',
    categoryKeyword: /raw material|component purchase|trading goods/i,
    threshold: 5000000,
    rates: {
      individualHuf: 0.1,
      others: 0.1,
    },
    description: 'Sec 194Q: Threshold ₹50,00,000 aggregate purchases. Rate 0.1% on amount exceeding threshold.',
  },
];

export class TDSAnalysisService {
  analyzeTDS(extraction: DocumentExtraction): TDSAnalysisResult {
    const taxableAmount = extraction.totals.subtotal.value || 0;
    const vendorName = extraction.supplier.name?.value || '';
    const vendorGstin = extraction.supplier.gstin?.value?.trim() || '';
    let vendorPan = extraction.supplier.pan?.value?.trim() || '';

    // Derive PAN from GSTIN if PAN is missing (characters 3-12 of 15-character GSTIN)
    if (!vendorPan && vendorGstin.length === 15) {
      vendorPan = vendorGstin.substring(2, 12);
    }

    const combinedText = (
      vendorName +
      ' ' +
      extraction.lineItems.map((l: ExtractedLineItem) => l.description.value).join(' ')
    ).toLowerCase();

    // Check PAN status
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
    const isPanValid = Boolean(vendorPan && panRegex.test(vendorPan));
    const panStatus = isPanValid ? 'Valid' : vendorPan ? 'Invalid' : 'Missing';

    // Identify vendor entity type from 4th character of PAN (e.g. 'C'=Company, 'P'=Individual, 'F'=Firm)
    let isIndividualOrHuf = false;
    if (isPanValid && vendorPan.length >= 4) {
      const entityChar = vendorPan.charAt(3).toUpperCase();
      isIndividualOrHuf = entityChar === 'P' || entityChar === 'H';
    }

    // Match candidate TDS rule
    let matchedRule: TDSRule | null = null;
    for (const rule of TDS_RULES_FY2024_2026) {
      if (rule.categoryKeyword.test(combinedText)) {
        matchedRule = rule;
        break;
      }
    }

    if (!matchedRule) {
      return {
        isApplicable: false,
        tdsAmount: 0,
        baseAmount: taxableAmount,
        panStatus,
        vendorPan,
        confidence: 0.85,
        reason: 'Nature of expense does not match typical withholding tax (TDS) schedules.',
        insufficientInfo: false,
        reviewRequired: false,
      };
    }

    // Evaluate Section 206AA Penal Rate if PAN is missing/invalid
    let penalRateApplied = false;
    let applicableRate = isIndividualOrHuf
      ? matchedRule.rates.individualHuf
      : matchedRule.rates.others;

    // Specific rate handling (e.g. 194J technical service 2%)
    if (matchedRule.sectionCode === '194J' && /tech|software|cloud|hosting|server/i.test(combinedText)) {
      applicableRate = 2; // 2% for pure IT/Technical services
    }

    if (!isPanValid) {
      penalRateApplied = true;
      applicableRate = 20; // Sec 206AA penal rate
    }

    // Check Threshold: Since single invoice may be below threshold, but cumulative FY invoices may cross it!
    const exceedsSingleInvoiceThreshold = taxableAmount >= matchedRule.threshold;

    // Check if cumulative information is missing
    if (!exceedsSingleInvoiceThreshold) {
      return {
        isApplicable: false,
        sectionCode: matchedRule.sectionCode,
        sectionDescription: matchedRule.name,
        thresholdAmount: matchedRule.threshold,
        applicableRate,
        tdsAmount: 0,
        baseAmount: taxableAmount,
        panStatus,
        vendorPan,
        confidence: 0.72,
        reason: `Current invoice amount (₹${taxableAmount.toLocaleString('en-IN')}) is below statutory threshold (₹${matchedRule.threshold.toLocaleString('en-IN')}) under ${matchedRule.sectionCode}.`,
        insufficientInfo: true,
        missingFields: [
          'Cumulative billing for this vendor in current Financial Year',
          'Vendor 197 Lower Deduction Certificate (if applicable)',
        ],
        reviewRequired: true,
      };
    }

    const calculatedTds = Math.round((taxableAmount * applicableRate) / 100);

    let reason = `Recommended TDS deduction under Section ${matchedRule.sectionCode} at ${applicableRate}% on taxable base ₹${taxableAmount.toLocaleString('en-IN')}.`;
    if (penalRateApplied) {
      reason += ' [CRITICAL: Vendor PAN is missing/invalid. Section 206AA requires maximum penal deduction rate of 20%]';
    }

    return {
      isApplicable: true,
      sectionCode: matchedRule.sectionCode,
      sectionDescription: matchedRule.name,
      thresholdAmount: matchedRule.threshold,
      applicableRate,
      tdsAmount: calculatedTds,
      baseAmount: taxableAmount,
      panStatus,
      vendorPan,
      confidence: penalRateApplied ? 0.78 : 0.92,
      reason,
      insufficientInfo: !isPanValid,
      missingFields: isPanValid ? [] : ['Valid 10-digit Vendor PAN'],
      reviewRequired: !isPanValid || penalRateApplied,
    };
  }
}

export const tdsAnalysisService = new TDSAnalysisService();
