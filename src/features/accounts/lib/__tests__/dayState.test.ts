import { describe, expect, it } from "vitest";
import { getAccountsDayState } from "@/features/accounts/lib/dayState";

describe("getAccountsDayState", () => {
  it("returns closed when day is closed", () => {
    expect(getAccountsDayState({ isClosed: true, cashIssued: 10, purchasePosted: 5, cashReturned: 1 })).toBe("closed");
  });

  it("returns return_done when return exists", () => {
    expect(getAccountsDayState({ isClosed: false, cashIssued: 10, purchasePosted: 5, cashReturned: 2 })).toBe("return_done");
  });

  it("returns purchase_posted when purchase posted", () => {
    expect(getAccountsDayState({ isClosed: false, cashIssued: 10, purchasePosted: 4, cashReturned: 0 })).toBe("purchase_posted");
  });

  it("returns issue_done when only issue done", () => {
    expect(getAccountsDayState({ isClosed: false, cashIssued: 10, purchasePosted: 0, cashReturned: 0 })).toBe("issue_done");
  });

  it("returns open for blank day", () => {
    expect(getAccountsDayState({ isClosed: false, cashIssued: 0, purchasePosted: 0, cashReturned: 0 })).toBe("open");
  });
});
