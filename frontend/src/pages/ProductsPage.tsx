import { useEffect, useState } from "react";
import { request } from "../api";
import { EmptyState } from "../components/EmptyState";
import { ProductForm } from "../components/ProductForm";
import type { PageResult, Product } from "../types";

export function ProductsPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResult<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Product | undefined>();
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request<PageResult<Product>>(`/products?page=${page}&size=10`, { signal: controller.signal })
      .then(setData)
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load products");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    // Page changes and successful mutations cancel any older list request.
    return () => controller.abort();
  }, [page, reloadKey]);

  function closeForm() {
    setFormOpen(false);
    setSelected(undefined);
  }

  function openNew() {
    setSelected(undefined);
    setFormOpen(true);
    setNotice("");
  }

  function openEdit(product: Product) {
    setSelected(product);
    setFormOpen(true);
    setNotice("");
  }

  function saved() {
    const action = selected ? "updated" : "created";
    closeForm();
    setPage(0);
    setNotice(`Product ${action} successfully.`);
    setReloadKey((value) => value + 1);
  }

  async function remove(product: Product) {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    setError("");
    setNotice("");
    try {
      await request<void>(`/products/${product.id}`, { method: "DELETE" });
      if (data && data.content.length === 1 && page > 0) setPage((value) => value - 1);
      setNotice("Product deleted successfully.");
      setReloadKey((value) => value + 1);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Could not delete product");
    }
  }

  return (
    <div className="page-section product-layout">
      <div className="section-heading"><div><span className="eyebrow">Catalogue</span><h2>Products</h2><p className="form-help">Selling prices are saved by the server and copied into future invoice snapshots.</p></div>{!formOpen && <button className="button button--primary" type="button" onClick={openNew}>New product</button>}</div>
      {formOpen && <ProductForm key={selected?.id ?? "new"} product={selected} onCancel={closeForm} onSaved={saved} />}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}
      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {loading && <div className="skeleton-panel" role="status" aria-label="Loading products"><span className="skeleton-row" /><span className="skeleton-row" /><span className="skeleton-row" /></div>}
      {!loading && !error && data && data.content.length === 0 && <EmptyState title="No products yet" message="Add the first catalogue item before creating an invoice." actionLabel="Add product" onAction={openNew} />}
      {!loading && !error && data && data.content.length > 0 && <ProductRecords products={data.content} onEdit={openEdit} onDelete={remove} />}
      {!loading && data && data.totalPages > 0 && <div className="pagination"><span>Showing page {data.page + 1} of {data.totalPages}</span><div className="pagination__buttons"><button className="button button--secondary" type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="button button--secondary" type="button" disabled={page + 1 >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>}
    </div>
  );
}

function ProductRecords({ products, onEdit, onDelete }: { products: Product[]; onEdit: (product: Product) => void; onDelete: (product: Product) => void }) {
  return <><section className="desktop-table table-panel" aria-label="Products"><div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Price (LKR)</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.name}</td><td className="money">{product.price}</td><td><ProductActions product={product} onEdit={onEdit} onDelete={onDelete} /></td></tr>)}</tbody></table></div></section><div className="record-cards">{products.map((product) => <article className="record-card" key={product.id}><div className="record-card__topline"><strong>{product.name}</strong></div><div className="record-card__amounts"><div><span>Price</span><strong>LKR {product.price}</strong></div></div><ProductActions product={product} onEdit={onEdit} onDelete={onDelete} /></article>)}</div></>;
}

function ProductActions({ product, onEdit, onDelete }: { product: Product; onEdit: (product: Product) => void; onDelete: (product: Product) => void }) {
  return <div className="record-actions"><button className="button button--secondary" type="button" onClick={() => onEdit(product)}>Edit</button><button className="button button--text" type="button" onClick={() => onDelete(product)}>Delete</button></div>;
}
