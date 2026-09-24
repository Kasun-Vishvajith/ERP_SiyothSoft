import { useEffect, useRef } from "react";
import type { ViewName } from "../types";
import { NavIcon } from "./NavIcon";

type SidebarProps = {
  activeView: ViewName;
  username: string;
  mobileOpen?: boolean;
  onClose?: () => void;
  onLogout: () => void;
  onNavigate: (view: ViewName) => void;
};

const navigation: Array<{ label: string; items: Array<{ label: string; view: ViewName }> }> = [
  { label: "Overview", items: [{ label: "Home", view: "home" }] },
  { label: "Sales", items: [{ label: "Invoices", view: "invoices" }, { label: "Customers", view: "customers" }] },
  { label: "Purchasing", items: [{ label: "Purchases", view: "purchases" }, { label: "Suppliers", view: "suppliers" }] },
  { label: "Stock", items: [{ label: "Inventory", view: "inventory" }] },
  { label: "Money", items: [{ label: "Payments", view: "payments" }] },
];

export function Sidebar({ activeView, username, mobileOpen = false, onClose, onLogout, onNavigate }: SidebarProps) {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLButtonElement>("button")?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const buttons = panel?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    panel?.addEventListener("keydown", trap);
    return () => panel?.removeEventListener("keydown", trap);
  }, [mobileOpen]);
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <aside
      ref={panelRef}
      role={mobileOpen ? "dialog" : undefined}
      aria-modal={mobileOpen ? true : undefined}
      className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}
      aria-label="Application navigation"
      aria-hidden={onClose ? !mobileOpen : undefined}
    >
      <div className="sidebar__brand">
        <span className="brand-mark" aria-hidden="true">S</span>
        <div>
          <strong>SiyothSoft</strong>
          <span>ERP workspace</span>
        </div>
        {onClose && (
          <button className="icon-button sidebar__close" type="button" onClick={onClose} aria-label="Close navigation">
            ×
          </button>
        )}
      </div>

      <nav className="sidebar__nav">
        {navigation.map((group) => <div className="sidebar__group" key={group.label}><div className="sidebar__section-label">{group.label}</div>{group.items.map((item) => (
          <button
            className={`sidebar__link ${activeView === item.view ? "sidebar__link--active" : ""}`}
            type="button"
            key={item.view}
            aria-current={activeView === item.view ? "page" : undefined}
            onClick={() => {
              onNavigate(item.view);
              onClose?.();
            }}
          >
            <span className="nav-icon"><NavIcon view={item.view} /></span>
            {item.label}
            {activeView === item.view && <span className="nav-arrow" aria-hidden="true">↗</span>}
          </button>
        ))}</div>)}
      </nav>

      <div className="sidebar__footer">
        <div className="user-chip">
          <span className="avatar" aria-hidden="true">{initials}</span>
          <div>
            <strong>{username}</strong>
            <span>Signed in</span>
          </div>
          <button className="button button--text user-chip__logout" type="button" onClick={onLogout}>Sign out</button>
        </div>
      </div>
    </aside>
  );
}
