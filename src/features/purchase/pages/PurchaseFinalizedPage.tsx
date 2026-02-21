import { Button } from "@/components/ui/button";
import type { PurchasePlanRow } from "@/features/admin/types";

interface PurchaseFinalizedPageProps {
  rows: PurchasePlanRow[];
  coveredCount: number;
  totalCount: number;
  pendingCount: number;
  overCount: number;
  requiredQty: number;
  purchasedQty: number;
  remainingQty: number;
  overQty: number;
  spendAmount: number;
  canFinalize: boolean;
  isLocked: boolean;
  isSavePending: boolean;
  isFinalizePending: boolean;
  onBackToBuy: () => void;
  onSaveDraft: () => void;
  onFinalize: () => void;
  onPrint: () => void;
}

const PurchaseFinalizedPage = ({
  rows,
  coveredCount,
  totalCount,
  pendingCount,
  overCount,
  requiredQty,
  purchasedQty,
  remainingQty,
  overQty,
  spendAmount,
  canFinalize,
  isLocked,
  isSavePending,
  isFinalizePending,
  onBackToBuy,
  onSaveDraft,
  onFinalize,
  onPrint,
}: PurchaseFinalizedPageProps) => {
  return (
    <section className="bg-card rounded-lg border border-border p-4 mb-4 space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Finalized Purchase</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
        <p>Covered items: <span className="font-semibold">{coveredCount}</span> / {totalCount}</p>
        <p>Pending items: <span className="font-semibold text-rose-700">{pendingCount}</span></p>
        <p>Over items: <span className="font-semibold text-violet-700">{overCount}</span></p>
        <p>Required Qty: <span className="font-semibold">{requiredQty} kg</span></p>
        <p>Purchased Qty: <span className="font-semibold">{purchasedQty} kg</span></p>
        <p>Spend: <span className="font-semibold">INR {spendAmount}</span></p>
        <p>Remaining Qty: <span className="font-semibold text-rose-700">{remainingQty} kg</span></p>
        <p>Over Qty: <span className="font-semibold text-violet-700">{overQty} kg</span></p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onBackToBuy}>
          Back To Buy
        </Button>
        <Button type="button" variant="outline" onClick={onSaveDraft} disabled={!canFinalize || isSavePending || isLocked}>
          Save Draft
        </Button>
        <Button type="button" onClick={onFinalize} disabled={!canFinalize || isLocked || isFinalizePending}>
          Finalize Purchase
        </Button>
        <Button type="button" variant="outline" onClick={onPrint} disabled={!canFinalize}>
          Print Final Sheet
        </Button>
      </div>

      <div className="rounded-md border border-border overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-right px-3 py-2">Required</th>
              <th className="text-right px-3 py-2">Purchased</th>
              <th className="text-right px-3 py-2">Remaining</th>
              <th className="text-right px-3 py-2">Rate</th>
              <th className="text-right px-3 py-2">Amount</th>
              <th className="text-left px-3 py-2">Supplier</th>
              <th className="text-left px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const remaining = Number((row.final_qty - row.purchased_qty).toFixed(2));
              const status = remaining > 0 ? "Pending" : remaining < 0 ? "Over" : "Completed";
              return (
                <tr key={row.item_code} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="font-medium">{row.item_en}</p>
                    <p className="text-xs text-muted-foreground font-hindi">{row.item_hi || "-"}</p>
                  </td>
                  <td className="px-3 py-2 text-right">{row.final_qty}</td>
                  <td className="px-3 py-2 text-right">{row.purchased_qty}</td>
                  <td className={`px-3 py-2 text-right font-medium ${remaining > 0 ? "text-rose-700" : remaining < 0 ? "text-violet-700" : "text-emerald-700"}`}>
                    {remaining}
                  </td>
                  <td className="px-3 py-2 text-right">{row.unit_price}</td>
                  <td className="px-3 py-2 text-right">{row.line_total}</td>
                  <td className="px-3 py-2">{row.vendor_name || "-"}</td>
                  <td className="px-3 py-2">{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PurchaseFinalizedPage;
