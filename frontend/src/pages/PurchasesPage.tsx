import { useEffect, useState } from "react";
import { request } from "../api";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { PurchaseForm } from "../components/PurchaseForm";
import type { PageResult, Purchase, PurchaseSummary } from "../types";

type PurchasesPageProps = {
  reloadKey: number;
  onRowsLoaded: (rows: Purchase[]) => void;
  onRecordPayment: (purchaseId: number) => void;
};

export function PurchasesPage({ reloadKey: externalReloadKey, onRowsLoaded, onRecordPayment }: PurchasesPageProps) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResult<PurchaseSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | undefined>();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request<PageResult<PurchaseSummary>>(`/purchases?page=${page}&size=10`, { signal: controller.signal })
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
  }, [page, reloadKey, externalReloadKey, onRowsLoaded]);

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

  return (
    <div className="page-section purchase-layout">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Buying workspace</span>
          <h2>Purchases</h2>
          <p className="form-help">Purchase costs are separate from catalogue selling prices. Saving a purchase adds its quantities to inventory.</p>
        </div>
        {!formOpen && <button className="button button--primary" type="button" onClick={() => { setEditing(undefined); setFormOpen(true); }}>New purchase</button>}
      </div>

      {formOpen && <PurchaseForm key={editing?.id ?? "new"} purchase={editing} onCancel={closeForm} onSaved={saved} />}
      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {loading && <div className="skeleton-panel" role="status" aria-label="Loading purchases"><span className="skeleton-row" /><span className="skeleton-row" /></div>}
      {!loading && !error && data && data.content.length === 0 && <EmptyState title="No purchases yet" message="Record a supplier purchase to begin the buying history." actionLabel="Add purchase" onAction={() => { setEditing(undefined); setFormOpen(true); }} />}
      {!loading && !error && data && data.content.length > 0 && <PurchaseRecords purchases={data.content} onEdit={edit} onDelete={remove} onRecordPayment={onRecordPayment} />}
      {!loading && data && data.totalPages > 0 && <div className="pagination"><span>Showing page {data.page + 1} of {data.totalPages}</span><div className="pagination__buttons"><button className="button button--secondary" type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="button button--secondary" type="button" disabled={page + 1 >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>}
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
  return <article className="record-card"><div className="record-card__topline"><strong>{purchase.number}</strong><StatusBadge status={purchase.paymentStatus} /></div><p className="record-card__customer">{purchase.supplierName}</p><div className="record-card__meta"><span>{purchase.date}</span><span>Balance LKR {purchase.balance}</span></div><div className="record-card__amounts"><div><span>Total</span><strong>LKR {purchase.total}</strong></div></div><PurchaseActions purchase={purchase} locked={locked} onEdit={onEdit} onDelete={onDelete} onRecordPayment={onRecordPayment} /></article>;
}

function PurchaseActions({ purchase, locked, onEdit, onDelete, onRecordPayment }: {
  purchase: PurchaseSummary;
  locked: boolean;
  onEdit: (id: number) => void;
  onDelete: (purchase: PurchaseSummary) => void;
  onRecordPayment: (id: number) => void;
}) {
  return <div className="record-actions">{purchase.paymentStatus !== "PAID" && <button className="button button--text" type="button" onClick={() => onRecordPayment(purchase.id)}>Record payment</button>}<button className="button button--text" type="button" onClick={() => onEdit(purchase.id)} disabled={locked}>{locked ? "Locked" : "Edit"}</button><button className="button button--text" type="button" onClick={() => onDelete(purchase)} disabled={locked}>Delete</button></div>;
}

function toPurchase(summary: PurchaseSummary): Purchase {
  return { ...summary, notes: "", items: [] };
}
