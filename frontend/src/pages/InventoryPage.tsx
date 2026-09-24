import { useEffect, useMemo, useState } from "react";
import { request } from "../api";
import { ProductsPage } from "./ProductsPage";
import type { PageResult, Product } from "../types";

const LOW_STOCK_LIMIT = 5;

export function InventoryPage({ openManageKey = 0 }: { openManageKey?: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "LOW" | "EMPTY">("ALL");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [managingProducts, setManagingProducts] = useState(false);
  const [manageNewKey, setManageNewKey] = useState(0);
  const [inventoryReloadKey, setInventoryReloadKey] = useState(0);

  useEffect(() => {
    if (openManageKey > 0) {
      setManageNewKey(openManageKey);
      setManagingProducts(true);
    }
  }, [openManageKey]);

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
  }, [inventoryReloadKey]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = product.name.toLowerCase().includes(query.trim().toLowerCase());
    const count = Number(counts[product.id] ?? product.stockCount);
    const matchesFilter = filter === "ALL" || (filter === "EMPTY" ? count === 0 : count > 0 && count <= LOW_STOCK_LIMIT);
    return matchesQuery && matchesFilter;
  }), [counts, filter, products, query]);

  const totalUnits = products.reduce((sum, product) => sum + Number(counts[product.id] ?? product.stockCount), 0);
  const lowStock = products.filter((product) => { const count = Number(counts[product.id] ?? product.stockCount); return count > 0 && count <= LOW_STOCK_LIMIT; }).length;
  const emptyStock = products.filter((product) => Number(counts[product.id] ?? product.stockCount) === 0).length;
  const healthyStock = products.length - lowStock - emptyStock;

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
    <header className="page-heading inventory-heading"><div><span className="eyebrow">Stock</span><h2>Inventory</h2><p className="form-help">Check stock levels and update physical counts.</p></div></header>
    <div className="inventory-tabs" role="tablist" aria-label="Inventory sections"><button role="tab" aria-selected={!managingProducts} className={!managingProducts ? "is-active" : ""} type="button" onClick={() => setManagingProducts(false)}>Stock</button><button role="tab" aria-selected={managingProducts} className={managingProducts ? "is-active" : ""} type="button" onClick={() => { setManageNewKey(0); setManagingProducts(true); }}>Manage</button></div>
    {!managingProducts ? <div className="inventory-tab-panel" role="tabpanel">
      <section className="inventory-kpis" aria-label="Inventory summary"><div><span>Total units</span><strong>{totalUnits.toLocaleString("en-LK")}</strong><small>In the loaded catalogue</small></div><div><span>Products</span><strong>{products.length}</strong><small>Up to 100 loaded products</small></div><button type="button" onClick={() => setFilter("LOW")}><span>Running low</span><strong>{lowStock}</strong><small>Plan a restock</small></button><button className="is-urgent" type="button" onClick={() => setFilter("EMPTY")}><span>Out of stock</span><strong>{emptyStock}</strong><small>{emptyStock ? "Needs action now" : `${healthyStock} healthy`}</small></button></section>
      {notice && <div className="alert alert--success" role="status">{notice}</div>}
      {error && <div className="alert alert--error" role="alert">{error}</div>}
      <div className="toolbar inventory-toolbar"><div className="search-field"><label htmlFor="inventory-search">Search inventory</label><span aria-hidden="true">⌕</span><input id="inventory-search" type="search" placeholder="Search inventory items…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><label className="select-field" htmlFor="inventory-filter"><span>View</span><select id="inventory-filter" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">All products</option><option value="LOW">Low stock</option><option value="EMPTY">Out of stock</option></select></label><div className="filter-chips" aria-label="Inventory filters"><button className={filter === "ALL" ? "is-active" : ""} type="button" onClick={() => setFilter("ALL")}>All products <b>{products.length}</b></button><button className={filter === "LOW" ? "is-active" : ""} type="button" onClick={() => setFilter("LOW")}>Low stock <b>{lowStock}</b></button><button className={filter === "EMPTY" ? "is-active" : ""} type="button" onClick={() => setFilter("EMPTY")}>Out of stock <b>{emptyStock}</b></button></div></div>
      {loading ? <div className="skeleton-panel" role="status" aria-label="Loading inventory"><span className="skeleton-row" /><span className="skeleton-row" /><span className="skeleton-row" /></div> : !visibleProducts.length ? <div className="empty-state"><span className="empty-state__icon" aria-hidden="true">▥</span><h2>No matching stock records</h2><p>Try another search or change the inventory filter.</p></div> : <><div className="desktop-table table-panel table-scroll"><table className="data-table"><caption className="sr-only">Inventory stock count</caption><thead><tr><th>Product</th><th>Price</th><th>Current count</th><th>Stock state</th><th>Save</th></tr></thead><tbody>{visibleProducts.map((product) => { const count = Number(counts[product.id]); return <tr key={product.id}><td><strong>{product.name}</strong><span className="table-subline">Catalogue item</span></td><td className="money">LKR {product.price}</td><td><input className="stock-count-input" type="number" min="0" step="1" aria-label={`Stock count for ${product.name}`} value={counts[product.id] ?? "0"} onChange={(event) => setCounts((current) => ({ ...current, [product.id]: event.target.value }))} /></td><td><span className={`stock-level ${count === 0 ? "stock-level--empty" : count <= LOW_STOCK_LIMIT ? "stock-level--low" : ""}`}>{count === 0 ? "Out of stock" : count <= LOW_STOCK_LIMIT ? "Low stock" : "Healthy"}</span></td><td><button className="button button--primary" type="button" onClick={() => saveCount(product)} disabled={savingId === product.id}>{savingId === product.id ? "Saving…" : "Save count"}</button></td></tr>; })}</tbody></table></div><div className="inventory-mobile-list">{visibleProducts.map((product) => { const count = Number(counts[product.id] ?? product.stockCount); const changed = count !== product.stockCount; return <details className={`inventory-item ${count === 0 ? "inventory-item--urgent" : ""}`} key={product.id}><summary><span className="product-monogram" aria-hidden="true">{product.name.slice(0, 1).toUpperCase()}</span><span className="inventory-item__name"><strong>{product.name}</strong><small>LKR {product.price}</small></span><span className={`stock-level ${count === 0 ? "stock-level--empty" : count <= LOW_STOCK_LIMIT ? "stock-level--low" : ""}`}>{count === 0 ? "Out" : `${count} units`}</span></summary><div className="inventory-item__detail"><div className="detail-row"><span>Product reference</span><strong>#{product.id}</strong></div><label className="field"><span>Physical count</span><input type="number" min="0" step="1" value={counts[product.id] ?? "0"} onChange={(event) => setCounts((current) => ({ ...current, [product.id]: event.target.value }))} /></label>{changed && <small className="change-note">Changed from {product.stockCount} units</small>}<button className="button button--primary" type="button" onClick={() => saveCount(product)} disabled={savingId === product.id || !changed}>{savingId === product.id ? "Saving…" : changed ? "Save new count" : "No changes"}</button></div></details>; })}</div></>}
    </div> : <div className="inventory-tab-panel" role="tabpanel"><ProductsPage embedded openNewKey={manageNewKey} onChanged={() => setInventoryReloadKey((value) => value + 1)} /></div>}
  </section>;
}
