import { useEffect, useMemo, useState } from "react";
import { request } from "../api";
import type { PageResult, Product } from "../types";

const LOW_STOCK_LIMIT = 5;

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "LOW" | "EMPTY">("ALL");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    request<PageResult<Product>>("/products?page=0&size=100", { signal: controller.signal })
      .then((result) => {
        setProducts(result.content);
        setCounts(Object.fromEntries(result.content.map((product) => [product.id, String(product.stockCount)])));
      })
      .catch((caught: unknown) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load inventory"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = product.name.toLowerCase().includes(query.trim().toLowerCase());
    const count = Number(counts[product.id] ?? product.stockCount);
    const matchesFilter = filter === "ALL" || (filter === "EMPTY" ? count === 0 : count > 0 && count <= LOW_STOCK_LIMIT);
    return matchesQuery && matchesFilter;
  }), [counts, filter, products, query]);

  const totalUnits = products.reduce((sum, product) => sum + Number(counts[product.id] ?? product.stockCount), 0);
  const lowStock = products.filter((product) => { const count = Number(counts[product.id] ?? product.stockCount); return count > 0 && count <= LOW_STOCK_LIMIT; }).length;
  const emptyStock = products.filter((product) => Number(counts[product.id] ?? product.stockCount) === 0).length;

  async function saveCount(product: Product) {
    const nextCount = Number(counts[product.id]);
    if (!Number.isInteger(nextCount) || nextCount < 0) { setError("Stock count must be a whole number of zero or more."); return; }
    setSavingId(product.id); setError(""); setNotice("");
    try {
      const saved = await request<Product>(`/products/${product.id}`, { method: "PUT", body: JSON.stringify({ name: product.name, price: product.price, stockCount: nextCount }) });
      setProducts((current) => current.map((item) => item.id === saved.id ? saved : item));
      setCounts((current) => ({ ...current, [saved.id]: String(saved.stockCount) }));
      setNotice(`${saved.name} stock count updated.`);
    } catch (caught: unknown) { setError(caught instanceof Error ? caught.message : "Could not update stock count"); }
    finally { setSavingId(null); }
  }

  return <section className="page-section inventory-page">
    <div className="section-heading inventory-heading"><div><span className="eyebrow">Stock control</span><h2>Inventory count</h2><p className="form-help">Keep a clear on-hand count for every catalogue item. Counts are saved to the server.</p></div></div>
    <div className="summary-grid inventory-summary"><div className="summary-card summary-card--blue"><span className="summary-card__label">Total units</span><strong>{totalUnits.toLocaleString("en-LK")}</strong><span className="summary-card__hint">Across {products.length} products</span></div><div className="summary-card summary-card--orange"><span className="summary-card__label">Low stock</span><strong>{lowStock}</strong><span className="summary-card__hint">Between 1 and {LOW_STOCK_LIMIT} units</span></div><div className="summary-card summary-card--coral"><span className="summary-card__label">Out of stock</span><strong>{emptyStock}</strong><span className="summary-card__hint">Needs replenishment</span></div></div>
    {notice && <div className="alert alert--success" role="status">{notice}</div>}
    {error && <div className="alert alert--error" role="alert">{error}</div>}
    <div className="toolbar inventory-toolbar"><div className="search-field"><label htmlFor="inventory-search">Search inventory</label><span aria-hidden="true">⌕</span><input id="inventory-search" type="search" placeholder="Search product…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><label className="select-field" htmlFor="inventory-filter"><span>View</span><select id="inventory-filter" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">All products</option><option value="LOW">Low stock</option><option value="EMPTY">Out of stock</option></select></label></div>
    {loading ? <div className="skeleton-panel" role="status" aria-label="Loading inventory"><span className="skeleton-row" /><span className="skeleton-row" /><span className="skeleton-row" /></div> : !visibleProducts.length ? <div className="empty-state"><span className="empty-state__icon" aria-hidden="true">▥</span><h2>No matching stock records</h2><p>Try another search or change the inventory filter.</p></div> : <><div className="desktop-table table-panel table-scroll"><table className="data-table"><caption className="sr-only">Inventory stock count</caption><thead><tr><th>Product</th><th>Price</th><th>Current count</th><th>Stock state</th><th>Save</th></tr></thead><tbody>{visibleProducts.map((product) => { const count = Number(counts[product.id]); return <tr key={product.id}><td><strong>{product.name}</strong><span className="table-subline">Catalogue item</span></td><td className="money">LKR {product.price}</td><td><input className="stock-count-input" type="number" min="0" step="1" aria-label={`Stock count for ${product.name}`} value={counts[product.id] ?? "0"} onChange={(event) => setCounts((current) => ({ ...current, [product.id]: event.target.value }))} /></td><td><span className={`stock-level ${count === 0 ? "stock-level--empty" : count <= LOW_STOCK_LIMIT ? "stock-level--low" : ""}`}>{count === 0 ? "Out of stock" : count <= LOW_STOCK_LIMIT ? "Low stock" : "Healthy"}</span></td><td><button className="button button--primary" type="button" onClick={() => saveCount(product)} disabled={savingId === product.id}>{savingId === product.id ? "Saving…" : "Save count"}</button></td></tr>; })}</tbody></table></div><div className="record-cards">{visibleProducts.map((product) => <article className="record-card inventory-record" key={product.id}><div className="record-card__topline"><strong>{product.name}</strong><span className={`stock-level ${Number(counts[product.id]) === 0 ? "stock-level--empty" : Number(counts[product.id]) <= LOW_STOCK_LIMIT ? "stock-level--low" : ""}`}>{Number(counts[product.id]) === 0 ? "Out of stock" : `${counts[product.id]} units`}</span></div><div className="inventory-record__editor"><label className="field"><span>Current count</span><input type="number" min="0" step="1" value={counts[product.id] ?? "0"} onChange={(event) => setCounts((current) => ({ ...current, [product.id]: event.target.value }))} /></label><button className="button button--primary" type="button" onClick={() => saveCount(product)} disabled={savingId === product.id}>{savingId === product.id ? "Saving…" : "Save count"}</button></div></article>)}</div></>}
  </section>;
}
