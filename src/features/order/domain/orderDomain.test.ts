import { describe, expect, it } from "vitest";
import {
  buildSelectedOrderItems,
  nextQuantity,
  parseQuantityInput,
  selectedCountFromQuantities,
} from "@/features/order/domain/orderDomain";

describe("orderDomain", () => {
  it("clamps next quantity at zero", () => {
    expect(nextQuantity(0.5, -2)).toBe(0);
  });

  it("parses quantity input safely", () => {
    expect(parseQuantityInput("1.25")).toBe(1.3);
    expect(parseQuantityInput("-1")).toBe(0);
    expect(parseQuantityInput("abc")).toBe(0);
  });

  it("counts selected items", () => {
    expect(selectedCountFromQuantities({ A: 0, B: 1, C: 2 })).toBe(2);
  });

  it("builds selected order items from quantities", () => {
    const selected = buildSelectedOrderItems({
      VEG_TOMATO: 2,
      VEG_ONION: 0,
      HRB_MINT: 1,
    });
    expect(selected.length).toBe(2);
    expect(selected.some((row) => row.code === "VEG_TOMATO" && row.qty === 2)).toBe(true);
    expect(selected.some((row) => row.code === "HRB_MINT" && row.qty === 1)).toBe(true);
  });
});
