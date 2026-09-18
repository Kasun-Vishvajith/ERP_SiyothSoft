import { useEffect, useMemo, useState, type FormEvent } from "react";
import { request } from "../api";
import { LookupPager } from "./LookupPager";
import type { Customer, Invoice, InvoiceDraft, InvoiceDraftItem, PageResult, Product } from "../types";

type InvoiceFormProps = {
  invoice?: Invoice;
  onCancel: () => void;
  onSave: (invoice: Invoice) => void;
};

function calculatePreviewTotal(items: InvoiceDraftItem[], products: Product[]): string {
  return items.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return sum + (product ? Number(product.price) * Number(item.quantity || 0) : 0);
  }, 0).toFixed(2);
}

function newRowKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random()}`;
}

function createDraft(invoice?: Invoice): InvoiceDraft {
  return {
    customerId: invoice?.customerId ?? "",
    date: invoice?.date ?? new Date().toISOString().slice(0, 10),
    notes: invoice?.notes ?? "",
    items: invoice?.items.map((item) => ({ key: newRowKey(), productId: item.productId, quantity: String(item.quantity) }))
      ?? [{ key: newRowKey(), productId: "", quantity: "1" }],
  };
}

export function InvoiceForm({ invoice, onCancel, onSave }: InvoiceFormProps) {
  const [draft, setDraft] = useState(() => createDraft(invoice));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerPage, setCustomerPage] = useState(0);
  const [productPage, setProductPage] = useState(0);
  const [customerTotalPages, setCustomerTotalPages] = useState(0);
  const [productTotalPages, setProductTotalPages] = useState(0);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const isLocked = Boolean(invoice && Number(invoice.amountPaid) > 0);

  useEffect(() => {
    const controller = new AbortController();
    setLookupLoading(true);
    setLookupError("");
    Promise.all([
      request<PageResult<Customer>>(`/customers?page=${customerPage}&size=10`, { signal: controller.signal }),
      request<PageResult<Product>>(`/products?page=${productPage}&size=10`, { signal: controller.signal }),
    ])
      .then(([customerPage, productPage]) => {
        setCustomers(customerPage.content);
        setProducts(productPage.content);
        setCustomerTotalPages(customerPage.totalPages);
        setProductTotalPages(productPage.totalPages);
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setLookupError(caught instanceof Error ? caught.message : "Could not load invoice lookups");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLookupLoading(false);
      });
    // The form owns these paged lookup requests and cancels them when it closes.
    return () => controller.abort();
  }, [customerPage, productPage]);

  const customerOptions = useMemo(() => {
    if (!invoice || customers.some((customer) => customer.id === invoice.customerId)) return customers;
    return [{ id: invoice.customerId, name: invoice.customerName, email: null, phone: null }, ...customers];
  }, [customers, invoice]);

  const productOptions = useMemo(() => {
    const selectedProducts = invoice?.items
      .filter((item) => !products.some((product) => product.id === item.productId))
      .map((item) => ({ id: item.productId, name: item.productName, price: item.unitPrice })) ?? [];
    return [...selectedProducts, ...products];
  }, [invoice, products]);

  const previewTotal = useMemo(() => calculatePreviewTotal(draft.items, productOptions), [draft.items, productOptions]);

  function updateItem(key: string, changes: Partial<InvoiceDraftItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => item.key === key ? { ...item, ...changes } : item),
    }));
  }

  function validate(): string[] {
    const nextErrors: string[] = [];
    if (!draft.customerId) nextErrors.push("Choose a customer.");
    if (!draft.date) nextErrors.push("Choose an invoice date.");
    if (!draft.items.length) nextErrors.push("Add at least one invoice line.");
    draft.items.forEach((item, index) => {
      if (!item.productId) nextErrors.push(`Choose a product for line ${index + 1}.`);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
        nextErrors.push(`Line ${index + 1} quantity must be a whole number from 1 to 10,000.`);
      }
    });
    return nextErrors;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || isLocked) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    if (nextErrors.length) return;

    setSaving(true);
    try {
      const savedInvoice = await request<Invoice>(invoice ? `/invoices/${invoice.id}` : "/invoices", {
        method: invoice ? "PUT" : "POST",
        body: JSON.stringify({
          customerId: draft.customerId,
          date: draft.date,
          notes: draft.notes.trim(),
          items: draft.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })),
        }),
      });
      setSaving(false);
      onSave(savedInvoice);
    } catch (caught: unknown) {
      setSaving(false);
      setErrors([caught instanceof Error ? caught.message : "Could not save invoice"]);
    }
  }

  return (
    <section className="form-layout">
      <div className="form-intro">
        <button className="back-link" type="button" onClick={onCancel}>← Back to invoices</button>
        <div className="form-intro__heading">
          <div>
            <span className="eyebrow">{invoice ? "Edit draft" : "New record"}</span>
            <h2>{invoice ? invoice.number : "Create invoice"}</h2>
            <p>{invoice ? "Update this unpaid invoice before recording any payment." : "Add a customer and line items. The server will calculate the final total."}</p>
          </div>
          <span className="form-step">1 <span>of</span> 1</span>
        </div>
      </div>

      {isLocked && <div className="alert alert--warning" role="alert">This invoice is payment-locked. Paid or partially paid invoices cannot be edited.</div>}
      {lookupError && <div className="alert alert--error" role="alert">{lookupError}</div>}
      {errors.length > 0 && (
        <div className="alert alert--error" role="alert">
          <strong>Check the form before saving</strong>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      )}

      <form className="form-card" onSubmit={submit} noValidate>
        <div className="form-card__section">
          <div className="section-heading"><div><span className="eyebrow">Invoice details</span><h3>Who is this for?</h3></div><span className="required-note">* Required</span></div>
          <div className="field-grid">
            <label className="field" htmlFor="invoice-customer">
              <span>Customer <em>*</em></span>
              <select id="invoice-customer" value={draft.customerId} onChange={(event) => setDraft({ ...draft, customerId: event.target.value ? Number(event.target.value) : "" })} disabled={isLocked}>
                <option value="">Select a customer</option>
                {customerOptions.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </label>
            <label className="field" htmlFor="invoice-date">
              <span>Invoice date <em>*</em></span>
              <input id="invoice-date" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} disabled={isLocked} />
            </label>
          </div>
          <LookupPager label="Customer" page={customerPage} totalPages={customerTotalPages} disabled={isLocked || lookupLoading} onPageChange={setCustomerPage} />
          <label className="field" htmlFor="invoice-notes"><span>Notes <small>Optional</small></span><textarea id="invoice-notes" rows={3} placeholder="Add a short note for this customer" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} disabled={isLocked} /></label>
        </div>

        <div className="form-card__section">
          <div className="section-heading"><div><span className="eyebrow">Line items</span><h3>What was sold?</h3></div><span className="snapshot-note">Server snapshots product names and prices</span></div>
          <div className="line-items">
            {draft.items.map((item, index) => {
              const product = productOptions.find((candidate) => candidate.id === item.productId);
              return (
                <div className="line-item" key={item.key}>
                  <div className="line-item__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
                  <label className="field" htmlFor={`product-${item.key}`}><span>Product <em>*</em></span><select id={`product-${item.key}`} value={item.productId} onChange={(event) => updateItem(item.key, { productId: event.target.value ? Number(event.target.value) : "" })} disabled={isLocked || lookupLoading}><option value="">Select product</option>{productOptions.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · LKR {candidate.price}</option>)}</select></label>
                  <label className="field" htmlFor={`quantity-${item.key}`}><span>Quantity <em>*</em></span><input id={`quantity-${item.key}`} type="number" min="1" max="10000" step="1" value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: event.target.value })} disabled={isLocked} /></label>
                  <div className="line-item__total"><span>Preview total</span><strong>LKR {product ? (Number(product.price) * Number(item.quantity || 0)).toFixed(2) : "0.00"}</strong></div>
                  <button className="icon-button line-item__remove" type="button" aria-label={`Remove line ${index + 1}`} onClick={() => setDraft({ ...draft, items: draft.items.filter((candidate) => candidate.key !== item.key) })} disabled={isLocked || draft.items.length === 1}>×</button>
                </div>
              );
            })}
          </div>
          <LookupPager label="Product" page={productPage} totalPages={productTotalPages} disabled={isLocked || lookupLoading} onPageChange={setProductPage} />
          <button className="button button--secondary" type="button" onClick={() => setDraft({ ...draft, items: [...draft.items, { key: newRowKey(), productId: "", quantity: "1" }] })} disabled={isLocked}>＋ Add line item</button>
        </div>

        <div className="form-card__footer">
          <div className="total-preview"><span>Estimated total</span><strong>LKR {Number(previewTotal).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</strong><small>Preview only; the backend calculates the saved total.</small></div>
          <div className="form-actions"><button className="button button--text" type="button" onClick={onCancel}>Cancel</button><button className="button button--primary" type="submit" disabled={saving || isLocked || lookupLoading || Boolean(lookupError)}>{saving ? "Saving…" : invoice ? "Save changes" : "Create invoice"}</button></div>
        </div>
      </form>
    </section>
  );
}
