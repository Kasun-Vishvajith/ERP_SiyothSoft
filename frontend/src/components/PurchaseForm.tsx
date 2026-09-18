import { useEffect, useMemo, useState, type FormEvent } from "react";
import { request } from "../api";
import { LookupPager } from "./LookupPager";
import type { PageResult, Product, Purchase, PurchaseDraftItem, Supplier } from "../types";

type PurchaseFormProps = { purchase?: Purchase; onCancel: () => void; onSaved: (purchase: Purchase) => void };

function rowKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `purchase-line-${Date.now()}-${Math.random()}`;
}

function initialRows(purchase?: Purchase): PurchaseDraftItem[] {
  return purchase?.items.map((item) => ({ key: rowKey(), productId: item.productId, quantity: String(item.quantity), unitPrice: item.unitPrice })) ?? [{ key: rowKey(), productId: "", quantity: "1", unitPrice: "" }];
}

export function PurchaseForm({ purchase, onCancel, onSaved }: PurchaseFormProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierPage, setSupplierPage] = useState(0);
  const [productPage, setProductPage] = useState(0);
  const [supplierTotalPages, setSupplierTotalPages] = useState(0);
  const [productTotalPages, setProductTotalPages] = useState(0);
  const [supplierId, setSupplierId] = useState<number | "" >(purchase?.supplierId ?? "");
  const [date, setDate] = useState(purchase?.date ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(purchase?.notes ?? "");
  const [items, setItems] = useState(initialRows(purchase));
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const locked = Boolean(purchase && Number(purchase.amountPaid) > 0);
  const previewTotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0).toFixed(2), [items]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingLookups(true);
    setErrors([]);
    Promise.all([
      request<PageResult<Supplier>>(`/suppliers?page=${supplierPage}&size=10`, { signal: controller.signal }),
      request<PageResult<Product>>(`/products?page=${productPage}&size=10`, { signal: controller.signal }),
    ]).then(([supplierResult, productResult]) => {
      setSuppliers(supplierResult.content);
      setProducts(productResult.content);
      setSupplierTotalPages(supplierResult.totalPages);
      setProductTotalPages(productResult.totalPages);
    }).catch((caught: unknown) => { if (!controller.signal.aborted) setErrors([caught instanceof Error ? caught.message : "Could not load purchase lookups"]); }).finally(() => { if (!controller.signal.aborted) setLoadingLookups(false); });
    return () => controller.abort();
  }, [supplierPage, productPage]);

  const supplierOptions = useMemo(() => {
    if (!purchase || suppliers.some((supplier) => supplier.id === purchase.supplierId)) return suppliers;
    return [{ id: purchase.supplierId, name: purchase.supplierName, email: null, phone: null }, ...suppliers];
  }, [purchase, suppliers]);

  const productOptions = useMemo(() => {
    const selectedProducts = purchase?.items
      .filter((item) => !products.some((product) => product.id === item.productId))
      .map((item) => ({ id: item.productId, name: item.productName, price: item.unitPrice })) ?? [];
    return [...selectedProducts, ...products];
  }, [products, purchase]);

  function updateRow(key: string, changes: Partial<PurchaseDraftItem>) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...changes } : item));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || locked) return;
    const nextErrors: string[] = [];
    if (!supplierId) nextErrors.push("Choose a supplier.");
    if (!date) nextErrors.push("Choose a purchase date.");
    if (!items.length) nextErrors.push("Add at least one purchase line.");
    items.forEach((item, index) => {
      if (!item.productId) nextErrors.push(`Choose a product for line ${index + 1}.`);
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) nextErrors.push(`Line ${index + 1} quantity must be a positive whole number.`);
      if (!item.unitPrice || Number(item.unitPrice) < 0) nextErrors.push(`Line ${index + 1} cost must be zero or greater.`);
    });
    setErrors(nextErrors);
    if (nextErrors.length) return;
    setSaving(true);
    try {
      const saved = await request<Purchase>(purchase ? `/purchases/${purchase.id}` : "/purchases", { method: purchase ? "PUT" : "POST", body: JSON.stringify({ supplierId, date, notes: notes.trim(), items: items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity), unitPrice: item.unitPrice })) }) });
      onSaved(saved);
    } catch (caught: unknown) { setErrors([caught instanceof Error ? caught.message : "Could not save purchase"]); }
    finally { setSaving(false); }
  }

  return <section className="form-card purchase-form" aria-labelledby="purchase-form-title"><div className="section-heading"><div><span className="eyebrow">Purchase record</span><h2 id="purchase-form-title">{purchase ? purchase.number : "New purchase"}</h2></div><button className="button button--secondary" type="button" onClick={onCancel}>Cancel</button></div>{locked && <div className="alert alert--warning" role="alert">This purchase has a payment and cannot be edited.</div>}{errors.length > 0 && <div className="alert alert--error" role="alert"><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}<form onSubmit={save} noValidate><div className="field-grid"><label className="field"><span>Supplier <em>*</em></span><select value={supplierId} onChange={(event) => setSupplierId(event.target.value ? Number(event.target.value) : "")} disabled={locked || loadingLookups}><option value="">Select supplier</option>{supplierOptions.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><label className="field"><span>Purchase date <em>*</em></span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={locked} /></label></div><LookupPager label="Supplier" page={supplierPage} totalPages={supplierTotalPages} disabled={locked || loadingLookups} onPageChange={setSupplierPage} /><label className="field"><span>Notes <small>Optional</small></span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={locked} /></label><div className="section-heading"><div><span className="eyebrow">Cost lines</span><h3>What was purchased?</h3></div><span className="snapshot-note">Selling price is not changed</span></div><div className="line-items">{items.map((item, index) => <div className="line-item" key={item.key}><div className="line-item__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div><label className="field"><span>Product <em>*</em></span><select value={item.productId} onChange={(event) => updateRow(item.key, { productId: event.target.value ? Number(event.target.value) : "" })} disabled={locked || loadingLookups}><option value="">Select product</option>{productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label className="field"><span>Quantity <em>*</em></span><input type="number" min="1" max="10000" step="1" value={item.quantity} onChange={(event) => updateRow(item.key, { quantity: event.target.value })} disabled={locked} /></label><label className="field"><span>Unit cost (LKR) <em>*</em></span><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateRow(item.key, { unitPrice: event.target.value })} disabled={locked} /></label><button className="icon-button line-item__remove" type="button" aria-label={`Remove line ${index + 1}`} onClick={() => setItems((current) => current.filter((candidate) => candidate.key !== item.key))} disabled={locked || items.length === 1}>×</button></div>)}</div><LookupPager label="Product" page={productPage} totalPages={productTotalPages} disabled={locked || loadingLookups} onPageChange={setProductPage} /><button className="button button--secondary" type="button" onClick={() => setItems((current) => [...current, { key: rowKey(), productId: "", quantity: "1", unitPrice: "" }])} disabled={locked}>＋ Add line item</button><div className="form-card__footer"><div className="total-preview"><span>Estimated purchase total</span><strong>LKR {Number(previewTotal).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</strong><small>Preview only; the backend calculates the saved total.</small></div><div className="form-actions"><button className="button button--text" type="button" onClick={onCancel}>Cancel</button><button className="button button--primary" type="submit" disabled={saving || locked || loadingLookups}>{saving ? "Saving…" : purchase ? "Save changes" : "Create purchase"}</button></div></div></form></section>;
}
