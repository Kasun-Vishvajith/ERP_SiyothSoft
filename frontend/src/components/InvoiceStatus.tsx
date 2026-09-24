import type { InvoiceDocumentStatus, PaymentStatus } from "../types";

const documentLabels: Record<InvoiceDocumentStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  CANCELLED: "Cancelled",
};

const paymentLabels: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
};

export function DocumentStatusBadge({ status }: { status: InvoiceDocumentStatus }) {
  return <span className={`document-badge document-badge--${status.toLowerCase()}`}>{documentLabels[status]}</span>;
}

export function InvoiceStatusBadges({ documentStatus, paymentStatus }: { documentStatus: InvoiceDocumentStatus; paymentStatus: PaymentStatus }) {
  return <span className="status-stack"><DocumentStatusBadge status={documentStatus} />{documentStatus === "ISSUED" && <span className={`payment-badge payment-badge--${paymentStatus.toLowerCase()}`}>{paymentLabels[paymentStatus]}</span>}</span>;
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return paymentLabels[status];
}
