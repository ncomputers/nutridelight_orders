import { Input } from "@/components/ui/input";
import type { SalesTotals } from "@/features/sales/types";

interface InvoiceSummaryProps {
  totals: SalesTotals;
  discountAmount: string;
  otherCharges: string;
  notes: string;
  editable: boolean;
  onChangeDiscount?: (value: string) => void;
  onChangeOtherCharges?: (value: string) => void;
  onChangeNotes?: (value: string) => void;
}

const InvoiceSummary = ({
  totals,
  discountAmount,
  otherCharges,
  notes,
  editable,
  onChangeDiscount,
  onChangeOtherCharges,
  onChangeNotes,
}: InvoiceSummaryProps) => {
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Discount</label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={discountAmount}
            disabled={!editable}
            onChange={(e) => onChangeDiscount?.(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Other Charges</label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={otherCharges}
            disabled={!editable}
            onChange={(e) => onChangeOtherCharges?.(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Notes</label>
          <Input value={notes} disabled={!editable} onChange={(e) => onChangeNotes?.(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <div className="rounded-md border border-border p-2">
          <p className="text-xs text-muted-foreground">Subtotal</p>
          <p className="font-semibold">INR {totals.subtotal}</p>
        </div>
        <div className="rounded-md border border-border p-2">
          <p className="text-xs text-muted-foreground">Discount</p>
          <p className="font-semibold">INR {totals.discount}</p>
        </div>
        <div className="rounded-md border border-border p-2">
          <p className="text-xs text-muted-foreground">Other</p>
          <p className="font-semibold">INR {totals.other}</p>
        </div>
        <div className="rounded-md border border-border p-2">
          <p className="text-xs text-muted-foreground">Grand Total</p>
          <p className="font-semibold">INR {totals.grand}</p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSummary;
