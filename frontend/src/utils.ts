import type { PaymentStatus } from "./types";

export function formatMoney(value: string): string {
  return new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function statusLabel(status: PaymentStatus): string {
  return status === "PARTIALLY_PAID" ? "Partially paid" : status === "PAID" ? "Paid" : "Unpaid";
}
