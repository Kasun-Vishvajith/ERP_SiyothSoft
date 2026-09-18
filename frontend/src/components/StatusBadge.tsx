import { statusLabel } from "../utils";
import type { Invoice } from "../types";

export function StatusBadge({ status }: { status: Invoice["paymentStatus"] }) {
  return <span className={`status-badge status-badge--${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}
