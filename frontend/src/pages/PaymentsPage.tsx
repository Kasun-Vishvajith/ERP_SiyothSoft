import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState } from "../components/EmptyState";
import { LookupPager } from "../components/LookupPager";
import { request } from "../api";
import { formatMoney } from "../utils";
import type { Invoice, InvoiceSummary, PageResult, Payment, PaymentDraft, PaymentResponse, Purchase, PurchaseSummary } from "../types";

type PaymentKind = "invoice" | "purchase";
type PaymentTarget = { kind: PaymentKind; id: number };

type PaymentsPageProps = {
  invoices: Invoice[];
  purchases: Purchase[];
  payments: Payment[];
  initialTarget?: PaymentTarget;
  onSavePayment: (payment: Payment) => void;
};

const lookupPageSize = 10;
const historyPageSize = 10;

function requestKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `request-${Date.now()}`;
}

export function PaymentsPage({ invoices, purchases, payments, initialTarget, onSavePayment }: PaymentsPageProps) {
  const [invoiceOptions, setInvoiceOptions] = useState<Invoice[]>([]);
  const [purchaseOptions, setPurchaseOptions] = useState<Purchase[]>([]);
  const [invoicePage, setInvoicePage] = useState(0);
  const [purchasePage, setPurchasePage] = useState(0);
  const [invoiceTotalPages, setInvoiceTotalPages] = useState(0);
  const [purchaseTotalPages, setPurchaseTotalPages] = useState(0);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [lookupReload, setLookupReload] = useState(0);
  const initialKind = initialTarget?.kind ?? "invoice";
  const initialId = initialTarget?.id ?? "";
  const [paymentKind, setPaymentKind] = useState<PaymentKind>(initialKind);
  const [selectedParentId, setSelectedParentId] = useState<number | "">(initialId);
  const [draft, setDraft] = useState<PaymentDraft>({
    invoiceId: initialKind === "invoice" ? initialId : "",
    purchaseId: initialKind === "purchase" ? initialId : "",
    amount: "",
    method: "BANK_TRANSFER",
    paidOn: new Date().toISOString().slice(0, 10),
    reference: "",
  });
  const [requestId, setRequestId] = useState(requestKey);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [submittedPayment, setSubmittedPayment] = useState<Payment | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<Payment[]>(payments);
  const [historyError, setHistoryError] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyTotalElements, setHistoryTotalElements] = useState(0);

  const payableInvoices = useMemo(() => mergeInvoices(invoiceOptions, invoices), [invoiceOptions, invoices]);
  const payablePurchases = useMemo(() => mergePurchases(purchaseOptions, purchases), [purchaseOptions, purchases]);
  const parentOptions = paymentKind === "invoice" ? payableInvoices : payablePurchases;
  const selectedParent = parentOptions.find((parent) => parent.id === selectedParentId);

  useEffect(() => {
    if (!initialTarget) return;
    setPaymentKind(initialTarget.kind);
    setSelectedParentId(initialTarget.id);
    setDraft((current) => ({
      ...current,
      invoiceId: initialTarget.kind === "invoice" ? initialTarget.id : "",
      purchaseId: initialTarget.kind === "purchase" ? initialTarget.id : "",
      amount: "",
    }));
    setRequestId(requestKey());
  }, [initialTarget]);

  useEffect(() => {
    if (selectedParentId !== "" || !parentOptions[0]) return;
    setSelectedParentId(parentOptions[0].id);
    setDraft((current) => ({
      ...current,
      invoiceId: paymentKind === "invoice" ? parentOptions[0].id : "",
      purchaseId: paymentKind === "purchase" ? parentOptions[0].id : "",
    }));
  }, [parentOptions, paymentKind, selectedParentId]);

  useEffect(() => {
    const controller = new AbortController();
    setLookupLoading(true);
    request<PageResult<InvoiceSummary>>(`/invoices?page=${invoicePage}&size=${lookupPageSize}&status=UNPAID&documentStatus=ISSUED`, { signal: controller.signal })
      .then((result) => {
        setInvoiceOptions(result.content.map(toInvoice));
        setInvoiceTotalPages(result.totalPages);
        setLookupError("");
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setLookupError(caught instanceof Error ? caught.message : "Could not load unpaid invoices");
      })
      .finally(() => { if (!controller.signal.aborted) setLookupLoading(false); });
    return () => controller.abort();
  }, [invoicePage, lookupReload]);

  useEffect(() => {
    const controller = new AbortController();
    setLookupLoading(true);
    request<PageResult<PurchaseSummary>>(`/purchases?page=${purchasePage}&size=${lookupPageSize}&status=UNPAID`, { signal: controller.signal })
      .then((result) => {
        setPurchaseOptions(result.content.map(toPurchase));
        setPurchaseTotalPages(result.totalPages);
        setLookupError("");
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setLookupError(caught instanceof Error ? caught.message : "Could not load unpaid purchases");
      })
      .finally(() => { if (!controller.signal.aborted) setLookupLoading(false); });
    return () => controller.abort();
  }, [purchasePage, lookupReload]);

  useEffect(() => {
    const controller = new AbortController();
    request<PageResult<PaymentResponse>>(`/payments?page=${historyPage}&size=${historyPageSize}`, { signal: controller.signal })
      .then((result) => {
        setHistory(result.content.map((payment) => toPayment(payment, [...invoices, ...invoiceOptions], [...purchases, ...purchaseOptions])));
        setHistoryTotalPages(result.totalPages);
        setHistoryTotalElements(result.totalElements);
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setHistoryError(caught instanceof Error ? caught.message : "Could not load payment history");
      })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [historyPage, invoices, purchases, invoiceOptions, purchaseOptions]);

  function selectKind(value: PaymentKind) {
    const nextOptions = value === "invoice" ? payableInvoices : payablePurchases;
    const nextId = nextOptions[0]?.id ?? "";
    setPaymentKind(value);
    setSelectedParentId(nextId);
    setDraft((current) => ({ ...current, invoiceId: value === "invoice" ? nextId : "", purchaseId: value === "purchase" ? nextId : "", amount: "" }));
    setRequestId(requestKey());
    setErrors([]);
    setSubmittedPayment(null);
  }

  function selectParent(value: string) {
    const nextId = value ? Number(value) : "";
    setSelectedParentId(nextId);
    setDraft((current) => ({ ...current, invoiceId: paymentKind === "invoice" ? nextId : "", purchaseId: paymentKind === "purchase" ? nextId : "", amount: "" }));
    setRequestId(requestKey());
    setErrors([]);
    setSubmittedPayment(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: string[] = [];
    const amount = Number(draft.amount);
    if (!selectedParent) nextErrors.push(`Choose an unpaid ${paymentKind}.`);
    if (!draft.paidOn) nextErrors.push("Choose the payment date.");
    if (!Number.isFinite(amount) || amount <= 0) nextErrors.push("Payment amount must be greater than zero.");
    if (selectedParent && amount > Number(selectedParent.balance)) nextErrors.push(`Payment cannot exceed the outstanding balance of LKR ${formatMoney(selectedParent.balance)}.`);
    setErrors(nextErrors);
    if (nextErrors.length || saving || !selectedParent || selectedParentId === "") return;

    setSaving(true);
    // Keep requestId stable until this intended payment succeeds, so a retry is safe.
    request<PaymentResponse>("/payments", {
      method: "POST",
      body: JSON.stringify({
        requestId,
        invoiceId: paymentKind === "invoice" ? selectedParentId : null,
        purchaseId: paymentKind === "purchase" ? selectedParentId : null,
        amount: amount.toFixed(2),
        method: draft.method,
        paidOn: draft.paidOn,
        reference: draft.reference.trim(),
      }),
    }).then((result) => {
      const payment = toPayment(result, [...invoices, ...invoiceOptions], [...purchases, ...purchaseOptions]);
      onSavePayment(payment);
      setHistory((current) => [payment, ...current]);
      setHistoryPage(0);
      setLookupReload((value) => value + 1);
      setSubmittedPayment(payment);
      setSelectedParentId("");
      setDraft((current) => ({ ...current, invoiceId: "", purchaseId: "", amount: "", reference: "" }));
      setRequestId(requestKey());
    }).catch((caught: unknown) => {
      setErrors([caught instanceof Error ? caught.message : "Could not record payment"]);
    }).finally(() => setSaving(false));
  }

  if (historyLoading) {
    return <section className="page-section" aria-busy="true" aria-label="Loading payments"><div className="skeleton-toolbar" /><div className="skeleton-panel"><span className="skeleton-row" /><span className="skeleton-row" /></div></section>;
  }

  const lookupPage = paymentKind === "invoice" ? invoicePage : purchasePage;
  const lookupTotalPages = paymentKind === "invoice" ? invoiceTotalPages : purchaseTotalPages;
  const lookupPageChange = paymentKind === "invoice" ? setInvoicePage : setPurchasePage;
  const kindLabel = paymentKind === "invoice" ? "invoice" : "purchase";

  return (
    <section className="page-section payments-page">
      {submittedPayment && <div className="alert alert--success" role="status"><strong>Payment recorded.</strong> {submittedPayment.invoiceNumber} now has a refreshed balance.</div>}
      <div className="payment-layout">
        <div className="form-card payment-form-card">
          <div className="section-heading"><div><span className="eyebrow">Manual payment</span><h2>Record a payment</h2></div><span className="mint-icon" aria-hidden="true">✓</span></div>
          <p className="form-help">Record money received from a customer or paid to a supplier.</p>
          {errors.length > 0 && <div className="alert alert--error" role="alert"><strong>Payment could not be recorded</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
          {lookupError && <div className="alert alert--error" role="alert">{lookupError}</div>}
          <form onSubmit={submit} noValidate>
            <label className="field" htmlFor="payment-kind"><span>Payment for <em>*</em></span><select id="payment-kind" value={paymentKind} onChange={(event) => selectKind(event.target.value as PaymentKind)}><option value="invoice">Sales invoice</option><option value="purchase">Purchase</option></select></label>
            <label className="field" htmlFor="payment-parent"><span>{paymentKind === "invoice" ? "Invoice" : "Purchase"} <em>*</em></span><select id="payment-parent" value={selectedParentId} onChange={(event) => selectParent(event.target.value)} disabled={lookupLoading}><option value="">{lookupLoading ? `Loading unpaid ${kindLabel}s…` : `Select an unpaid ${kindLabel}`}</option>{parentOptions.map((parent) => <option key={parent.id} value={parent.id}>{parent.number} · {paymentKind === "invoice" ? (parent as Invoice).customerName : (parent as Purchase).supplierName} · LKR {formatMoney(parent.balance)} due</option>)}</select></label>
            <LookupPager label={paymentKind === "invoice" ? "Invoice" : "Purchase"} page={lookupPage} totalPages={lookupTotalPages} disabled={lookupLoading} onPageChange={lookupPageChange} />
            {selectedParent && <div className="balance-card"><div><span>Document total</span><strong>LKR {formatMoney(selectedParent.total)}</strong></div><div><span>Paid so far</span><strong>LKR {formatMoney(selectedParent.amountPaid)}</strong></div><div className="balance-card__due"><span>Outstanding</span><strong>LKR {formatMoney(selectedParent.balance)}</strong></div></div>}
            <div className="field-grid"><label className="field" htmlFor="payment-amount"><span className="field-label-row"><span>Amount <em>*</em></span>{selectedParent && Number(selectedParent.balance) > 0 && <button className="fill-balance-button" type="button" onClick={() => setDraft((current) => ({ ...current, amount: Number(selectedParent.balance).toFixed(2) }))}>Pay full amount</button>}</span><div className="input-with-prefix"><span>LKR</span><input id="payment-amount" type="number" min="0.01" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} placeholder="0.00" /></div></label><label className="field" htmlFor="payment-date"><span>Paid on <em>*</em></span><input id="payment-date" type="date" value={draft.paidOn} onChange={(event) => setDraft({ ...draft, paidOn: event.target.value })} /></label></div>
            <label className="field" htmlFor="payment-method"><span>Method <em>*</em></span><select id="payment-method" value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value as PaymentDraft["method"] })}><option value="BANK_TRANSFER">Bank transfer</option><option value="CASH">Cash</option></select></label>
            <label className="field" htmlFor="payment-reference"><span>Reference <small>Optional</small></span><input id="payment-reference" type="text" maxLength={200} value={draft.reference} onChange={(event) => setDraft({ ...draft, reference: event.target.value })} placeholder="Receipt or transfer reference" /></label>
            <div className="payment-form-footer"><button className="button button--primary" type="submit" disabled={saving || !selectedParent}>{saving ? "Recording…" : "Record payment"}</button></div>
          </form>
        </div>

        <div className="payment-history">
          <div className="section-heading"><div><span className="eyebrow">History</span><h2>Recent payments</h2></div><span className="history-count">{historyTotalElements} records</span></div>
          {historyError && <div className="alert alert--error" role="alert">{historyError}</div>}
          {!history.length ? <EmptyState title="No payments yet" message="Record an offline payment to start the history." /> : <><div className="table-panel table-scroll"><table className="data-table"><caption className="sr-only">Payment history</caption><thead><tr><th>Document</th><th>Date</th><th>Method</th><th>Amount</th></tr></thead><tbody>{history.map((payment) => <tr key={payment.id}><td><strong>{payment.invoiceNumber}</strong><span className="table-subline">{payment.reference || "No reference"}</span></td><td>{payment.paidOn}</td><td>{payment.method === "BANK_TRANSFER" ? "Bank transfer" : "Cash"}</td><td className="money">LKR {formatMoney(payment.amount)}</td></tr>)}</tbody></table></div><div className="record-cards">{history.map((payment) => <article className="record-card" key={payment.id}><div className="record-card__topline"><strong>{payment.invoiceNumber}</strong><span className="status-badge status-badge--paid">Recorded</span></div><p className="record-card__customer">{payment.purchaseId ? "Purchase payment" : "Invoice payment"}</p><div className="record-card__meta"><span>{payment.paidOn}</span><span>{payment.reference || "No reference"}</span></div><div className="record-card__amounts"><div><span>Amount</span><strong>LKR {formatMoney(payment.amount)}</strong></div></div></article>)}</div><div className="pagination" aria-label="Payment history pagination"><span>Page {historyPage + 1} of {historyTotalPages}</span><div className="pagination__buttons"><button className="button button--secondary" type="button" disabled={historyPage === 0} onClick={() => setHistoryPage((value) => value - 1)}>Previous</button><button className="button button--secondary" type="button" disabled={historyPage + 1 >= historyTotalPages} onClick={() => setHistoryPage((value) => value + 1)}>Next</button></div></div></>}
        </div>
      </div>
    </section>
  );
}

function mergeInvoices(loaded: Invoice[], fallback: Invoice[]): Invoice[] {
  return mergeById([...loaded, ...fallback].filter((invoice) => invoice.documentStatus === "ISSUED" && invoice.paymentStatus !== "PAID"));
}

function mergePurchases(loaded: Purchase[], fallback: Purchase[]): Purchase[] {
  return mergeById([...loaded, ...fallback].filter((purchase) => purchase.paymentStatus !== "PAID"));
}

function mergeById<T extends { id: number }>(records: T[]): T[] {
  const unique = new Map<number, T>();
  records.forEach((record) => unique.set(record.id, record));
  return [...unique.values()];
}

function toInvoice(summary: InvoiceSummary): Invoice {
  return { ...summary, notes: "", items: [] };
}

function toPurchase(summary: PurchaseSummary): Purchase {
  return { ...summary, notes: "", items: [] };
}

function toPayment(payment: PaymentResponse, invoices: Invoice[], purchases: Purchase[]): Payment {
  const invoice = payment.invoiceId == null ? undefined : invoices.find((candidate) => candidate.id === payment.invoiceId);
  const purchase = payment.purchaseId == null ? undefined : purchases.find((candidate) => candidate.id === payment.purchaseId);
  return {
    id: payment.id,
    requestId: payment.requestId,
    invoiceId: payment.invoiceId,
    purchaseId: payment.purchaseId,
    invoiceNumber: invoice?.number ?? purchase?.number ?? "Payment record",
    amount: payment.amount,
    method: payment.method,
    paidOn: payment.paidOn,
    reference: payment.reference ?? "",
  };
}
