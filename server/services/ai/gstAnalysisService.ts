import { Company, GSTAnalysisResult, DocumentExtraction, ExtractedLineItem } from '../../../src/types/accounting';

export const INDIAN_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '18': 'Assam',
  '19': 'West Bengal',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

export class GSTAnalysisService {
  analyzeGST(company: Company, extraction: DocumentExtraction): GSTAnalysisResult {
    const supplierGstin = extraction.supplier.gstin?.value?.trim() || '';
    const companyGstin = company.gstin.trim();
    const companyStateCode = company.stateCode || companyGstin.substring(0, 2);

    let supplierStateCode = '';
    if (supplierGstin.length >= 2) {
      supplierStateCode = supplierGstin.substring(0, 2);
    } else if (extraction.supplier.stateCode?.value) {
      supplierStateCode = extraction.supplier.stateCode.value;
    }

    const supplierState =
      INDIAN_STATE_CODES[supplierStateCode] ||
      extraction.supplier.state?.value ||
      'Unknown State';

    const isInterState =
      Boolean(supplierStateCode) &&
      Boolean(companyStateCode) &&
      supplierStateCode !== companyStateCode;

    // Line items aggregation
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    const hsnCodes: string[] = [];

    extraction.lineItems.forEach((line: ExtractedLineItem) => {
      totalTaxable += line.taxableValue.value || 0;
      totalCgst += line.cgst.value || 0;
      totalSgst += line.sgst.value || 0;
      totalIgst += line.igst.value || 0;
      if (line.hsnSac?.value) {
        hsnCodes.push(line.hsnSac.value);
      }
    });

    if (totalTaxable === 0 && extraction.totals.subtotal.value > 0) {
      totalTaxable = extraction.totals.subtotal.value;
    }

    const effectiveTax = totalCgst + totalSgst + totalIgst || extraction.totals.tax.value;
    const computedGstRate = totalTaxable > 0 ? Math.round((effectiveTax / totalTaxable) * 100) : 18;

    // Check Reverse Charge Mechanism (RCM)
    // Common RCM triggers: Goods Transport Agency (GTA) SAC 9965, Legal/Advocate fees SAC 9982, Sponsorship SAC 9983
    let isRcm = false;
    let rcmReason = '';
    const combinedDesc = extraction.lineItems.map((l: ExtractedLineItem) => l.description.value).join(' ').toLowerCase();

    if (hsnCodes.some((h) => h.startsWith('9965')) || /gta|transport agency|freight mover/i.test(combinedDesc)) {
      isRcm = true;
      rcmReason = 'GTA transport services may be subject to RCM under Sec 9(3) if consignment note issued without forward charge.';
    } else if (hsnCodes.some((h) => h.startsWith('9982')) || /advocate|legal counsel|arbitrator/i.test(combinedDesc)) {
      isRcm = true;
      rcmReason = 'Legal services by an individual advocate / firm of advocates fall under RCM u/s 9(3).';
    }

    // Check ITC Eligibility (Section 17(5) Blocked Credit rules)
    let itcEligibility: GSTAnalysisResult['itcEligibility'] = 'Eligible';
    let itcReason = 'Input tax credit is eligible for ordinary course of business.';

    if (/motor vehicle|car purchase|passenger vehicle|insurance.*vehicle/i.test(combinedDesc)) {
      itcEligibility = 'Potentially_Ineligible';
      itcReason = 'ITC blocked under Section 17(5)(a) for motor vehicles for transportation of persons (capacity <= 13 seats).';
    } else if (/food|beverage|catering|restaurant|outdoor catering/i.test(combinedDesc)) {
      itcEligibility = 'Potentially_Ineligible';
      itcReason = 'ITC blocked under Section 17(5)(b)(i) on food and beverages, outdoor catering, except when used as outward supply.';
    } else if (/membership|club|gym|fitness/i.test(combinedDesc)) {
      itcEligibility = 'Potentially_Ineligible';
      itcReason = 'ITC blocked under Section 17(5)(b)(ii) on membership of a club, health, and fitness centre.';
    } else if (/gift|sample|personal consumption|free sample/i.test(combinedDesc)) {
      itcEligibility = 'Potentially_Ineligible';
      itcReason = 'ITC blocked under Section 17(5)(h) on goods lost, stolen, destroyed, written off or disposed of by way of gift or free samples.';
    }

    // GST Treatment determination
    let treatment: GSTAnalysisResult['treatment'] = 'CGST_SGST';
    let treatmentReason = '';
    let confidence = 0.95;
    let reviewRequired = false;

    if (isRcm) {
      treatment = 'Reverse_Charge';
      treatmentReason = rcmReason;
      confidence = 0.88;
      reviewRequired = true;
    } else if (computedGstRate === 0) {
      treatment = 'Nil_Rated';
      treatmentReason = 'Zero/Nil GST rate detected on line items.';
      confidence = 0.9;
    } else if (isInterState) {
      treatment = 'IGST';
      treatmentReason = `Inter-state supply: Supplier state is ${supplierState} (${supplierStateCode}) and Recipient state is ${company.state} (${companyStateCode}). IGST applicable.`;
      // Check if document had CGST/SGST charged incorrectly by out-of-state vendor
      if (totalCgst > 0 || totalSgst > 0) {
        treatmentReason += ' [WARNING: Document shows CGST/SGST but supply is Inter-State. Supplier may have billed incorrectly]';
        reviewRequired = true;
        confidence = 0.78;
      }
    } else {
      treatment = 'CGST_SGST';
      treatmentReason = `Intra-state supply: Both Supplier and Recipient are located in ${company.state} (${companyStateCode}). Central GST (CGST) + State GST (SGST) applicable.`;
      if (totalIgst > 0) {
        treatmentReason += ' [WARNING: Document shows IGST but supply is Intra-State.]';
        reviewRequired = true;
        confidence = 0.78;
      }
    }

    if (!supplierGstin) {
      reviewRequired = true;
      confidence = 0.65;
      treatmentReason += ' [NOTE: Missing Supplier GSTIN. Treat as unregistered vendor or verify invoice]';
    }

    return {
      treatment,
      gstRate: computedGstRate,
      taxableValue: totalTaxable,
      cgstAmount: isInterState ? 0 : totalTaxable * (computedGstRate / 200),
      sgstAmount: isInterState ? 0 : totalTaxable * (computedGstRate / 200),
      igstAmount: isInterState ? totalTaxable * (computedGstRate / 100) : 0,
      supplierGstin,
      supplierState,
      companyState: company.state,
      placeOfSupply: extraction.invoice.placeOfSupply?.value || `${company.state} (${companyStateCode})`,
      isInterState,
      isRcmApplicable: isRcm,
      itcEligibility,
      confidence,
      reason: `${treatmentReason}. ${itcReason}`,
      reviewRequired,
      hsnSacCodes: Array.from(new Set(hsnCodes)),
    };
  }
}

export const gstAnalysisService = new GSTAnalysisService();
