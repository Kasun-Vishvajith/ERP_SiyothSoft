import { useEffect, useMemo, useState } from "react";
import { request } from "../api";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { PurchaseForm } from "../components/PurchaseForm";
import type { PageResult, Purchase, PurchaseSummary } from "../types";

type PurchasesPageProps = {
  reloadKey: number;
  openNewKey?: number;
  onRowsLoaded: (rows: Purchase[]) => void;
  onRecordPayment: (purchaseId: number) => void;
};

export function PurchasesPage({ reloadKey: externalReloadKey, openNewKey = 0, onRowsLoaded, onRecordPayment }: PurchasesPageProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Purchase["paymentStatus"] | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResult<PurchaseSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | undefined>();

  useEffect(() => setPage(0), [query, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), size: "5", status: statusFilter });
    request<PageResult<PurchaseSummary>>(`/purchases?${params.toString()}`, { signal: controller.signal })
      .then((result) => {
        setData(result);
        onRowsLoaded(result.content.map(toPurchase));
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load purchases");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, reloadKey, externalReloadKey, onRowsLoaded, statusFilter]);

  useEffect(() => {
    if (openNewKey > 0) {
      setEditing(undefined);
      setFormOpen(true);
    }
  }, [openNewKey]);

  function closeForm() {
    setFormOpen(false);
    setEditing(undefined);
  }

  function saved() {
    closeForm();
    setPage(0);
    setReloadKey((value) => value + 1);
  }

  async function edit(id: number) {
    setError("");
    try {
      setEditing(await request<Purchase>(`/purchases/${id}`));
      setFormOpen(true);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Could not load purchase");
    }
  }

  async function remove(purchase: PurchaseSummary) {
    if (Number(purchase.amountPaid) > 0) return;
    if (!window.confirm(`Delete ${purchase.number}?`)) return;
    setError("");
    try {
      await request<void>(`/purchases/${purchase.id}`, { method: "DELETE" });
      if (data && data.content.length === 1 && page > 0) setPage((value) => value - 1);
      setReloadKey((value) => value + 1);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Could not delete purchase");
    }
  }

  const visiblePurchases = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.content ?? []).filter((purchase) => !needle || purchase.number.toLowerCase().includes(needle) || purchase.supplierName.toLowerCase().includes(needle));
  }, [data, query]);

  const outstanding = visiblePurchases.reduce((sum, purchase) => sum + Number(purchase.balance), 0);
  const paid = visiblePurchases.reduce((sum, purchase) => sum + Number(purchase.amountPaid), 0);

  return (
    <div className="page-section purchase-layout">
      <div className="page-heading invoice-heading"><div><span className="eyebrow">Purchasing</span><h2>Purchases</h2><p>Record supplier purchases and track what remains to be paid.</p></div>{!formOpen && <button className="button button--primary" type="button" onClick={() => { setEditing(undefined); setFormOpen(true); }}>+ New purchase</button>}</div>

      {formOpen && <PurchaseForm key={editing?.id ?? "new"} purchase={editing} onCancel={closeForm} onSaved={saved} />}
      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {loading && <div className="skeleton-panel" role="status" aria-label="Loading purchases"><span className="skeleton-row" /><span className="skeleton-row" /></div>}
      {!loading && !error && !formOpen && <><div className="summary-grid invoice-summary-grid" aria-label="Purchase summary"><div className="summary-card"><span className="summary-card__label">Amount due</span><strong>LKR {formatMoney(outstanding.toFixed(2))}</strong><span className="summary-card__hint">Outstanding · loaded purchases</span></div><div className="summary-card summary-card--mint"><span className="summary-card__label">Payments recorded</span><strong>LKR {formatMoney(paid.toFixed(2))}</strong><span className="summary-card__hint">Paid · loaded purchases</span></div><div className="summary-card summary-card--lilac invoice-count-card"><span className="summary-card__label">Purchases</span><strong>{data?.totalElements ?? 0}</strong><span className="summary-card__hint">Matching payment status</span></div></div><div className="toolbar"><div className="search-field"><label htmlFor="purchase-search">Search purchases</label><span aria-hidden="true">⌕</span><input id="purchase-search" type="search" placeholder="Number or supplier" value={query} onChange={(event) => setQuery(event.target.value)} /></div><label className="select-field" htmlFor="purchase-status"><span>Payment</span><select id="purchase-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="ALL">All payments</option><option value="UNPAID">Unpaid</option><option value="PARTIALLY_PAID">Partial</option><option value="PAID">Paid</option></select></label><div className="invoice-filter-chips purchase-filter-chips" aria-label="Purchase payment filters"><span>Payment status</span><button className={statusFilter === "ALL" ? "is-active" : ""} type="button" onClick={() => setStatusFilter("ALL")}>All payments</button><button className={statusFilter === "UNPAID" ? "is-active" : ""} type="button" onClick={() => setStatusFilter("UNPAID")}>Unpaid</button><button className={statusFilter === "PARTIALLY_PAID" ? "is-active" : ""} type="button" onClick={() => setStatusFilter("PARTIALLY_PAID")}>Partial</button><button className={statusFilter === "PAID" ? "is-active" : ""} type="button" onClick={() => setStatusFilter("PAID")}>Paid</button></div></div></>}
      {!loading && !error && !formOpen && data && data.content.length === 0 && <EmptyState title="No purchases found" message="Try another payment status or add a new purchase." actionLabel={statusFilter === "ALL" ? "Add purchase" : "Clear filter"} onAction={() => statusFilter === "ALL" ? (setEditing(undefined), setFormOpen(true)) : setStatusFilter("ALL")} />}
      {!loading && !error && !formOpen && data && data.content.length > 0 && visiblePurchases.length === 0 && <EmptyState title="No matching purchases" message="Try a different supplier or purchase number." actionLabel="Clear search" onAction={() => setQuery("")} />}
      {!loading && !error && !formOpen && visiblePurchases.length > 0 && <PurchaseRecords purchases={visiblePurchases} onEdit={edit} onDelete={remove} onRecordPayment={onRecordPayment} />}
      {!loading && !formOpen && data && data.totalPages > 0 && <div className="pagination"><span>Showing page {data.page + 1} of {data.totalPages}</span><div className="pagination__buttons"><button className="button button--secondary" type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="button button--secondary" type="button" disabled={page + 1 >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>}
    </div>
  );
}

function PurchaseRecords({ purchases, onEdit, onDelete, onRecordPayment }: {
  purchases: PurchaseSummary[];
  onEdit: (id: number) => void;
  onDelete: (purchase: PurchaseSummary) => void;
  onRecordPayment: (id: number) => void;
}) {
  return (
    <>
      <section className="desktop-table table-panel table-scroll" aria-label="Purchases">
        <table className="data-table">
          <thead><tr><th>Purchase</th><th>Supplier</th><th>Date</th><th>Total</th><th>Balance</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{purchases.map((purchase) => <PurchaseTableRow key={purchase.id} purchase={purchase} onEdit={onEdit} onDelete={onDelete} onRecordPayment={onRecordPayment} />)}</tbody>
        </table>
      </section>
      <div className="record-cards">
        {purchases.map((purchase) => <PurchaseCard key={purchase.id} purchase={purchase} onEdit={onEdit} onDelete={onDelete} onRecordPayment={onRecordPayment} />)}
      </div>
    </>
  );
}

function PurchaseTableRow({ purchase, onEdit, onDelete, onRecordPayment }: {
  purchase: PurchaseSummary;
  onEdit: (id: number) => void;
  onDelete: (purchase: PurchaseSummary) => void;
  onRecordPayment: (id: number) => void;
}) {
  const locked = Number(purchase.amountPaid) > 0;
  return <tr><td><strong>{purchase.number}</strong></td><td>{purchase.supplierName}</td><td>{purchase.date}</td><td className="money">LKR {purchase.total}</td><td className="money">LKR {purchase.balance}</td><td><StatusBadge status={purchase.paymentStatus} /></td><td><PurchaseActions purchase={purchase} locked={locked} onEdit={onEdit} onDelete={onDelete} onRecordPayment={onRecordPayment} /></td></tr>;
}

function PurchaseCard({ purchase, onEdit, onDelete, onRecordPayment }: {
  purchase: PurchaseSummary;
  onEdit: (id: number) => void;
  onDelete: (purchase: PurchaseSummary) => void;
  onRecordPayment: (id: number) => void;
}) {
  const locked = Number(purchase.amountPaid) > 0;
  return (
    <details className="invoice-list-item purchase-list-item">
      <summary>
        <span>
          <strong>{purchase.supplierName}</strong>
          <small>{purchase.paymentStatus === "PAID" ? "Paid in full" : `LKR ${formatMoney(purchase.balance)} due`}</small>
        </span>
        <span className="invoice-list-item__value">
          <strong>LKR {formatMoney(purchase.total)}</strong>
          <StatusBadge status={purchase.paymentStatus} />
        </span>
      </summary>
      <div className="invoice-list-item__detail">
        <dl>
          <div><dt>Purchase number</dt><dd>{purchase.number}</dd></div>
          <div><dt>Date</dt><dd>{purchase.date}</dd></div>
        </dl>
        <PurchaseActions purchase={purchase} locked={locked} onEdit={onEdit} onDelete={onDelete} onRecordPayment={onRecordPayment} />
      </div>
    </details>
  );
}

function PurchaseActions({ purchase, locked, onEdit, onDelete, onRecordPayment }: {
  purchase: PurchaseSummary;
  locked: boolean;
  onEdit: (id: number) => void;
  onDelete: (purchase: PurchaseSummary) => void;
  onRecordPayment: (id: number) => void;
}) {
  return <div className="record-actions">{purchase.paymentStatus !== "PAID" && <button className="button button--primary" type="button" onClick={() => onRecordPayment(purchase.id)}>Record payment</button>}{!locked && <button className="button button--text" type="button" onClick={() => onEdit(purchase.id)}>Edit</button>}{!locked && <button className="button button--text" type="button" onClick={() => onDelete(purchase)}>Delete</button>}</div>;
}

function formatMoney(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value;
}

function toPurchase(summary: PurchaseSummary): Purchase {
  return { ...summary, notes: "", items: [] };
}
