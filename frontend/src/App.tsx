import { useEffect, useRef, useState } from "react";
import { ThemeControl } from "./components/ThemeControl";
import { InvoiceForm } from "./components/InvoiceForm";
import { InvoiceDocument } from "./components/InvoiceDocument";
import { Sidebar } from "./components/Sidebar";
import { InvoicesPage } from "./pages/InvoicesPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { LoginPage } from "./pages/LoginPage";
import { InventoryPage } from "./pages/InventoryPage";
import { CustomersPage } from "./pages/CustomersPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { HomePage } from "./pages/HomePage";
import { PurchasesPage } from "./pages/PurchasesPage";
import { BottomNav } from "./components/BottomNav";
import { currentUser, HttpError, login, logout, request } from "./api";
import type { Invoice, Payment, Purchase, ViewName } from "./types";
import "./styles.scss";

const pageTitles: Record<ViewName, { title: string; eyebrow: string }> = {
  home: { title: "Home", eyebrow: "Overview" },
  inventory: { title: "Inventory", eyebrow: "Stock control" },
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
  const [activeView, setActiveView] = useState<ViewName>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceReloadKey, setInvoiceReloadKey] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseReloadKey, setPurchaseReloadKey] = useState(0);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();
  const [invoiceDocument, setInvoiceDocument] = useState<Invoice | undefined>();
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | undefined>();
  const [notice, setNotice] = useState("");
  const [newPurchaseKey, setNewPurchaseKey] = useState(0);
  const [newProductKey, setNewProductKey] = useState(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const navigationTrigger = useRef<HTMLElement | null>(null);

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
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    if (mainRef.current) mainRef.current.inert = mobileNavOpen;
    if (!mobileNavOpen) navigationTrigger.current?.focus();
    return () => { document.body.style.overflow = ""; if (mainRef.current) mainRef.current.inert = false; };
  }, [mobileNavOpen]);

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

  function openNavigation() {
    navigationTrigger.current = document.activeElement as HTMLElement;
    setMobileNavOpen(true);
  }

  const currentPage = pageTitles[activeView];

  function resetScroll() {
    window.scrollTo({ top: 0 });
  }

  if (authState === "loading") {
    return <main className="auth-shell"><p className="auth-loading">Checking your session…</p></main>;
  }

  if (authState === "signed-out" || authState === "error") {
    return <LoginPage busy={loginBusy} error={authMessage || undefined} onSubmit={handleLogin} />;
  }

  function navigate(view: ViewName) {
    setMobileNavOpen(false);
    setActiveView(view);
    setInvoiceFormOpen(false);
    setInvoiceDocument(undefined);
    setNotice("");
    if (view !== "payments") setPaymentTarget(undefined);
    resetScroll();
  }

  function openNewInvoice() {
    setEditingInvoice(undefined);
    setInvoiceDocument(undefined);
    setInvoiceFormOpen(true);
    setActiveView("invoices");
    setNotice("");
    resetScroll();
  }

  function openNewPurchase() {
    setNewPurchaseKey((value) => value + 1);
    navigate("purchases");
    window.setTimeout(() => setNewPurchaseKey(0), 0);
  }

  function openNewProduct() {
    setNewProductKey((value) => value + 1);
    navigate("inventory");
  }

  async function openEditInvoice(invoice: Invoice) {
    try {
      const detail = await request<Invoice>(`/invoices/${invoice.id}`);
      setEditingInvoice(detail);
      setInvoiceDocument(undefined);
      setInvoiceFormOpen(true);
      setActiveView("invoices");
      setNotice("");
      resetScroll();
    } catch (caught: unknown) {
      setInvoiceError(caught instanceof Error ? caught.message : "Could not load invoice details");
    }
  }

  async function openInvoiceDocument(invoice: Invoice) {
    try {
      const detail = await request<Invoice>(`/invoices/${invoice.id}`);
      setInvoiceDocument(detail);
      setInvoiceFormOpen(false);
      setEditingInvoice(undefined);
      setActiveView("invoices");
      setNotice("");
      resetScroll();
    } catch (caught: unknown) {
      setInvoiceError(caught instanceof Error ? caught.message : "Could not load invoice");
    }
  }

  function openPayment(target: PaymentTarget) {
    setPaymentTarget(target);
    setActiveView("payments");
    setInvoiceFormOpen(false);
    setNotice("");
    resetScroll();
  }

  function saveInvoice(nextInvoice: Invoice) {
    setInvoices((current) => current.some((invoice) => invoice.id === nextInvoice.id)
      ? current.map((invoice) => invoice.id === nextInvoice.id ? nextInvoice : invoice)
      : [nextInvoice, ...current]);
    setInvoiceFormOpen(false);
    setEditingInvoice(undefined);
    setInvoiceDocument(nextInvoice);
    setNotice(`${nextInvoice.number} was saved. `);
    setInvoiceReloadKey((value) => value + 1);
  }

  async function cancelInvoice() {
    if (!invoiceDocument || !window.confirm(`Cancel ${invoiceDocument.number}?`)) return;
    try {
      const cancelled = await request<Invoice>(`/invoices/${invoiceDocument.id}/cancel`, { method: "POST" });
      setInvoiceDocument(cancelled);
      setInvoiceReloadKey((value) => value + 1);
      setNotice(`${cancelled.number} was cancelled.`);
    } catch (caught: unknown) {
      setInvoiceError(caught instanceof Error ? caught.message : "Could not cancel invoice");
    }
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
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Sidebar activeView={activeView} username={username} onLogout={handleLogout} onNavigate={navigate} />
      <div className="mobile-nav-layer">
        {mobileNavOpen && <button className="mobile-nav-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
        {mobileNavOpen && <Sidebar activeView={activeView} username={username} mobileOpen onLogout={handleLogout} onNavigate={navigate} onClose={() => setMobileNavOpen(false)} />}
      </div>

      <main className="main-content" ref={mainRef} id="main-content">
        <header className="topbar">
          <button ref={menuButtonRef} className="menu-button" type="button" aria-label="Open navigation" aria-expanded={mobileNavOpen} onClick={openNavigation}><span aria-hidden="true">☰</span></button>
          <div className="topbar__brand"><span className="brand-mark" aria-hidden="true">S</span><strong>SiyothSoft<span>ERP</span></strong></div>
          <div className="topbar__title"><span className="eyebrow">{currentPage.eyebrow}</span><h1>{invoiceFormOpen ? (editingInvoice ? "Edit invoice" : "New invoice") : currentPage.title}</h1></div>
          <div className="topbar__right"><ThemeControl /><span className="avatar avatar--small" aria-label={`Signed in as ${username}`}>{username.slice(0, 2).toUpperCase()}</span></div>
        </header>

        <div className="content-wrap">
          {activeView === "home" && <HomePage username={username} onNavigate={navigate} onNewInvoice={openNewInvoice} onNewPurchase={openNewPurchase} onNewProduct={openNewProduct} onOpenInvoice={openInvoiceDocument} />}
          {activeView === "invoices" && invoiceFormOpen && <InvoiceForm invoice={editingInvoice} onCancel={() => { setInvoiceFormOpen(false); setEditingInvoice(undefined); }} onSave={saveInvoice} />}
          {activeView === "invoices" && !invoiceFormOpen && invoiceDocument && <InvoiceDocument invoice={invoiceDocument} onBack={() => setInvoiceDocument(undefined)} onEdit={() => openEditInvoice(invoiceDocument)} onRecordPayment={() => openPayment({ kind: "invoice", id: invoiceDocument.id })} onCancel={cancelInvoice} />}
          {activeView === "invoices" && !invoiceFormOpen && !invoiceDocument && <InvoicesPage reloadKey={invoiceReloadKey} onRowsLoaded={setInvoices} actionError={invoiceError} notice={notice} onNewInvoice={openNewInvoice} onEditInvoice={openEditInvoice} onViewInvoice={openInvoiceDocument} onDeleteInvoice={deleteInvoice} onRecordPayment={(id) => openPayment({ kind: "invoice", id })} />}
          {activeView === "payments" && <PaymentsPage invoices={invoices} purchases={purchases} payments={payments} initialTarget={paymentTarget} onSavePayment={savePayment} />}
          {activeView === "inventory" && <InventoryPage openManageKey={newProductKey} />}
          {activeView === "customers" && <CustomersPage />}
          {activeView === "suppliers" && <SuppliersPage />}
          {activeView === "purchases" && <PurchasesPage reloadKey={purchaseReloadKey} openNewKey={newPurchaseKey} onRowsLoaded={setPurchases} onRecordPayment={(id) => openPayment({ kind: "purchase", id })} />}
        </div>
      </main>
      <BottomNav activeView={activeView} onNavigate={navigate} onMore={openNavigation} menuOpen={mobileNavOpen} />
    </div>
  );
}
