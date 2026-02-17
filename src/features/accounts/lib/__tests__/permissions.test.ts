import { describe, expect, it } from "vitest";
import { canCloseDay, canManageLedgerMapping, canPostAccounting, canPostForUser } from "@/features/accounts/lib/permissions";

describe("accounts permissions", () => {
  it("allows posting for admin and purchase", () => {
    expect(canPostAccounting("admin")).toBe(true);
    expect(canPostAccounting("purchase")).toBe(true);
    expect(canPostAccounting("sales")).toBe(false);
  });

  it("allows day close only for admin", () => {
    expect(canCloseDay("admin")).toBe(true);
    expect(canCloseDay("purchase")).toBe(false);
  });

  it("allows ledger mapping only for admin", () => {
    expect(canManageLedgerMapping("admin")).toBe(true);
    expect(canManageLedgerMapping("purchase")).toBe(false);
  });

  it("enforces user-scoped posting for purchase", () => {
    expect(canPostForUser("purchase", "u1", "u1")).toBe(true);
    expect(canPostForUser("purchase", "u1", "u2")).toBe(false);
    expect(canPostForUser("admin", "u1", "u2")).toBe(true);
  });
});
