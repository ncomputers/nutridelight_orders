import { getAccountsDayState, type AccountsDayState } from "@/features/accounts/lib/dayState";

const round2 = (value: number) => Number(value.toFixed(2));

export interface AccountsVoucherSummary {
  date: string;
  expectedSpend: number;
  spend: number;
  cashIssued: number;
  cashReturned: number;
  isClosed: boolean;
  closeNote: string;
}

export interface AccountsDayComputed extends AccountsVoucherSummary {
  expectedCashLeft: number;
  difference: number;
  purchaseNotPosted: boolean;
  status: "closed_matched" | "closed_mismatch" | "open_matched" | "open_mismatch";
  dayState: AccountsDayState;
}

export const computeAccountsDay = (input: AccountsVoucherSummary): AccountsDayComputed => {
  const spend = round2(input.spend);
  const cashIssued = round2(input.cashIssued);
  const cashReturned = round2(input.cashReturned);
  const expectedSpend = round2(input.expectedSpend);
  const expectedCashLeft = round2(cashIssued - spend);
  const difference = round2(cashIssued - spend - cashReturned);
  const purchaseNotPosted = expectedSpend > 0 && spend <= 0;
  const dayState = getAccountsDayState({
    isClosed: input.isClosed,
    cashIssued,
    purchasePosted: spend,
    cashReturned,
  });
  const status = input.isClosed
    ? difference === 0
      ? "closed_matched"
      : "closed_mismatch"
    : difference === 0
      ? "open_matched"
      : "open_mismatch";

  return {
    ...input,
    expectedSpend,
    spend,
    cashIssued,
    cashReturned,
    expectedCashLeft,
    difference,
    purchaseNotPosted,
    status,
    dayState,
  };
};
