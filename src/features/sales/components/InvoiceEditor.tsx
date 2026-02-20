import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeLineTotal } from "@/features/sales/domain/salesDomain";
import { formatIsoDateDdMmYyyy } from "@/lib/datetime";
import type { SalesInvoice, SalesInvoiceLine, SalesTotals } from "@/features/sales/types";

interface InvoiceEditorProps {
  invoice: SalesInvoice | null;
  linkedOrdersCount: number;
  lines: SalesInvoiceLine[];
  isLoadingLines: boolean;
  canEdit: boolean;
  discountAmount: string;
  otherCharges: string;
  notes: string;
  totals: SalesTotals;
  isSavePending: boolean;
  isFinalizePending: boolean;
  onChangeQty: (lineId: string, nextQty: number) => void;
  onChangeUnitPrice: (lineId: string, nextPrice: number) => void;
  onChangeDiscount: (value: string) => void;
  onChangeOtherCharges: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onSaveDraft: () => void;
  onFinalize: () => void;
}

const InvoiceEditor = ({
  invoice,
  linkedOrdersCount,
  lines,
  isLoadingLines,
  canEdit,
  discountAmount,
  otherCharges,
  notes,
  totals,
  isSavePending,
  isFinalizePending,
  onChangeQty,
  onChangeUnitPrice,
  onChangeDiscount,
  onChangeOtherCharges,
  onChangeNotes,
  onSaveDraft,
  onFinalize,
}: InvoiceEditorProps) => {
  if (!invoice) {
    return (
      <div className="border border-border rounded-md p-3">
        <h3 className="text-sm font-semibold mb-2">2. Invoice Editor</h3>
        <p className="text-xs text-muted-foreground">Select or create an invoice to edit.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-md p-3 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">2. Invoice Editor</h3>
          <p className="text-xs text-muted-foreground">
            {invoice.invoice_no} · {invoice.restaurant_name} · Delivery {formatIsoDateDdMmYyyy(invoice.delivery_date)}
          </p>
          <p className="text-xs text-muted-foreground">Linked orders: {linkedOrdersCount}</p>
        </div>
        <p className="text-sm font-semibold">Status: {invoice.status}</p>
      </div>

      {isLoadingLines ? (
        <p className="text-xs text-muted-foreground">Loading invoice lines...</p>
      ) : (
        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.id} className="grid grid-cols-12 gap-2 items-center border border-border rounded-md p-2">
              <div className="col-span-4">
                <p className="text-sm font-medium">{line.item_en}</p>
                <p className="text-xs text-muted-foreground">{line.item_hi || "-"}</p>
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.qty}
                  disabled={!canEdit}
                  onChange={(e) => onChangeQty(line.id, Math.max(0, Number(e.target.value) || 0))}
                  className="h-9"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.unit_price}
                  disabled={!canEdit}
                  onChange={(e) => onChangeUnitPrice(line.id, Math.max(0, Number(e.target.value) || 0))}
                  className="h-9"
                />
              </div>
              <div className="col-span-4 text-right text-sm font-semibold">
                INR {computeLineTotal(Number(line.qty) || 0, Number(line.unit_price) || 0)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Discount</label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={discountAmount}
            disabled={!canEdit}
            onChange={(e) => onChangeDiscount(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Other Charges</label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={otherCharges}
            disabled={!canEdit}
            onChange={(e) => onChangeOtherCharges(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Notes</label>
          <Input value={notes} disabled={!canEdit} onChange={(e) => onChangeNotes(e.target.value)} />
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

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onSaveDraft} disabled={!canEdit || isSavePending}>
          Save Draft
        </Button>
        <Button
          type="button"
          onClick={onFinalize}
          disabled={invoice.status === "cancelled" || isFinalizePending}
        >
          Finalize
        </Button>
      </div>
    </div>
  );
};

export default InvoiceEditor;
