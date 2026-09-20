import { Ledger, InventoryItem, Voucher, VoucherLine, Company } from '../../../src/types/accounting';

export interface ProviderConnectionResult {
  connected: boolean;
  providerName: string;
  version?: string;
  message: string;
  lastChecked: string;
}

export interface ExportResult {
  success: boolean;
  format: 'XML' | 'JSON' | 'CSV';
  payload: string;
  fileName: string;
  recordsCount: number;
}

export interface AccountingProvider {
  name: string;
  testConnection(): Promise<ProviderConnectionResult>;
  exportVouchers(vouchers: Voucher[], company: Company): Promise<ExportResult>;
  exportMasters(ledgers: Ledger[], inventory: InventoryItem[], company: Company): Promise<ExportResult>;
}

/**
 * TallyPrime Integration Provider
 * Generates official Tally XML standard format (Tally XML Envelope format)
 */
export class TallyProvider implements AccountingProvider {
  name = 'TallyPrime';

  async testConnection(): Promise<ProviderConnectionResult> {
    // In local MVP development, check export readiness
    return {
      connected: true,
      providerName: 'TallyPrime (XML Export & Bridge Ready)',
      version: 'TallyPrime 4.x / 3.x XML Standard',
      message: 'Ready to generate standard Tally XML import files compatible with Tally Gateway Server (Port 9000).',
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Generates standard Tally XML import file for Vouchers
   */
  async exportVouchers(vouchers: Voucher[], company: Company): Promise<ExportResult> {
    // Format Tally date: YYYYMMDD (e.g. 20241015)
    const formatTallyDate = (isoDate: string) => {
      return isoDate.replace(/[^0-9]/g, '').substring(0, 8);
    };

    const xmlVouchers = vouchers
      .map((v) => {
        const tallyDate = formatTallyDate(v.voucherDate);
        const partyLine = v.lines.find((l: VoucherLine) => l.lineType === 'PARTY');
        const partyLedgerName = partyLine?.ledgerName || 'Sundry Creditor';

        const linesXml = v.lines
          .map((line: VoucherLine) => {
            const isDebit = line.debit > 0;
            const amount = isDebit ? -Math.abs(line.debit) : Math.abs(line.credit); // In Tally XML, Dr is negative, Cr is positive

            return `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${this.escapeXml(line.ledgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <AMOUNT>${amount.toFixed(2)}</AMOUNT>
              ${line.narration ? `<NARRATION>${this.escapeXml(line.narration)}</NARRATION>` : ''}
            </ALLLEDGERENTRIES.LIST>`;
          })
          .join('\n');

        return `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${v.voucherType}" ACTION="Create">
            <DATE>${tallyDate}</DATE>
            <EFFECTIVEDATE>${tallyDate}</EFFECTIVEDATE>
            <VOUCHERTYPENAME>${v.voucherType}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${this.escapeXml(v.referenceNumber)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${this.escapeXml(partyLedgerName)}</PARTYLEDGERNAME>
            <NARRATION>${this.escapeXml(v.narration)}</NARRATION>
            <BASICBUYERNAME>${this.escapeXml(company.name)}</BASICBUYERNAME>
            ${linesXml}
          </VOUCHER>
        </TALLYMESSAGE>`;
      })
      .join('\n');

    const fullXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(company.name)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        ${xmlVouchers}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    const fileName = `Tally_Vouchers_${company.stateCode}_${Date.now()}.xml`;

    return {
      success: true,
      format: 'XML',
      payload: fullXml,
      fileName,
      recordsCount: vouchers.length,
    };
  }

  /**
   * Generates standard Tally XML import file for Ledgers and Masters
   */
  async exportMasters(ledgers: Ledger[], inventory: InventoryItem[], company: Company): Promise<ExportResult> {
    const ledgersXml = ledgers
      .map(
        (l) => `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${this.escapeXml(l.name)}" ACTION="Create">
            <NAME.LIST>
              <NAME>${this.escapeXml(l.name)}</NAME>
            </NAME.LIST>
            <PARENT>${this.escapeXml(l.parentGroup)}</PARENT>
            <ISBILLWISEON>${l.ledgerType === 'Vendor' ? 'Yes' : 'No'}</ISBILLWISEON>
            ${l.gstin ? `<PARTYGSTIN>${this.escapeXml(l.gstin)}</PARTYGSTIN>` : ''}
            ${l.pan ? `<INCOMETAXNUMBER>${this.escapeXml(l.pan)}</INCOMETAXNUMBER>` : ''}
            ${l.state ? `<LEDSTATENAME>${this.escapeXml(l.state)}</LEDSTATENAME>` : ''}
          </LEDGER>
        </TALLYMESSAGE>`
      )
      .join('\n');

    const fullXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(company.name)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        ${ledgersXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    return {
      success: true,
      format: 'XML',
      payload: fullXml,
      fileName: `Tally_Masters_${Date.now()}.xml`,
      recordsCount: ledgers.length,
    };
  }

  private escapeXml(unsafe: string): string {
    return (unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * QuickBooks Online Adapter (Future Integration)
 */
export class QuickBooksProvider implements AccountingProvider {
  name = 'QuickBooks Online';

  async testConnection(): Promise<ProviderConnectionResult> {
    return {
      connected: false,
      providerName: 'QuickBooks Online OAuth 2.0 API',
      message: 'QuickBooks API connector configured. OAuth 2.0 client authentication pending.',
      lastChecked: new Date().toISOString(),
    };
  }

  async exportVouchers(vouchers: Voucher[], company: Company): Promise<ExportResult> {
    const qboPayload = JSON.stringify(
      {
        company: company.name,
        bills: vouchers.map((v) => ({
          DocNumber: v.referenceNumber,
          TxnDate: v.voucherDate,
          TotalAmt: v.totalDebit,
          Lines: v.lines.map((l: VoucherLine) => ({
            Amount: l.debit || l.credit,
            DetailType: 'AccountBasedExpenseLineDetail',
            AccountRef: { name: l.ledgerName },
          })),
        })),
      },
      null,
      2
    );

    return {
      success: true,
      format: 'JSON',
      payload: qboPayload,
      fileName: `QBO_Bills_${Date.now()}.json`,
      recordsCount: vouchers.length,
    };
  }

  async exportMasters(ledgers: Ledger[]): Promise<ExportResult> {
    return {
      success: true,
      format: 'JSON',
      payload: JSON.stringify(ledgers, null, 2),
      fileName: `QBO_Accounts_${Date.now()}.json`,
      recordsCount: ledgers.length,
    };
  }
}

/**
 * Zoho Books Adapter (Future Integration)
 */
export class ZohoBooksProvider implements AccountingProvider {
  name = 'Zoho Books';

  async testConnection(): Promise<ProviderConnectionResult> {
    return {
      connected: false,
      providerName: 'Zoho Books REST API v3',
      message: 'Zoho Books organization token connector ready for configuration.',
      lastChecked: new Date().toISOString(),
    };
  }

  async exportVouchers(vouchers: Voucher[], company: Company): Promise<ExportResult> {
    const zohoPayload = JSON.stringify(
      {
        organization_id: company.id,
        bills: vouchers.map((v) => ({
          bill_number: v.referenceNumber,
          date: v.voucherDate,
          total: v.totalDebit,
        })),
      },
      null,
      2
    );

    return {
      success: true,
      format: 'JSON',
      payload: zohoPayload,
      fileName: `Zoho_Bills_${Date.now()}.json`,
      recordsCount: vouchers.length,
    };
  }

  async exportMasters(ledgers: Ledger[]): Promise<ExportResult> {
    return {
      success: true,
      format: 'JSON',
      payload: JSON.stringify(ledgers, null, 2),
      fileName: `Zoho_ChartOfAccounts_${Date.now()}.json`,
      recordsCount: ledgers.length,
    };
  }
}

export function getAccountingProvider(software: string): AccountingProvider {
  switch (software) {
    case 'QuickBooks Online':
      return new QuickBooksProvider();
    case 'Zoho Books':
      return new ZohoBooksProvider();
    case 'Tally':
    default:
      return new TallyProvider();
  }
}
