export type ViewName = "home" | "inventory" | "products" | "invoices" | "payments" | "purchases" | "customers" | "suppliers";

export type Product = { id: number; name: string; price: string; stockCount: number };
export type ProductInput = { name: string; price: string; stockCount: number };
export type PageResult<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type Customer = { id: number; name: string; email: string | null; phone: string | null };
export type CustomerInput = { name: string; email: string; phone: string };
export type Supplier = { id: number; name: string; email: string | null; phone: string | null };
export type SupplierInput = { name: string; email: string; phone: string };
export type PurchaseItem = { id: number; productId: number; productName: string; quantity: number; unitPrice: string; lineTotal: string };
export type Purchase = { id: number; number: string; date: string; supplierId: number; supplierName: string; notes: string; items: PurchaseItem[]; total: string; amountPaid: string; balance: string; paymentStatus: PaymentStatus };
export type PurchaseSummary = Omit<Purchase, "notes" | "items">;
export type PurchaseDraftItem = { key: string; productId: number | ""; quantity: string; unitPrice: string };

export type PaymentStatus = "PAID" | "PARTIALLY_PAID" | "UNPAID";
export type InvoiceDocumentStatus = "DRAFT" | "ISSUED" | "CANCELLED";
export type PaymentMethod = "CASH" | "BANK_TRANSFER";

export type InvoiceItem = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type Invoice = {
  id: number;
  number: string;
  date: string;
  customerId: number;
  customerName: string;
  notes: string;
  items: InvoiceItem[];
  total: string;
  amountPaid: string;
  balance: string;
  paymentStatus: PaymentStatus;
  documentStatus: InvoiceDocumentStatus;
};
export type InvoiceSummary = Omit<Invoice, "notes" | "items">;

export type InvoiceDraftItem = {
  key: string;
  productId: number | "";
  quantity: string;
};

export type InvoiceDraft = {
  customerId: number | "";
  date: string;
  notes: string;
  items: InvoiceDraftItem[];
  documentStatus: InvoiceDocumentStatus;
};

export type Payment = {
  id: number;
  requestId: string;
  invoiceId: number | null;
  purchaseId: number | null;
  invoiceNumber: string;
  amount: string;
  method: PaymentMethod;
  paidOn: string;
  reference: string;
};

export type PaymentResponse = {
  id: number;
  requestId: string;
  invoiceId: number | null;
  purchaseId: number | null;
  amount: string;
  method: PaymentMethod;
  paidOn: string;
  reference: string | null;
};

export type PaymentDraft = {
  invoiceId: number | "";
  purchaseId: number | "";
  amount: string;
  method: PaymentMethod;
  paidOn: string;
  reference: string;
};
