/**
 * Versioned AI Prompts for Indian Accounting & Tax Analysis
 */

export const PROMPT_VERSIONS = {
  DOCUMENT_EXTRACTION: 'v1.2-indian-gst-tds',
  ACCOUNTING_CLASSIFICATION: 'v1.1-voucher-engine',
  TAX_REASONING: 'v1.0-gst-itc-rcm',
};

export const DOCUMENT_EXTRACTION_SYSTEM_PROMPT = `
You are an expert Indian Chartered Accountant and Senior Tax Technology Specialist.
Your task is to extract accounting, GST, and TDS information from invoice, bill, debit/credit note images or text into structured JSON.

CRITICAL INSTRUCTIONS:
1. Every single field must include a confidence score (number between 0.00 and 1.00).
2. Look for Indian tax artifacts:
   - GSTIN (15 characters: 2 digit state code + 10 char PAN + 1 entity num + 'Z' + checksum)
   - PAN (10 characters: 5 letters + 4 digits + 1 letter, e.g. AABCS1429B)
   - State & 2-digit State Code (e.g. 27 for Maharashtra, 29 for Karnataka, 07 for Delhi, 33 for Tamil Nadu, 06 for Haryana, 24 for Gujarat, 19 for West Bengal)
   - HSN code (4, 6 or 8 digits for goods) or SAC code (99xxxx for services)
   - CGST, SGST, IGST breakdown
   - Place of Supply
3. For Line Items:
   - Extract Description, SKU/Item Code, HSN/SAC, Quantity, Unit (NOS, PCS, KGS, HRS, MONTHS), Unit Rate, Discount, Taxable Value, GST Rate (%), CGST, SGST, IGST.
4. For Totals:
   - Subtotal (taxable amount)
   - Total Tax (CGST + SGST + IGST)
   - TDS if explicitly shown or mentioned
   - Round off (+/- amount)
   - Grand Total
5. If a field is missing, absent, or blurry, provide value: null or empty string and confidence <= 0.40.
6. Output pure JSON matching the specified schema with NO markdown wrapping, no introductory text, no conversational text.
`;

export const EXTRACTION_SCHEMA_JSON = `{
  "supplier": {
    "name": { "value": "string", "confidence": 0.95 },
    "gstin": { "value": "string", "confidence": 0.98 },
    "pan": { "value": "string", "confidence": 0.95 },
    "address": { "value": "string", "confidence": 0.90 },
    "state": { "value": "string", "confidence": 0.92 },
    "stateCode": { "value": "string", "confidence": 0.92 }
  },
  "customer": {
    "name": { "value": "string", "confidence": 0.90 },
    "gstin": { "value": "string", "confidence": 0.90 },
    "address": { "value": "string", "confidence": 0.85 },
    "state": { "value": "string", "confidence": 0.85 }
  },
  "invoice": {
    "invoiceNumber": { "value": "string", "confidence": 0.95 },
    "invoiceDate": { "value": "YYYY-MM-DD", "confidence": 0.95 },
    "dueDate": { "value": "YYYY-MM-DD", "confidence": 0.85 },
    "poNumber": { "value": "string", "confidence": 0.80 },
    "placeOfSupply": { "value": "string", "confidence": 0.90 }
  },
  "lineItems": [
    {
      "id": "item_1",
      "description": { "value": "string", "confidence": 0.95 },
      "sku": { "value": "string", "confidence": 0.80 },
      "hsnSac": { "value": "string", "confidence": 0.90 },
      "quantity": { "value": 1, "confidence": 0.95 },
      "unit": { "value": "NOS", "confidence": 0.90 },
      "rate": { "value": 1000, "confidence": 0.95 },
      "discount": { "value": 0, "confidence": 0.95 },
      "taxableValue": { "value": 1000, "confidence": 0.95 },
      "gstRate": { "value": 18, "confidence": 0.95 },
      "cgst": { "value": 90, "confidence": 0.95 },
      "sgst": { "value": 90, "confidence": 0.95 },
      "igst": { "value": 0, "confidence": 0.95 }
    }
  ],
  "totals": {
    "subtotal": { "value": 1000, "confidence": 0.95 },
    "tax": { "value": 180, "confidence": 0.95 },
    "tdsIfShown": { "value": 0, "confidence": 0.90 },
    "roundOff": { "value": 0, "confidence": 0.95 },
    "grandTotal": { "value": 1180, "confidence": 0.98 }
  },
  "aiNotes": ["Identified 18% GST intra-state supply"]
}`;
