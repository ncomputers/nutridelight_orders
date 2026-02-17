export type AccountsDayState = "open" | "issue_done" | "purchase_posted" | "return_done" | "closed";

export interface DayStateInput {
  isClosed: boolean;
  cashIssued: number;
  purchasePosted: number;
  cashReturned: number;
}

export const getAccountsDayState = (input: DayStateInput): AccountsDayState => {
  if (input.isClosed) return "closed";
  if (input.cashReturned > 0) return "return_done";
  if (input.purchasePosted > 0) return "purchase_posted";
  if (input.cashIssued > 0) return "issue_done";
  return "open";
};
