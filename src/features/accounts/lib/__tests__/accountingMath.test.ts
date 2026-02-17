import { describe, expect, it } from "vitest";
import { computeAccountsDay } from "@/features/accounts/lib/accountingMath";

describe("computeAccountsDay", () => {
  it("computes matching open day", () => {
    const row = computeAccountsDay({
      date: "2026-02-17",
      expectedSpend: 100,
      spend: 100,
      cashIssued: 120,
      cashReturned: 20,
      isClosed: false,
      closeNote: "",
    });
    expect(row.difference).toBe(0);
    expect(row.status).toBe("open_matched");
    expect(row.purchaseNotPosted).toBe(false);
    expect(row.dayState).toBe("return_done");
  });

  it("flags purchase not posted when expected exists but spend is zero", () => {
    const row = computeAccountsDay({
      date: "2026-02-17",
      expectedSpend: 75,
      spend: 0,
      cashIssued: 75,
      cashReturned: 0,
      isClosed: false,
      closeNote: "",
    });
    expect(row.purchaseNotPosted).toBe(true);
    expect(row.difference).toBe(75);
    expect(row.status).toBe("open_mismatch");
  });

  it("computes closed mismatch status", () => {
    const row = computeAccountsDay({
      date: "2026-02-17",
      expectedSpend: 100,
      spend: 100,
      cashIssued: 100,
      cashReturned: 10,
      isClosed: true,
      closeNote: "short return",
    });
    expect(row.status).toBe("closed_mismatch");
    expect(row.dayState).toBe("closed");
  });
});
