import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatIsoDateDdMmYyyy } from "@/lib/datetime";
import type { SalesInvoice, SalesPayment } from "@/features/sales/types";

interface PaymentPanelProps {
  invoice: SalesInvoice | null;
  payments: SalesPayment[];
  paymentAmount: string;
  paymentMethod: Exclude<SalesPayment["method"], null>;
  paymentNotes: string;
  isSubmitting: boolean;
  onChangeAmount: (value: string) => void;
  onChangeMethod: (value: Exclude<SalesPayment["method"], null>) => void;
  onChangeNotes: (value: string) => void;
  onSubmit: () => void;
}

const PaymentPanel = ({
  invoice,
  payments,
  paymentAmount,
  paymentMethod,
  paymentNotes,
  isSubmitting,
  onChangeAmount,
  onChangeMethod,
  onChangeNotes,
  onSubmit,
}: PaymentPanelProps) => {
  return (
    <div className="border border-border rounded-md p-3">
      <h3 className="text-sm font-semibold mb-2">4. Payment Panel</h3>
      {!invoice ? (
        <p className="text-xs text-muted-foreground">Select an invoice to add and view payments.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2 mb-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Amount</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={paymentAmount}
                onChange={(e) => onChangeAmount(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => onChangeMethod(e.target.value as Exclude<SalesPayment["method"], null>)}
                className="h-10 rounded-md border border-border bg-background px-2 text-sm w-[140px]"
              >
                <option value="cash">cash</option>
                <option value="upi">upi</option>
                <option value="bank">bank</option>
                <option value="card">card</option>
                <option value="other">other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <Input value={paymentNotes} onChange={(e) => onChangeNotes(e.target.value)} className="w-[220px]" />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onSubmit}
              disabled={invoice.status === "cancelled" || isSubmitting}
            >
              Add Payment
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            Paid: INR {invoice.paid_amount} · Due: INR {invoice.due_amount} · {invoice.payment_status}
          </p>

          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No payments recorded.</p>
          ) : (
            <div className="space-y-1">
              {payments.map((payment) => (
                <p key={payment.id} className="text-xs text-muted-foreground">
                  {formatIsoDateDdMmYyyy(payment.payment_date)} · {payment.method || "unspecified"} · INR {payment.amount}
                  {payment.notes ? ` · ${payment.notes}` : ""}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PaymentPanel;
