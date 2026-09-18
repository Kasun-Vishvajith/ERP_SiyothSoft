import { useEffect, useState } from "react";
import { request } from "../api";
import { SupplierForm } from "../components/SupplierForm";
import { EmptyState } from "../components/EmptyState";
import type { PageResult, Supplier } from "../types";

export function SuppliersPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResult<Supplier> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Supplier | undefined>();
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request<PageResult<Supplier>>(`/suppliers?page=${page}&size=10`, { signal: controller.signal })
      .then(setData)
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load suppliers");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
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

  function openEdit(supplier: Supplier) {
    setSelected(supplier);
    setFormOpen(true);
    setNotice("");
  }

  function saved() {
    const action = selected ? "updated" : "created";
    closeForm();
    setPage(0);
    setNotice(`Supplier ${action} successfully.`);
    setReloadKey((value) => value + 1);
  }

  async function remove(supplier: Supplier) {
    if (!window.confirm(`Delete ${supplier.name}?`)) return;
    setError("");
    setNotice("");
    try {
      await request<void>(`/suppliers/${supplier.id}`, { method: "DELETE" });
      if (data && data.content.length === 1 && page > 0) setPage((value) => value - 1);
      setNotice("Supplier deleted successfully.");
      setReloadKey((value) => value + 1);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Could not delete supplier");
    }
  }

  return (
    <div className="page-section directory-layout">
      <div className="section-heading"><div><span className="eyebrow">Directory</span><h2>Suppliers</h2><p className="form-help">Supplier records support purchase history and remain separate from customers.</p></div>{!formOpen && <button className="button button--primary" type="button" onClick={openNew}>New supplier</button>}</div>
      {formOpen && <SupplierForm key={selected?.id ?? "new"} supplier={selected} onCancel={closeForm} onSaved={saved} />}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}
      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {loading && <div className="skeleton-panel" role="status" aria-label="Loading suppliers"><span className="skeleton-row" /><span className="skeleton-row" /></div>}
      {!loading && !error && data && data.content.length === 0 && <EmptyState title="No suppliers yet" message="Add a supplier before creating a purchase." actionLabel="Add supplier" onAction={openNew} />}
      {!loading && !error && data && data.content.length > 0 && <SupplierRecords suppliers={data.content} onEdit={openEdit} onDelete={remove} />}
      {!loading && data && data.totalPages > 0 && <SupplierPagination page={page} data={data} onPrevious={() => setPage((value) => value - 1)} onNext={() => setPage((value) => value + 1)} />}
    </div>
  );
}

function SupplierRecords({ suppliers, onEdit, onDelete }: { suppliers: Supplier[]; onEdit: (supplier: Supplier) => void; onDelete: (supplier: Supplier) => void }) {
  return <><section className="desktop-table table-panel" aria-label="Suppliers"><div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{suppliers.map((supplier) => <tr key={supplier.id}><td>{supplier.name}</td><td>{supplier.email ?? "—"}</td><td>{supplier.phone ?? "—"}</td><td><SupplierActions supplier={supplier} onEdit={onEdit} onDelete={onDelete} /></td></tr>)}</tbody></table></div></section><div className="record-cards">{suppliers.map((supplier) => <article className="record-card" key={supplier.id}><div className="record-card__topline"><strong>{supplier.name}</strong></div><p className="record-card__customer">{supplier.email ?? "No email"}</p><div className="record-card__meta"><span>{supplier.phone ?? "No phone"}</span></div><SupplierActions supplier={supplier} onEdit={onEdit} onDelete={onDelete} /></article>)}</div></>;
}

function SupplierActions({ supplier, onEdit, onDelete }: { supplier: Supplier; onEdit: (supplier: Supplier) => void; onDelete: (supplier: Supplier) => void }) {
  return <div className="record-actions"><button className="button button--secondary" type="button" onClick={() => onEdit(supplier)}>Edit</button><button className="button button--text" type="button" onClick={() => onDelete(supplier)}>Delete</button></div>;
}

function SupplierPagination({ page, data, onPrevious, onNext }: { page: number; data: PageResult<Supplier>; onPrevious: () => void; onNext: () => void }) {
  return <div className="pagination"><span>Showing page {data.page + 1} of {data.totalPages}</span><div className="pagination__buttons"><button className="button button--secondary" type="button" disabled={page === 0} onClick={onPrevious}>Previous</button><button className="button button--secondary" type="button" disabled={page + 1 >= data.totalPages} onClick={onNext}>Next</button></div></div>;
}
