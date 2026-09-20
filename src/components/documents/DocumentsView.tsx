import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  X,
  ExternalLink,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AccountingDocument, DocumentType } from '../../types/accounting';

interface DocumentsViewProps {
  documents: AccountingDocument[];
  selectedDocumentId?: string;
  onUploadDocument: (data: {
    fileName: string;
    mimeType?: string;
    fileBase64?: string;
    documentType?: DocumentType;
    rawText?: string;
  }) => Promise<any>;
  onSelectVoucher: (voucherId: string) => void;
  onRefresh: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  selectedDocumentId,
  onUploadDocument,
  onSelectVoucher,
}) => {
  const [activeDoc, setActiveDoc] = useState<AccountingDocument | null>(
    documents.find((d) => d.id === selectedDocumentId) || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [docType, setDocType] = useState<DocumentType>('Purchase invoice');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync if prop changes
  React.useEffect(() => {
    if (selectedDocumentId) {
      const found = documents.find((d) => d.id === selectedDocumentId);
      if (found) setActiveDoc(found);
    }
  }, [selectedDocumentId, documents]);

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadError(null);

      // Convert to Base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const result = await onUploadDocument({
            fileName: file.name,
            mimeType: file.type,
            fileBase64: base64,
            documentType: docType,
          });
          if (result?.document) {
            setActiveDoc(result.document);
          }
        } catch (err: any) {
          setUploadError(err.message || 'Upload failed');
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read local file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError(err.message || 'Upload error');
      setIsUploading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const getConfidenceBadge = (confidence?: number) => {
    const score = confidence !== undefined ? Math.round(confidence * 100) : 85;
    let color = 'bg-emerald-950 text-emerald-300 border-emerald-800';
    if (score < 70) color = 'bg-rose-950 text-rose-300 border-rose-800';
    else if (score < 90) color = 'bg-amber-950 text-amber-300 border-amber-800';

    return (
      <span
        className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold border ${color}`}
        title={`AI Extraction Confidence: ${score}%`}
      >
        {score}%
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Upload Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Document Upload & Extraction Engine
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Supports PDF, PNG, JPG, JPEG. Instant SHA-256 hash check, duplicate detection, and structured Indian tax extraction.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Document Type:</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Purchase invoice">Purchase invoice</option>
              <option value="Sales invoice">Sales invoice</option>
              <option value="Expense bill">Expense bill</option>
              <option value="Debit note">Debit note</option>
              <option value="Credit note">Credit note</option>
              <option value="Bank statement">Bank statement</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isUploading
              ? 'border-cyan-500 bg-cyan-950/20'
              : 'border-slate-700 hover:border-emerald-500 hover:bg-slate-800/40 bg-slate-950/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          {isUploading ? (
            <div className="space-y-2 py-3">
              <div className="w-8 h-8 mx-auto border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-cyan-300">
                AI Extracting Accounting Data & Tax Breakdown...
              </p>
              <p className="text-xs text-slate-400">
                Verifying GSTIN, parsing SAC/HSN codes, analyzing TDS thresholds, and generating balanced voucher.
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              <UploadCloud className="w-9 h-9 mx-auto text-slate-400" />
              <div className="text-sm font-semibold text-slate-200">
                Drag and drop your invoice here, or <span className="text-emerald-400 underline">browse files</span>
              </div>
              <p className="text-xs text-slate-400">
                Supports PDF, JPG, PNG up to 25MB. Real invoice data stays isolated in your private local session.
              </p>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="mt-3 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Main Split: Documents List vs Extracted Data Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Documents Table (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Uploaded Documents ({documents.length})
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">SHA-256 Protected</span>
          </div>

          {documents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
              <p className="text-xs">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {documents.map((d) => {
                const isSelected = activeDoc?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setActiveDoc(d)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 shadow-md'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-200 text-xs truncate max-w-[220px]">
                        {d.fileName}
                      </div>
                      <span className="font-mono font-bold text-xs text-emerald-400">
                        {formatCurrency(d.grossAmount)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                      <span className="truncate max-w-[180px]">{d.supplierName || 'Pending extraction'}</span>
                      <span className="font-mono text-[10px] text-slate-500">{d.invoiceNumber || '—'}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[10px]">
                      <span className="font-mono text-slate-500">{d.uploadDateTime.split('T')[0]}</span>
                      {d.duplicateOfId ? (
                        <span className="text-rose-400 flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3" /> Duplicate
                        </span>
                      ) : (
                        <span className="text-cyan-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Hash Verified
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Extraction Inspector (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5">
          {!activeDoc ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center text-slate-500">
              <FileCheck2 className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-300">Select a Document to Inspect AI Extraction</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                View supplier GSTIN verification, SAC/HSN codes, line items, and jump to the proposed accounting voucher.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Document Header Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{activeDoc.fileName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      ID: {activeDoc.id}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    SHA-256: {activeDoc.fileHash.substring(0, 24)}...
                  </div>
                </div>

                {activeDoc.voucherId && (
                  <button
                    onClick={() => onSelectVoucher(activeDoc.voucherId!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Inspect Proposed Voucher</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Duplicate Warning if flagged */}
              {activeDoc.duplicateReason && (
                <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    DUPLICATE DOCUMENT DETECTED
                  </div>
                  <div className="text-[11px] mt-1 text-rose-200">{activeDoc.duplicateReason}</div>
                </div>
              )}

              {/* Structured Extracted Data Card */}
              {activeDoc.extraction ? (
                <div className="space-y-4">
                  {/* Supplier & Invoice metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                        <span>Supplier Details</span>
                        {getConfidenceBadge(activeDoc.extraction.supplier.name.confidence)}
                      </div>
                      <div className="font-bold text-slate-200 text-sm">
                        {activeDoc.extraction.supplier.name.value}
                      </div>
                      <div className="text-slate-300 font-mono text-[11px] mt-0.5">
                        GSTIN: {activeDoc.extraction.supplier.gstin?.value || 'N/A'}
                      </div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        PAN: {activeDoc.extraction.supplier.pan?.value || 'N/A'} | State:{' '}
                        {activeDoc.extraction.supplier.state?.value || 'Unknown'} (
                        {activeDoc.extraction.supplier.stateCode?.value || '—'})
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                        <span>Invoice Metadata</span>
                        {getConfidenceBadge(activeDoc.extraction.invoice.invoiceNumber.confidence)}
                      </div>
                      <div className="font-bold text-slate-200">
                        Invoice #: {activeDoc.extraction.invoice.invoiceNumber.value}
                      </div>
                      <div className="text-slate-300 text-[11px] mt-0.5">
                        Date: {activeDoc.extraction.invoice.invoiceDate.value} | Due:{' '}
                        {activeDoc.extraction.invoice.dueDate?.value || 'Immediate'}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Place of Supply: {activeDoc.extraction.invoice.placeOfSupply?.value}
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                      <span>Extracted Line Items</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {activeDoc.extraction.lineItems.length} items parsed
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-slate-800 rounded-lg">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2 px-2.5">Description</th>
                            <th className="py-2 px-2.5">HSN/SAC</th>
                            <th className="py-2 px-2.5 text-right">Qty</th>
                            <th className="py-2 px-2.5 text-right">Rate</th>
                            <th className="py-2 px-2.5 text-right">Taxable</th>
                            <th className="py-2 px-2.5 text-center">GST%</th>
                            <th className="py-2 px-2.5 text-right">Tax</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                          {activeDoc.extraction.lineItems.map((li) => {
                            const tax = (li.cgst.value || 0) + (li.sgst.value || 0) + (li.igst.value || 0);
                            return (
                              <tr key={li.id} className="hover:bg-slate-800/40">
                                <td className="py-2 px-2.5 font-medium text-slate-200">
                                  {li.description.value}
                                </td>
                                <td className="py-2 px-2.5 font-mono text-slate-400 text-[11px]">
                                  {li.hsnSac?.value || '—'}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono text-slate-300">
                                  {li.quantity.value} {li.unit.value}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono text-slate-300">
                                  {formatCurrency(li.rate.value)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono text-slate-200 font-semibold">
                                  {formatCurrency(li.taxableValue.value)}
                                </td>
                                <td className="py-2 px-2.5 text-center font-mono text-slate-400">
                                  {li.gstRate.value}%
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono text-cyan-400">
                                  {formatCurrency(tax)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex justify-end">
                    <div className="w-64 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Taxable Subtotal:</span>
                        <span className="font-mono text-slate-200 font-medium">
                          {formatCurrency(activeDoc.extraction.totals.subtotal.value)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Total GST (CGST/SGST/IGST):</span>
                        <span className="font-mono text-cyan-400 font-medium">
                          {formatCurrency(activeDoc.extraction.totals.tax.value)}
                        </span>
                      </div>
                      {activeDoc.extraction.totals.roundOff?.value !== 0 && (
                        <div className="flex justify-between text-slate-400">
                          <span>Round Off:</span>
                          <span className="font-mono text-slate-400">
                            {formatCurrency(activeDoc.extraction.totals.roundOff?.value || 0)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold text-white">
                        <span>Grand Total:</span>
                        <span className="font-mono text-emerald-400">
                          {formatCurrency(activeDoc.extraction.totals.grandTotal.value)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Reasoning Notes */}
                  {activeDoc.extraction.aiNotes && activeDoc.extraction.aiNotes.length > 0 && (
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                      <div className="font-semibold text-cyan-400 flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Extraction & Tax Insights
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[11px]">
                        {activeDoc.extraction.aiNotes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500">
                  Extraction pending or failed.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
