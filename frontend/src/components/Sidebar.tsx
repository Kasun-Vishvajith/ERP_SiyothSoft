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

const navigation: Array<{ label: string; view: ViewName; accent?: "lilac" }> = [
  { label: "Inventory", view: "inventory" },
  { label: "Products", view: "products" },
  { label: "Invoices", view: "invoices" },
  { label: "Payments", view: "payments" },
  { label: "Purchases", view: "purchases", accent: "lilac" },
  { label: "Customers", view: "customers" },
  { label: "Suppliers", view: "suppliers" },
];

export function Sidebar({ activeView, username, mobileOpen = false, onClose, onLogout, onNavigate }: SidebarProps) {
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <aside
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

      <div className="sidebar__section-label">Workspace</div>
      <nav className="sidebar__nav">
        {navigation.map((item) => (
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
            <span className="nav-dot"><NavIcon view={item.view} /></span>
            {item.label}
            {activeView === item.view && <span className="nav-arrow" aria-hidden="true">↗</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__tip">
          <span className="tip-icon" aria-hidden="true">✦</span>
          <div>
            <strong>A little more clarity.</strong>
            <p>Your stock, sales, and finances. Together in one workspace.</p>
          </div>
        </div>
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
