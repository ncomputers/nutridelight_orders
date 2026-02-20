import { describe, expect, it } from "vitest";
import {
  applyPayment,
  computeDueAndPaymentStatus,
  computeLineTotal,
  computeSalesTotals,
} from "@/features/sales/domain/salesDomain";

describe("salesDomain", () => {
  it("computes line totals with rounding", () => {
    expect(computeLineTotal(2.5, 30)).toBe(75);
    expect(computeLineTotal(-2, 30)).toBe(0);
  });

  it("computes sales totals", () => {
    const totals = computeSalesTotals(
      [
        { id: "1", invoice_id: "i", item_code: null, item_en: "A", item_hi: null, qty: 2, unit: "kg", unit_price: 10, line_total: 0, line_note: null, created_at: "", updated_at: "" },
        { id: "2", invoice_id: "i", item_code: null, item_en: "B", item_hi: null, qty: 1.5, unit: "kg", unit_price: 20, line_total: 0, line_note: null, created_at: "", updated_at: "" },
      ],
      5,
      3,
    );
    expect(totals.subtotal).toBe(50);
    expect(totals.grand).toBe(48);
  });

  it("computes due and status", () => {
    expect(computeDueAndPaymentStatus(100, 0)).toEqual({ due: 100, status: "unpaid" });
    expect(computeDueAndPaymentStatus(100, 30)).toEqual({ due: 70, status: "partial" });
    expect(computeDueAndPaymentStatus(100, 100)).toEqual({ due: 0, status: "paid" });
  });

  it("applies payment", () => {
    expect(applyPayment(20, 100, 30)).toEqual({
      nextPaid: 50,
      nextDue: 50,
      nextStatus: "partial",
    });
  });
});
