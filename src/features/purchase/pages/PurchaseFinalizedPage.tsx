import { Button } from "@/components/ui/button";

interface PurchaseFinalizedPageProps {
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
  onSaveDraft: () => void;
  onFinalize: () => void;
  onPrint: () => void;
}

const PurchaseFinalizedPage = ({
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
    </section>
  );
};

export default PurchaseFinalizedPage;
