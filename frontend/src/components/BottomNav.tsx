import { useEffect, useRef, type CSSProperties } from "react";
import type { ViewName } from "../types";
import { NavIcon } from "./NavIcon";
const items: Array<{ label: string; view: ViewName }> = [
  { label: "Home", view: "home" }, { label: "Sales", view: "invoices" },
  { label: "Stock", view: "inventory" }, { label: "Payments", view: "payments" },
];
export function BottomNav({ activeView, onNavigate, onMore, menuOpen }: { activeView: ViewName; onNavigate: (view: ViewName) => void; onMore: () => void; menuOpen: boolean }) {
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => { if (navRef.current) navRef.current.inert = menuOpen; }, [menuOpen]);
  const index = items.findIndex(item => item.view === activeView);
  return <nav ref={navRef} className="bottom-nav" aria-label="Quick navigation" style={{ "--active-index": index < 0 ? 4 : index } as CSSProperties}>
    <span className="bottom-nav__indicator" aria-hidden="true" />
    {items.map(item => <button className={`bottom-nav__item ${activeView === item.view ? "bottom-nav__item--active" : ""}`} key={item.view} type="button" aria-current={activeView === item.view ? "page" : undefined} onClick={() => onNavigate(item.view)}><NavIcon view={item.view} /><span>{item.label}</span></button>)}
    <button className={`bottom-nav__item ${index < 0 ? "bottom-nav__item--active" : ""}`} type="button" aria-label="More navigation" aria-expanded={menuOpen} onClick={onMore}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="15" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/></svg><span>More</span></button>
  </nav>;
}
