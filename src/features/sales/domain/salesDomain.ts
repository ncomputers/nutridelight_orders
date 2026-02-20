import type { SalesInvoiceLine, SalesTotals } from "@/features/sales/types";

export const round2 = (value: number) => Number(value.toFixed(2));

export const makeInvoiceNo = (dateIso: string) =>
  `SI-${dateIso.replaceAll("-", "")}-${Math.floor(10000 + Math.random() * 90000)}`;

export const computeLineTotal = (qty: number, unitPrice: number) =>
  round2(Math.max(0, qty || 0) * Math.max(0, unitPrice || 0));

export const computeSalesTotals = (
  workingLines: SalesInvoiceLine[],
  discountAmount: number,
  otherCharges: number,
): SalesTotals => {
  const subtotal = round2(
    workingLines.reduce((sum, line) => sum + computeLineTotal(Number(line.qty) || 0, Number(line.unit_price) || 0), 0),
  );
  const discount = Math.max(0, Number(discountAmount) || 0);
  const other = Math.max(0, Number(otherCharges) || 0);
  const grand = round2(Math.max(0, subtotal - discount + other));
  return { subtotal, discount, other, grand };
};

export const computeDueAndPaymentStatus = (grand: number, paid: number) => {
  const due = round2(Math.max(0, (Number(grand) || 0) - (Number(paid) || 0)));
  const status = due <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
  return { due, status };
};

export const applyPayment = (currentPaid: number, grand: number, addAmount: number) => {
  const nextPaid = round2(Math.max(0, (Number(currentPaid) || 0) + (Number(addAmount) || 0)));
  const { due, status } = computeDueAndPaymentStatus(grand, nextPaid);
  return { nextPaid, nextDue: due, nextStatus: status };
};
