import { useState } from "react";
import { DocumentStatusBadge, InvoiceStatusBadges } from "./InvoiceStatus";
import { formatMoney } from "../utils";
import { shareInvoice } from "../invoiceExport";
import type { Invoice } from "../types";

type InvoiceDocumentProps = {
  invoice: Invoice;
  onBack: () => void;
  onEdit: () => void;
  onRecordPayment: () => void;
  onCancel: () => void;
};

export function InvoiceDocument({ invoice, onBack, onEdit, onRecordPayment, onCancel }: InvoiceDocumentProps) {
  const locked = Number(invoice.amountPaid) > 0 || invoice.documentStatus === "CANCELLED";
  const payable = invoice.documentStatus === "ISSUED" && invoice.paymentStatus !== "PAID";
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);
  const [shareMessage, setShareMessage] = useState("");

  async function exportDocument(format: "pdf" | "png") {
    setExporting(format);
    setShareMessage("");
    try {
      const result = await shareInvoice(invoice, format);
      setShareMessage(result === "shared" ? "Invoice shared." : `Invoice ${format.toUpperCase()} downloaded. You can attach it to WhatsApp or email.`);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareMessage(error instanceof Error ? error.message : "Could not prepare the invoice file.");
    } finally {
      setExporting(null);
    }
  }

  return <section className="invoice-detail-page">
    <div className="document-toolbar"><button className="button button--text" type="button" onClick={onBack}>← Invoices</button><InvoiceStatusBadges documentStatus={invoice.documentStatus} paymentStatus={invoice.paymentStatus} /><div className="document-toolbar__actions">{payable && <button className="button button--primary" type="button" onClick={onRecordPayment}>Record payment</button>}<button className="button button--secondary" type="button" disabled={exporting !== null} onClick={() => void exportDocument("pdf")}>{exporting === "pdf" ? "Preparing…" : "Share PDF"}</button><button className="button button--secondary" type="button" disabled={exporting !== null} onClick={() => void exportDocument("png")}>{exporting === "png" ? "Preparing…" : "Share image"}</button><details className="more-actions"><summary aria-label="More invoice actions">•••</summary><div>{!locked && <button type="button" onClick={onEdit}>Edit invoice</button>}<button type="button" onClick={() => window.print()}>Print invoice</button>{(invoice.documentStatus === "DRAFT" || (invoice.documentStatus === "ISSUED" && invoice.paymentStatus === "UNPAID")) && <button className="danger-text" type="button" onClick={onCancel}>{invoice.documentStatus === "DRAFT" ? "Cancel draft" : "Cancel invoice"}</button>}</div></details></div></div>
    {shareMessage && <div className="alert alert--success" role="status">{shareMessage}</div>}
    <p className="share-hint">On mobile, Share PDF or Share image opens your share sheet so you can choose WhatsApp, Email, or another app.</p>
    <article className="invoice-paper"><header className="invoice-paper__header"><div><strong className="invoice-brand">SiyothSoft</strong><span>ERP workspace</span></div><div className="invoice-paper__identity"><strong>INVOICE</strong><span>{invoice.number}</span><span>{invoice.date}</span></div></header><section className="invoice-paper__customer"><span className="eyebrow">Bill to</span><strong>{invoice.customerName}</strong></section><div className="invoice-paper__status"><DocumentStatusBadge status={invoice.documentStatus} />{invoice.documentStatus === "DRAFT" && <span>Draft — not issued.</span>}{invoice.documentStatus === "CANCELLED" && <span>Cancelled — not payable.</span>}</div><div className="invoice-items"><div className="invoice-items__head"><span>Item</span><span>Qty</span><span>Unit price</span><span>Amount</span></div>{invoice.items.map((item) => <div className="invoice-item" key={item.id}><span>{item.productName}</span><span>{item.quantity}</span><span>LKR {formatMoney(item.unitPrice)}</span><strong>LKR {formatMoney(item.lineTotal)}</strong></div>)}</div><div className="invoice-paper__totals"><div><span>Invoice total</span><strong>LKR {formatMoney(invoice.total)}</strong></div><div><span>Amount paid</span><strong>{invoice.documentStatus === "ISSUED" ? `LKR ${formatMoney(invoice.amountPaid)}` : "Not applicable"}</strong></div><div><span>Balance due</span><strong>{invoice.documentStatus === "ISSUED" ? `LKR ${formatMoney(invoice.balance)}` : "Not applicable"}</strong></div></div>{invoice.notes && <section className="invoice-paper__notes"><span className="eyebrow">Notes</span><p>{invoice.notes}</p></section>}</article>
  </section>;
}
