import { useEffect, useState } from "react";
import { InvoiceForm } from "./components/InvoiceForm";
import { Sidebar } from "./components/Sidebar";
import { InvoicesPage } from "./pages/InvoicesPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { LoginPage } from "./pages/LoginPage";
import { ProductsPage } from "./pages/ProductsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { PurchasesPage } from "./pages/PurchasesPage";
import { currentUser, HttpError, login, logout, request } from "./api";
import type { Invoice, Payment, Purchase, ViewName } from "./types";
import "./styles.scss";

const pageTitles: Record<ViewName, { title: string; eyebrow: string }> = {
  products: { title: "Products", eyebrow: "Catalogue" },
  invoices: { title: "Invoices", eyebrow: "Sales workspace" },
  payments: { title: "Payments", eyebrow: "Cash movement" },
  purchases: { title: "Purchases", eyebrow: "Buying workspace" },
  customers: { title: "Customers", eyebrow: "Directory" },
  suppliers: { title: "Suppliers", eyebrow: "Directory" },
};

type PaymentTarget = { kind: "invoice" | "purchase"; id: number };

export default function App() {
  const [authState, setAuthState] = useState<"loading" | "signed-out" | "signed-in" | "error">("loading");
  const [authMessage, setAuthMessage] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [activeView, setActiveView] = useState<ViewName>("invoices");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceReloadKey, setInvoiceReloadKey] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseReloadKey, setPurchaseReloadKey] = useState(0);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | undefined>();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    currentUser()
      .then((user) => {
        setUsername(user.username);
        setAuthState("signed-in");
      })
      .catch((error: unknown) => {
        if (error instanceof HttpError && error.status === 401) {
          setAuthState("signed-out");
          return;
        }
        setAuthMessage("The backend is unavailable. Start the API and try again.");
        setAuthState("error");
      });
  }, []);

  useEffect(() => {
    function handleSessionExpired() {
      setUsername("");
      setAuthMessage("Your session expired. Please sign in again.");
      setAuthState("signed-out");
    }
    window.addEventListener("erp-session-expired", handleSessionExpired);
    return () => window.removeEventListener("erp-session-expired", handleSessionExpired);
  }, []);

  async function handleLogin(nextUsername: string, password: string) {
    setAuthMessage("");
    setLoginBusy(true);
    try {
      await login(nextUsername, password);
      const user = await currentUser();
      setUsername(user.username);
      setAuthState("signed-in");
    } catch (error: unknown) {
      if (error instanceof HttpError && error.status === 401) {
        setAuthMessage("That username or password was not accepted.");
      } else {
        setAuthMessage("Could not reach the backend. Check the API and try again.");
      }
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setUsername("");
      setAuthState("signed-out");
      setAuthMessage("");
    }
  }

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const currentPage = pageTitles[activeView];

  if (authState === "loading") {
    return <main className="auth-shell"><p className="auth-loading">Checking your session…</p></main>;
  }

  if (authState === "signed-out" || authState === "error") {
    return <LoginPage busy={loginBusy} error={authMessage || undefined} onSubmit={handleLogin} />;
  }

  function navigate(view: ViewName) {
    setActiveView(view);
    setInvoiceFormOpen(false);
    setNotice("");
    if (view !== "payments") setPaymentTarget(undefined);
  }

  function openNewInvoice() {
    setEditingInvoice(undefined);
    setInvoiceFormOpen(true);
    setActiveView("invoices");
    setNotice("");
  }

  async function openEditInvoice(invoice: Invoice) {
    try {
      const detail = await request<Invoice>(`/invoices/${invoice.id}`);
      setEditingInvoice(detail);
      setInvoiceFormOpen(true);
      setActiveView("invoices");
      setNotice("");
    } catch (caught: unknown) {
      setInvoiceError(caught instanceof Error ? caught.message : "Could not load invoice details");
    }
  }

  function openPayment(target: PaymentTarget) {
    setPaymentTarget(target);
    setActiveView("payments");
    setInvoiceFormOpen(false);
    setNotice("");
  }

  function saveInvoice(nextInvoice: Invoice) {
    setInvoices((current) => current.some((invoice) => invoice.id === nextInvoice.id)
      ? current.map((invoice) => invoice.id === nextInvoice.id ? nextInvoice : invoice)
      : [nextInvoice, ...current]);
    setInvoiceFormOpen(false);
    setEditingInvoice(undefined);
    setNotice(`${nextInvoice.number} was saved. The total and snapshots came from the server.`);
    setInvoiceReloadKey((value) => value + 1);
  }

  async function deleteInvoice(invoice: Invoice) {
    if (!window.confirm(`Delete ${invoice.number}?`)) return;
    try {
      await request<void>(`/invoices/${invoice.id}`, { method: "DELETE" });
      setNotice(`${invoice.number} was deleted.`);
      setInvoiceReloadKey((value) => value + 1);
    } catch (caught: unknown) {
      setInvoiceError(caught instanceof Error ? caught.message : "Could not delete invoice");
    }
  }

  function savePayment(payment: Payment) {
    setPayments((current) => [payment, ...current]);
    if (payment.invoiceId !== null) {
      setInvoices((current) => current.map((invoice) => {
        if (invoice.id !== payment.invoiceId) return invoice;
        const amountPaid = (Number(invoice.amountPaid) + Number(payment.amount)).toFixed(2);
        const balance = Math.max(0, Number(invoice.total) - Number(amountPaid)).toFixed(2);
        return { ...invoice, amountPaid, balance, paymentStatus: balance === "0.00" ? "PAID" : "PARTIALLY_PAID" };
      }));
      setInvoiceReloadKey((value) => value + 1);
    } else {
      setPurchaseReloadKey((value) => value + 1);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} username={username} onLogout={handleLogout} onNavigate={navigate} />
      <div className="mobile-nav-layer">
        {mobileNavOpen && <button className="mobile-nav-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
        {mobileNavOpen && <Sidebar activeView={activeView} username={username} mobileOpen onLogout={handleLogout} onNavigate={navigate} onClose={() => setMobileNavOpen(false)} />}
      </div>

      <main className="main-content">
        <header className="topbar">
          <button className="menu-button" type="button" aria-label="Open navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)}><span aria-hidden="true">☰</span></button>
          <div className="topbar__title"><span className="eyebrow">{currentPage.eyebrow}</span><h1>{invoiceFormOpen ? (editingInvoice ? "Edit invoice" : "New invoice") : currentPage.title}</h1></div>
          <div className="topbar__right"><span className="status-dot" aria-hidden="true" /> <span className="topbar__online">Local workspace</span><span className="avatar avatar--small" aria-hidden="true">KS</span></div>
        </header>

        <div className="content-wrap">
          {activeView === "invoices" && invoiceFormOpen && <InvoiceForm invoice={editingInvoice} onCancel={() => { setInvoiceFormOpen(false); setEditingInvoice(undefined); }} onSave={saveInvoice} />}
          {activeView === "invoices" && !invoiceFormOpen && <InvoicesPage reloadKey={invoiceReloadKey} onRowsLoaded={setInvoices} actionError={invoiceError} notice={notice} onNewInvoice={openNewInvoice} onEditInvoice={openEditInvoice} onDeleteInvoice={deleteInvoice} onRecordPayment={(id) => openPayment({ kind: "invoice", id })} />}
          {activeView === "payments" && <PaymentsPage invoices={invoices} purchases={purchases} payments={payments} initialTarget={paymentTarget} onSavePayment={savePayment} />}
          {activeView === "products" && <ProductsPage />}
          {activeView === "customers" && <CustomersPage />}
          {activeView === "suppliers" && <SuppliersPage />}
          {activeView === "purchases" && <PurchasesPage reloadKey={purchaseReloadKey} onRowsLoaded={setPurchases} onRecordPayment={(id) => openPayment({ kind: "purchase", id })} />}
        </div>
      </main>
    </div>
  );
}
