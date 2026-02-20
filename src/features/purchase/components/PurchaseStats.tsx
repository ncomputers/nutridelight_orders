interface PurchaseStatsProps {
  requiredQty: number;
  purchasedQty: number;
  remainingQty: number;
  completedCount: number;
}

const PurchaseStats = ({ requiredQty, purchasedQty, remainingQty, completedCount }: PurchaseStatsProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div className="rounded-md border border-border bg-background px-3 py-2">
        <p className="text-[11px] text-muted-foreground">Required Qty</p>
        <p className="text-sm font-semibold">{requiredQty} kg</p>
      </div>
      <div className="rounded-md border border-border bg-background px-3 py-2">
        <p className="text-[11px] text-muted-foreground">Purchased Qty</p>
        <p className="text-sm font-semibold">{purchasedQty} kg</p>
      </div>
      <div className="rounded-md border border-border bg-background px-3 py-2">
        <p className="text-[11px] text-muted-foreground">Total Remaining</p>
        <p className="text-sm font-semibold">{remainingQty} kg</p>
      </div>
      <div className="rounded-md border border-border bg-background px-3 py-2">
        <p className="text-[11px] text-muted-foreground">Completed Count</p>
        <p className="text-sm font-semibold">{completedCount}</p>
      </div>
    </div>
  );
};

export default PurchaseStats;
