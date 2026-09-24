import { useEffect, useMemo, useState } from "react";
import { request } from "../api";
import { NavIcon } from "../components/NavIcon";
import { EmptyState } from "../components/EmptyState";
import { InvoiceStatusBadges } from "../components/InvoiceStatus";
import { formatMoney } from "../utils";
import type { Invoice, InvoiceSummary, PageResult, Product, ViewName } from "../types";

type HomePageProps = {
  username: string;
  onNavigate: (view: ViewName) => void;
  onNewInvoice: () => void;
  onNewPurchase: () => void;
  onNewProduct: () => void;
  onOpenInvoice: (invoice: Invoice) => void;
};

function toInvoice(summary: InvoiceSummary): Invoice {
  return { ...summary, notes: "", items: [] };
}

export function HomePage({ username, onNavigate, onNewInvoice, onNewPurchase, onNewProduct, onOpenInvoice }: HomePageProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      request<PageResult<InvoiceSummary>>("/invoices?page=0&size=5&status=ALL&documentStatus=ALL", { signal: controller.signal }),
      request<PageResult<Product>>("/products?page=0&size=100", { signal: controller.signal }),
    ]).then(([invoicePage, productPage]) => {
      setInvoices(invoicePage.content.map(toInvoice));
      setProducts(productPage.content);
    }).catch((caught: unknown) => {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load home overview");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  const issuedInvoices = useMemo(() => invoices.filter((invoice) => invoice.documentStatus === "ISSUED"), [invoices]);
  const lowStock = products.filter((product) => product.stockCount <= 5);
  const outstanding = issuedInvoices.reduce((sum, invoice) => sum + Number(invoice.balance), 0);
  const collected = issuedInvoices.reduce((sum, invoice) => sum + Number(invoice.amountPaid), 0);
  const today = new Intl.DateTimeFormat("en-LK", { dateStyle: "medium" }).format(new Date());

  if (loading) return <section className="page-section" aria-busy="true" aria-label="Loading home"><div className="skeleton-toolbar" /><div className="skeleton-panel"><span className="skeleton-row" /><span className="skeleton-row" /><span className="skeleton-row" /></div></section>;
  if (error) return <section className="page-section"><div className="alert alert--error" role="alert">{error}</div></section>;

  const unpaid = issuedInvoices.filter((invoice) => invoice.paymentStatus !== "PAID").length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return <section className="page-section home-page">
    <header className="dashboard-heading"><div><span className="eyebrow">{today}</span><h2>{greeting},<br /><strong>{username}.</strong></h2><p>Let’s get down to business.</p></div><button className="button button--primary" type="button" onClick={onNewInvoice}>+ New invoice</button></header>
    <div className="overview-caption"><h3>Your overview</h3><span>Latest {invoices.length} invoices · {products.length} loaded products</span></div>
    <section className="home-kpis" aria-label="Loaded records summary">
      <SummaryCard tone="blue" label="To collect" value={formatMoney(outstanding.toFixed(2))} hint={`${unpaid} loaded invoice${unpaid === 1 ? "" : "s"} awaiting payment`} currency onClick={() => onNavigate("invoices")} />
      <SummaryCard tone="green" label="Received" value={formatMoney(collected.toFixed(2))} hint="From loaded issued invoices" currency onClick={() => onNavigate("payments")} />
      <SummaryCard tone="neutral" label="Recent invoices" value={String(invoices.length)} hint="View your sales" onClick={() => onNavigate("invoices")} />
      <SummaryCard tone="peach" label="Low stock" value={String(lowStock.length)} hint="Of up to 100 loaded products" onClick={() => onNavigate("inventory")} />
    </section>
    <section className="action-strip" aria-labelledby="quick-actions-title"><h3 id="quick-actions-title">Make it happen</h3><div className="quick-actions__buttons">
      <button className="quick-action" type="button" onClick={onNewInvoice}><span><NavIcon view="invoices" /></span><b>New invoice</b></button>
      <button className="quick-action" type="button" onClick={() => onNavigate("payments")}><span><NavIcon view="payments" /></span><b>Payment</b></button>
      <button className="quick-action" type="button" onClick={onNewPurchase}><span><NavIcon view="purchases" /></span><b>Purchase</b></button>
      <button className="quick-action" type="button" onClick={onNewProduct}><span><NavIcon view="products" /></span><b>Product</b></button>
    </div></section>
    <div className="home-focus-grid">
      <section className="focus-panel"><div className="panel-heading"><div><span className="eyebrow">Sales</span><h3>Latest invoices</h3></div><button className="text-action" type="button" onClick={() => onNavigate("invoices")}>View all ↗</button></div>{invoices.length ? <div className="home-invoice-list">{invoices.slice(0, 4).map(invoice => <button className="home-invoice" type="button" key={invoice.id} onClick={() => onOpenInvoice(invoice)}><span className="invoice-monogram" aria-hidden="true"><NavIcon view="invoices" /></span><span className="home-invoice__name"><strong>{invoice.customerName}</strong><small>{invoice.number} · {invoice.date}</small></span><span className="home-invoice__value"><strong>{formatMoney(invoice.total)}</strong><InvoiceStatusBadges documentStatus={invoice.documentStatus} paymentStatus={invoice.paymentStatus} /></span></button>)}</div> : <EmptyState title="Your first sale starts here" message="Create an invoice to start tracking customer payments." actionLabel="New invoice" onAction={onNewInvoice} />}<p className="panel-footnote">All amounts in LKR</p></section>
      <section className="focus-panel stock-focus"><div className="panel-heading"><div><span className="eyebrow">Inventory</span><h3>A little attention</h3></div><button className="text-action" type="button" onClick={() => onNavigate("inventory")}>View stock ↗</button></div>{lowStock.length ? <div className="attention-list">{lowStock.slice(0, 4).map(product => <button type="button" onClick={() => onNavigate("inventory")} key={product.id}><span className="attention-icon" aria-hidden="true"><NavIcon view="products" /></span><span><strong>{product.name}</strong><small>{product.stockCount === 0 ? "Out of stock" : `${product.stockCount} units left`}</small></span><span aria-hidden="true">↗</span></button>)}</div> : <EmptyState title="Ready for business" message="No low-stock items in the loaded products." />}</section>
    </div>
    <section className="analytics-summary" aria-label="Loaded sales totals"><div><span>Loaded issued invoice total</span><strong>LKR {formatMoney(issuedInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0).toFixed(2))}</strong></div><div><span>Collected from these invoices</span><strong>{issuedInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0) > 0 ? Math.min(100, collected / issuedInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0) * 100).toFixed(0) : "0"}%</strong></div></section>
  </section>;
}

function SummaryCard({ tone, label, value, hint, currency, onClick }: { tone: "blue" | "green" | "neutral" | "peach"; label: string; value: string; hint: string; currency?: boolean; onClick: () => void }) {
  return <button className={`kpi-card kpi-card--${tone}`} type="button" onClick={onClick}><span>{label}</span><strong>{currency && <small>LKR</small>}{value}</strong><small>{hint}</small><i aria-hidden="true">↗</i></button>;
}
