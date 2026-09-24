import { useEffect, useState } from "react";
import { request } from "../api";
import { CustomerForm } from "../components/CustomerForm";
import { EmptyState } from "../components/EmptyState";
import type { Customer, PageResult } from "../types";

export function CustomersPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResult<Customer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Customer | undefined>();
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request<PageResult<Customer>>(`/customers?page=${page}&size=10`, { signal: controller.signal })
      .then(setData)
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load customers");
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

  function openEdit(customer: Customer) {
    setSelected(customer);
    setFormOpen(true);
    setNotice("");
  }

  function saved() {
    const action = selected ? "updated" : "created";
    closeForm();
    setPage(0);
    setNotice(`Customer ${action} successfully.`);
    setReloadKey((value) => value + 1);
  }

  async function remove(customer: Customer) {
    if (!window.confirm(`Delete ${customer.name}?`)) return;
    setError("");
    setNotice("");
    try {
      await request<void>(`/customers/${customer.id}`, { method: "DELETE" });
      if (data && data.content.length === 1 && page > 0) setPage((value) => value - 1);
      setNotice("Customer deleted successfully.");
      setReloadKey((value) => value + 1);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Could not delete customer");
    }
  }

  return (
    <div className="page-section directory-layout">
      <div className="section-heading"><div><span className="eyebrow">Directory</span><h2>Customers</h2><p className="form-help">Contact details for the people you sell to.</p></div>{!formOpen && <button className="button button--primary" type="button" onClick={openNew}>New customer</button>}</div>
      {formOpen && <CustomerForm key={selected?.id ?? "new"} customer={selected} onCancel={closeForm} onSaved={saved} />}
      {notice && <div className="alert alert--success" role="status">{notice}</div>}
      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {loading && <div className="skeleton-panel" role="status" aria-label="Loading customers"><span className="skeleton-row" /><span className="skeleton-row" /></div>}
      {!loading && !error && data && data.content.length === 0 && <EmptyState title="No customers yet" message="Add a customer before creating a sale." actionLabel="Add customer" onAction={openNew} />}
      {!loading && !error && data && data.content.length > 0 && <CustomerRecords customers={data.content} onEdit={openEdit} onDelete={remove} />}
      {!loading && data && data.totalPages > 0 && <DirectoryPagination page={page} data={data} onPrevious={() => setPage((value) => value - 1)} onNext={() => setPage((value) => value + 1)} />}
    </div>
  );
}

function CustomerRecords({ customers, onEdit, onDelete }: { customers: Customer[]; onEdit: (customer: Customer) => void; onDelete: (customer: Customer) => void }) {
  return <><section className="desktop-table table-panel" aria-label="Customers"><div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td>{customer.name}</td><td>{customer.email ?? "—"}</td><td>{customer.phone ?? "—"}</td><td><CustomerActions customer={customer} onEdit={onEdit} onDelete={onDelete} /></td></tr>)}</tbody></table></div></section><div className="record-cards">{customers.map((customer) => <article className="record-card" key={customer.id}><div className="record-card__topline"><strong>{customer.name}</strong></div><p className="record-card__customer">{customer.email ?? "No email"}</p><div className="record-card__meta"><span>{customer.phone ?? "No phone"}</span></div><CustomerActions customer={customer} onEdit={onEdit} onDelete={onDelete} /></article>)}</div></>;
}

function CustomerActions({ customer, onEdit, onDelete }: { customer: Customer; onEdit: (customer: Customer) => void; onDelete: (customer: Customer) => void }) {
  return <div className="record-actions"><button className="button button--secondary" type="button" onClick={() => onEdit(customer)}>Edit</button><button className="button button--text" type="button" onClick={() => onDelete(customer)}>Delete</button></div>;
}

function DirectoryPagination({ page, data, onPrevious, onNext }: { page: number; data: PageResult<Customer>; onPrevious: () => void; onNext: () => void }) {
  return <div className="pagination"><span>Showing page {data.page + 1} of {data.totalPages}</span><div className="pagination__buttons"><button className="button button--secondary" type="button" disabled={page === 0} onClick={onPrevious}>Previous</button><button className="button button--secondary" type="button" disabled={page + 1 >= data.totalPages} onClick={onNext}>Next</button></div></div>;
}
