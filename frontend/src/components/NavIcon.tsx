import type { ViewName } from "../types";

const paths: Record<ViewName, string> = {
  home: "M3 10.5 12 3l9 7.5 M5 9v12h14V9 M9 21v-7h6v7",
  inventory: "M3 7h18v14H3z M3 7l3-4h12l3 4 M9 11h6 M9 3v4 M15 3v4",
  products: "M12 3l9 5v9l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v9 M7.5 5.5l9 5",
  invoices: "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h3",
  payments: "M3 6h18v14H3z M3 10h18 M15 15h3 M6 3h12",
  purchases: "M3 3h2l3 12h11l2-8H6 M9 20h.01 M18 20h.01",
  customers: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M20 21v-2a4 4 0 0 0-3-4 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 3a4 4 0 0 1 0 8",
  suppliers: "M3 21V7l9-4 9 4v14 M1 21h22 M7 10h2 M15 10h2 M7 14h2 M15 14h2 M10 21v-4h4v4",
};

export function NavIcon({ view }: { view: ViewName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[view]} /></svg>;
}
