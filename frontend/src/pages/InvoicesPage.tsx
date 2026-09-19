import { useEffect, useState } from "react";
import { request } from "../api";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { formatMoney } from "../utils";
import type { Invoice, InvoiceSummary, PageResult } from "../types";
import { InvoiceInsights } from "../components/InvoiceInsights";

type InvoicesPageProps = {
  reloadKey: number;
  onRowsLoaded: (invoices: Invoice[]) => void;
  actionError?: string;
  notice?: string;
  onNewInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  onRecordPayment: (invoiceId: number) => void;
};

const pageSize = 3;

export function InvoicesPage({
  reloadKey,
  onRowsLoaded,
  actionError,
  notice,
  onNewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onRecordPayment,
}: InvoicesPageProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Invoice["paymentStatus"] | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResult<InvoiceSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [query, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), size: String(pageSize), q: query.trim(), status: statusFilter });
    request<PageResult<InvoiceSummary>>(`/invoices?${params.toString()}`, { signal: controller.signal })
      .then((result) => {
        setData(result);
        onRowsLoaded(result.content.map((summary) => ({ ...summary, notes: "", items: [] })));
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load invoices");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, query, statusFilter, reloadKey, retryKey, onRowsLoaded]);

  const visibleInvoices = data?.content.map((summary) => ({ ...summary, notes: "", items: [] })) ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalResults = data?.totalElements ?? 0;

  if (loading) {
    return (
      <section className="page-section" aria-busy="true" aria-label="Loading invoices">
        <div className="skeleton-toolbar" />
        <div className="skeleton-panel">
          <span className="skeleton-row" />
          <span className="skeleton-row" />
          <span className="skeleton-row" />
        </div>
      </section>
    );
  }

  if (error) {
    return <section className="page-section"><div className="alert alert--error" role="alert"><strong>Invoices could not be loaded.</strong> {error}</div><button className="button button--secondary" type="button" onClick={() => setRetryKey((value) => value + 1)}>Try again</button></section>;
  }

  return (
    <section className="page-section">
      <div className="workspace-heading"><div><span className="eyebrow">Your business, at a glance</span><h2>Make every sale count<span>.</span></h2><p>Keep invoices moving and your cash flow in focus.</p></div><span className="context-tag">Sales overview <span aria-hidden="true">↗</span></span></div>
      {notice && <div className="alert alert--success" role="status">{notice}</div>}
      {actionError && <div className="alert alert--error" role="alert">{actionError}</div>}

      <div className="summary-grid" aria-label="Invoice summary">
        <div className="summary-card">
          <span className="summary-card__label">Open balance</span>
          <strong>LKR {formatMoney(visibleInvoices.reduce((sum, invoice) => sum + Number(invoice.balance), 0).toFixed(2))}</strong>
          <span className="summary-card__hint">Unpaid balance · current page</span>
        </div>
        <div className="summary-card summary-card--mint">
          <span className="summary-card__label">Payments collected</span>
          <strong>LKR {formatMoney(visibleInvoices.reduce((sum, invoice) => sum + Number(invoice.amountPaid), 0).toFixed(2))}</strong>
          <span className="summary-card__hint">Recorded payments · current page</span>
        </div>
        <div className="summary-card summary-card--lilac">
          <span className="summary-card__label">Invoices</span>
          <strong>{totalResults}</strong>
          <span className="summary-card__hint">Matching your current filters</span>
        </div>
      </div>

      <InvoiceInsights invoices={visibleInvoices} />
      <div className="list-heading"><h2>Invoice activity</h2><span>Manage your sales records</span></div>
      <div className="toolbar">
        <div className="search-field">
          <label htmlFor="invoice-search">Search invoices</label>
          <span aria-hidden="true">⌕</span>
          <input
            id="invoice-search"
            type="search"
            placeholder="Number or customer"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <label className="select-field" htmlFor="invoice-status">
          <span>Status</span>
          <select id="invoice-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="ALL">All statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
          </select>
        </label>
        <button className="button button--primary toolbar__action" type="button" onClick={onNewInvoice}>
          <span aria-hidden="true">＋</span> New invoice
        </button>
      </div>

      {!visibleInvoices.length ? (
        <EmptyState
          title="No invoices found"
          message="Try a different search or clear the current filters."
          actionLabel="Clear filters"
          onAction={() => { setQuery(""); setStatusFilter("ALL"); }}
        />
      ) : (
        <>
          <div className="desktop-table table-panel table-scroll">
            <table className="data-table">
              <caption className="sr-only">Invoices</caption>
              <thead>
                <tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Total</th><th>Balance</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {visibleInvoices.map((invoice) => <InvoiceTableRow key={invoice.id} invoice={invoice} onEdit={onEditInvoice} onDelete={onDeleteInvoice} onPayment={onRecordPayment} />)}
              </tbody>
            </table>
          </div>

          <div className="record-cards">
            {visibleInvoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} onEdit={onEditInvoice} onDelete={onDeleteInvoice} onPayment={onRecordPayment} />)}
          </div>

          <Pagination page={page} totalPages={totalPages} totalResults={totalResults} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}

function InvoiceTableRow({ invoice, onEdit, onDelete, onPayment }: { invoice: Invoice; onEdit: (invoice: Invoice) => void; onDelete: (invoice: Invoice) => void; onPayment: (id: number) => void }) {
  const locked = Number(invoice.amountPaid) > 0;
  return (
    <tr>
      <td><strong>{invoice.number}</strong><span className="table-subline">Sales invoice</span></td>
      <td>{invoice.customerName}</td>
      <td>{invoice.date}</td>
      <td className="money">LKR {formatMoney(invoice.total)}</td>
      <td className="money">LKR {formatMoney(invoice.balance)}</td>
      <td><StatusBadge status={invoice.paymentStatus} /></td>
      <td><InvoiceActions invoice={invoice} locked={locked} onEdit={onEdit} onDelete={onDelete} onPayment={onPayment} /></td>
    </tr>
  );
}

function InvoiceCard({ invoice, onEdit, onDelete, onPayment }: { invoice: Invoice; onEdit: (invoice: Invoice) => void; onDelete: (invoice: Invoice) => void; onPayment: (id: number) => void }) {
  const locked = Number(invoice.amountPaid) > 0;
  return (
    <article className="record-card">
      <div className="record-card__topline"><strong>{invoice.number}</strong><StatusBadge status={invoice.paymentStatus} /></div>
      <p className="record-card__customer">{invoice.customerName}</p>
      <div className="record-card__meta"><span>{invoice.date}</span><span>Sales invoice</span></div>
      <div className="record-card__amounts"><div><span>Total</span><strong>LKR {formatMoney(invoice.total)}</strong></div><div><span>Balance</span><strong>LKR {formatMoney(invoice.balance)}</strong></div></div>
      <InvoiceActions invoice={invoice} locked={locked} onEdit={onEdit} onDelete={onDelete} onPayment={onPayment} />
    </article>
  );
}

function InvoiceActions({ invoice, locked, onEdit, onDelete, onPayment }: { invoice: Invoice; locked: boolean; onEdit: (invoice: Invoice) => void; onDelete: (invoice: Invoice) => void; onPayment: (id: number) => void }) {
  return (
    <div className="record-actions">
      <button className="button button--text" type="button" onClick={() => onEdit(invoice)} disabled={locked} title={locked ? "Paid invoices cannot be edited" : undefined}>
        {locked ? "Locked" : "Edit"}
      </button>
      {invoice.paymentStatus !== "PAID" && <button className="button button--secondary" type="button" onClick={() => onPayment(invoice.id)}>Record payment</button>}
      <button className="button button--text" type="button" onClick={() => onDelete(invoice)} disabled={locked} title={locked ? "Paid invoices cannot be deleted" : undefined}>Delete</button>
    </div>
  );
}

function Pagination({ page, totalPages, totalResults, onPageChange }: { page: number; totalPages: number; totalResults: number; onPageChange: (page: number) => void }) {
  return (
    <div className="pagination" aria-label="Invoice pagination">
      <span>Showing {Math.min(page * pageSize + 1, totalResults)}–{Math.min((page + 1) * pageSize, totalResults)} of {totalResults}</span>
      <div className="pagination__buttons">
        <button className="button button--secondary" type="button" disabled={page === 0} onClick={() => onPageChange(page - 1)}>Previous</button>
        <span className="pagination__page">Page {page + 1} of {totalPages}</span>
        <button className="button button--secondary" type="button" disabled={page + 1 >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}
