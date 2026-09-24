import type { Invoice } from "../types";
import { formatMoney } from "../utils";

export function InvoiceInsights({ invoices }: { invoices: Invoice[] }) {
  const total = invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const collected = invoices.reduce((sum, invoice) => sum + Number(invoice.amountPaid), 0);
  const percent = total > 0 ? Math.min(100, Math.max(0, collected / total * 100)) : 0;
  const maximum = Math.max(...invoices.map((invoice) => Number(invoice.total)), 1);
  return (
    <div className="insights-grid">
      <section className="insight-panel" aria-labelledby="sales-chart-title">
        <div className="insight-heading"><div><h3 id="sales-chart-title">Sales snapshot</h3><p>Invoice values on this page</p></div><span className="chart-legend"><i /> Invoice total</span></div>
        {invoices.length && total > 0 ? <div className="sales-bars">{invoices.map((invoice) => <div className="sales-bar" key={invoice.id}>
          <div className="sales-bar__label"><strong>{invoice.customerName}</strong><span>{invoice.number}</span></div>
          <div className="sales-bar__track"><div style={{ width: `${Number(invoice.total) / maximum * 100}%` }} /></div>
          <span className="sales-bar__value">LKR {formatMoney(invoice.total)}</span>
        </div>)}</div> : <p className="chart-empty">No issued sales.</p>}
        <div className="insight-footnote">Current page <span>{invoices.length} invoices</span></div>
      </section>
      <section className="insight-panel collection-panel" aria-labelledby="collection-title">
        <div className="insight-heading"><div><h3 id="collection-title">Collection progress</h3><p>Payments against this page’s sales</p></div><span className="round-arrow" aria-hidden="true">↗</span></div>
        <div className="collection-body"><div className="collection-ring" role="img" aria-label={`${percent.toFixed(1)} percent of invoice value collected`} style={{ background: `conic-gradient(var(--accent) ${percent}%, #2b3840 0)` }}><div><strong>{percent.toFixed(1)}<small>%</small></strong><span>Collected</span></div></div><div className="collection-legend"><span><i />Received</span><strong>LKR {formatMoney(collected.toFixed(2))}</strong><span><i className="legend-outstanding" />Outstanding</span><strong>LKR {formatMoney(Math.max(0, total - collected).toFixed(2))}</strong></div></div>
      </section>
    </div>
  );
}
