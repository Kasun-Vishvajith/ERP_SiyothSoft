import { useEffect, useState } from "react";
import { request } from "../api";
import { EmptyState } from "../components/EmptyState";
import { InvoiceStatusBadges } from "../components/InvoiceStatus";
import { formatMoney } from "../utils";
import type { Invoice, InvoiceSummary, PageResult } from "../types";

type InvoicesPageProps = {
  reloadKey: number;
  onRowsLoaded: (invoices: Invoice[]) => void;
  actionError?: string;
  notice?: string;
  onNewInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  onRecordPayment: (invoiceId: number) => void;
};

const pageSize = 5;

export function InvoicesPage({
  reloadKey,
  onRowsLoaded,
  actionError,
  notice,
  onNewInvoice,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onRecordPayment,
}: InvoicesPageProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Invoice["paymentStatus"] | "ALL">("ALL");
  const [documentFilter, setDocumentFilter] = useState<Invoice["documentStatus"] | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResult<InvoiceSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [query, statusFilter, documentFilter]);

  useEffect(() => {
    if (documentFilter !== "ISSUED") setStatusFilter("ALL");
  }, [documentFilter]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), size: String(pageSize), q: query.trim(), status: statusFilter, documentStatus: documentFilter });
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
  }, [page, query, statusFilter, documentFilter, reloadKey, retryKey, onRowsLoaded]);

  const visibleInvoices = data?.content.map((summary) => ({ ...summary, notes: "", items: [] })) ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalResults = data?.totalElements ?? 0;

  if (loading && !data) {
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
    <section className="page-section" aria-busy={loading}>
      <div className="page-heading invoice-heading"><div><span className="eyebrow">Sales</span><h2>Invoices</h2><p>Create invoices and track customer payments.</p></div><button className="button button--primary" type="button" onClick={onNewInvoice}>+ New invoice</button></div>
      {notice && <div className="alert alert--success" role="status">{notice}</div>}
      {actionError && <div className="alert alert--error" role="alert">{actionError}</div>}

      <div className="summary-grid invoice-summary-grid" aria-label="Invoice summary">
        <div className="summary-card">
          <span className="summary-card__label">Open balance</span>
           <strong>LKR {formatMoney(visibleInvoices.filter((invoice) => invoice.documentStatus === "ISSUED").reduce((sum, invoice) => sum + Number(invoice.balance), 0).toFixed(2))}</strong>
           <span className="summary-card__hint">Outstanding · loaded issued invoices</span>
        </div>
        <div className="summary-card summary-card--mint">
          <span className="summary-card__label">Payments collected</span>
           <strong>LKR {formatMoney(visibleInvoices.filter((invoice) => invoice.documentStatus === "ISSUED").reduce((sum, invoice) => sum + Number(invoice.amountPaid), 0).toFixed(2))}</strong>
           <span className="summary-card__hint">Collected · loaded issued invoices</span>
        </div>
        <div className="summary-card summary-card--lilac invoice-count-card">
          <span className="summary-card__label">Invoices</span>
          <strong>{totalResults}</strong>
          <span className="summary-card__hint">Matching your current filters</span>
        </div>
      </div>

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
        <label className="select-field" htmlFor="invoice-document-status">
           <span>Document</span>
           <select id="invoice-document-status" value={documentFilter} onChange={(event) => setDocumentFilter(event.target.value as typeof documentFilter)}>
             <option value="ALL">All documents</option>
             <option value="DRAFT">Draft</option>
             <option value="ISSUED">Issued</option>
             <option value="CANCELLED">Cancelled</option>
           </select>
         </label>
         <label className="select-field" htmlFor="invoice-status">
           <span>Payment</span>
           <select id="invoice-status" value={statusFilter} disabled={documentFilter !== "ISSUED" && documentFilter !== "ALL"} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="ALL">All statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
          </select>
         </label>
         <div className="invoice-filter-chips" aria-label="Invoice status filters">
           <span>Document status</span>
           <button className={documentFilter === "ALL" ? "is-active" : ""} type="button" onClick={() => setDocumentFilter("ALL")}>All documents</button>
           <button className={documentFilter === "DRAFT" ? "is-active" : ""} type="button" onClick={() => setDocumentFilter("DRAFT")}>Draft</button>
           <button className={documentFilter === "ISSUED" ? "is-active" : ""} type="button" onClick={() => setDocumentFilter("ISSUED")}>Issued</button>
           <button className={documentFilter === "CANCELLED" ? "is-active" : ""} type="button" onClick={() => setDocumentFilter("CANCELLED")}>Cancelled</button>
           <span>Payment status</span>
           <button className={statusFilter === "ALL" ? "is-active" : ""} type="button" onClick={() => setStatusFilter("ALL")}>All payments</button>
           <button className={statusFilter === "UNPAID" ? "is-active" : ""} type="button" onClick={() => setStatusFilter("UNPAID")} disabled={documentFilter !== "ISSUED" && documentFilter !== "ALL"}>Unpaid</button>
           <button className={statusFilter === "PARTIALLY_PAID" ? "is-active" : ""} type="button" onClick={() => setStatusFilter("PARTIALLY_PAID")} disabled={documentFilter !== "ISSUED" && documentFilter !== "ALL"}>Partial</button>
           <button className={statusFilter === "PAID" ? "is-active" : ""} type="button" onClick={() => setStatusFilter("PAID")} disabled={documentFilter !== "ISSUED" && documentFilter !== "ALL"}>Paid</button>
         </div>
      </div>

      {!visibleInvoices.length ? (
        <EmptyState
          title="No invoices found"
          message="Try a different search or clear the current filters."
          actionLabel="Clear filters"
           onAction={() => { setQuery(""); setStatusFilter("ALL"); setDocumentFilter("ALL"); }}
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
                {visibleInvoices.map((invoice) => <InvoiceTableRow key={invoice.id} invoice={invoice} onView={onViewInvoice} onEdit={onEditInvoice} onDelete={onDeleteInvoice} onPayment={onRecordPayment} />)}
              </tbody>
            </table>
          </div>

          <div className="record-cards">
             {visibleInvoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} onView={onViewInvoice} onEdit={onEditInvoice} onDelete={onDeleteInvoice} onPayment={onRecordPayment} />)}
          </div>

          <Pagination page={page} totalPages={totalPages} totalResults={totalResults} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}

function InvoiceTableRow({ invoice, onView, onEdit, onDelete, onPayment }: { invoice: Invoice; onView: (invoice: Invoice) => void; onEdit: (invoice: Invoice) => void; onDelete: (invoice: Invoice) => void; onPayment: (id: number) => void }) {
  const locked = Number(invoice.amountPaid) > 0 || invoice.documentStatus === "CANCELLED";
  return (
    <tr>
      <td><strong>{invoice.number}</strong><span className="table-subline">Sales invoice</span></td>
      <td>{invoice.customerName}</td>
      <td>{invoice.date}</td>
      <td className="money">LKR {formatMoney(invoice.total)}</td>
       <td className="money">{invoice.documentStatus === "ISSUED" ? `LKR ${formatMoney(invoice.balance)}` : "—"}</td>
       <td><InvoiceStatusBadges documentStatus={invoice.documentStatus} paymentStatus={invoice.paymentStatus} /></td>
       <td><InvoiceActions invoice={invoice} locked={locked} onView={onView} onEdit={onEdit} onDelete={onDelete} onPayment={onPayment} /></td>
    </tr>
  );
}

function InvoiceCard({ invoice, onView, onEdit, onDelete, onPayment }: { invoice: Invoice; onView: (invoice: Invoice) => void; onEdit: (invoice: Invoice) => void; onDelete: (invoice: Invoice) => void; onPayment: (id: number) => void }) {
  const locked = Number(invoice.amountPaid) > 0 || invoice.documentStatus === "CANCELLED";
  return (
    <details className="invoice-list-item">
      <summary><span><strong>{invoice.customerName}</strong><small>{invoice.documentStatus === "ISSUED" ? `Balance LKR ${formatMoney(invoice.balance)}` : invoice.documentStatus === "DRAFT" ? "Draft — not sent" : "Cancelled"}</small></span><span className="invoice-list-item__value"><strong>LKR {formatMoney(invoice.total)}</strong><InvoiceStatusBadges documentStatus={invoice.documentStatus} paymentStatus={invoice.paymentStatus} /></span></summary>
      <div className="invoice-list-item__detail"><dl><div><dt>Invoice number</dt><dd>{invoice.number}</dd></div><div><dt>Date</dt><dd>{invoice.date}</dd></div></dl><InvoiceActions invoice={invoice} locked={locked} onView={onView} onEdit={onEdit} onDelete={onDelete} onPayment={onPayment} /></div>
    </details>
  );
}

function InvoiceActions({ invoice, locked, onView, onEdit, onDelete, onPayment }: { invoice: Invoice; locked: boolean; onView: (invoice: Invoice) => void; onEdit: (invoice: Invoice) => void; onDelete: (invoice: Invoice) => void; onPayment: (id: number) => void }) {
  return (
    <div className="record-actions">
       <button className="button button--primary" type="button" onClick={() => onView(invoice)}>Open invoice</button>
       {!locked && <button className="button button--text" type="button" onClick={() => onEdit(invoice)}>Edit</button>}
       {invoice.documentStatus === "ISSUED" && invoice.paymentStatus !== "PAID" && <button className="button button--secondary" type="button" onClick={() => onPayment(invoice.id)}>Record payment</button>}
       {!locked && invoice.documentStatus !== "CANCELLED" && <button className="button button--text" type="button" onClick={() => onDelete(invoice)}>Delete</button>}
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
