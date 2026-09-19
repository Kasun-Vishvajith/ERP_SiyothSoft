import { useEffect, useState, type FormEvent } from "react";
import { request } from "../api";
import type { Product } from "../types";

type ProductFormProps = {
  product?: Product;
  onCancel: () => void;
  onSaved: () => void;
};

export function ProductForm({ product, onCancel, onSaved }: ProductFormProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [stockCount, setStockCount] = useState(String(product?.stockCount ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(product?.name ?? "");
    setPrice(product?.price ?? "");
    setStockCount(String(product?.stockCount ?? 0));
    setError("");
  }, [product]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const path = product ? `/products/${product.id}` : "/products";
      await request<Product>(path, {
        method: product ? "PUT" : "POST",
        body: JSON.stringify({ name: name.trim(), price, stockCount: Number(stockCount) }),
      });
      onSaved();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="form-card product-form-panel" aria-labelledby="product-form-title">
      <div className="section-heading">
        <div><span className="eyebrow">Catalogue record</span><h2 id="product-form-title">{product ? "Edit product" : "New product"}</h2></div>
        <button className="button button--secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
      {error && <div className="alert alert--error" role="alert">{error}</div>}
      <form className="field-grid" onSubmit={save}>
        <label className="field"><span>Name</span><input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} required /></label>
        <label className="field"><span>Price (LKR)</span><input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /></label>
        <label className="field"><span>Opening stock count</span><input type="number" min="0" step="1" value={stockCount} onChange={(event) => setStockCount(event.target.value)} required /></label>
        <div className="form-actions"><button className="button button--primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save product"}</button></div>
      </form>
    </section>
  );
}
