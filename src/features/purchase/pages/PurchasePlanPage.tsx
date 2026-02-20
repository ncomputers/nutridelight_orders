import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import type { PurchasePlanRow } from "@/features/admin/types";
import NeedList from "@/features/purchase/components/NeedList";
import PurchaseStats from "@/features/purchase/components/PurchaseStats";

interface PurchasePlanPageProps {
  rows: PurchasePlanRow[];
  requiredQty: number;
  purchasedQty: number;
  totalRemainingQty: number;
  completedCount: number;
  onStartBuying: () => void;
  onOpenNeedList: () => void;
}

const PurchasePlanPage = ({
  rows,
  requiredQty,
  purchasedQty,
  totalRemainingQty,
  completedCount,
  onStartBuying,
  onOpenNeedList,
}: PurchasePlanPageProps) => {
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
  const withStatus = useMemo(
    () =>
      rows.map((row) => {
        const remainingQty = Number((row.final_qty - row.purchased_qty).toFixed(2));
        const status = remainingQty > 0 ? "pending" : remainingQty === 0 ? "completed" : "over";
        return { row, remainingQty, status };
      }),
    [rows],
  );
  const report = useMemo(
    () =>
      withStatus.reduce(
        (acc, item) => {
          if (item.status === "pending") acc.pending += 1;
          else if (item.status === "completed") acc.completed += 1;
          else acc.over += 1;
          return acc;
        },
        { completed: 0, pending: 0, over: 0 },
      ),
    [withStatus],
  );
  const sortedRows = useMemo(
    () =>
      [...withStatus].sort((a, b) => {
        const rank = (s: "pending" | "completed" | "over") => (s === "pending" ? 0 : s === "over" ? 1 : 2);
        const byStatus = rank(a.status) - rank(b.status);
        if (byStatus !== 0) return byStatus;
        return a.row.item_en.localeCompare(b.row.item_en);
      }),
    [withStatus],
  );
  const visibleRows = useMemo(() => {
    if (filter === "all") return sortedRows.map((x) => x.row);
    if (filter === "pending") return sortedRows.filter((x) => x.status === "pending").map((x) => x.row);
    return sortedRows.filter((x) => x.status === "completed").map((x) => x.row);
  }, [filter, sortedRows]);

  return (
    <section className="bg-card rounded-lg border border-border p-4 mb-4 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Purchase Plan</h2>
      <PurchaseStats
        requiredQty={requiredQty}
        purchasedQty={purchasedQty}
        remainingQty={totalRemainingQty}
        completedCount={completedCount}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onStartBuying}>
          Start Buying
        </Button>
        <Button type="button" variant="outline" onClick={onOpenNeedList}>
          Open Need List
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1.5">
          Completed: <span className="font-semibold">{report.completed}</span>
        </div>
        <div className="rounded border border-rose-300 bg-rose-50 px-2 py-1.5">
          Pending: <span className="font-semibold">{report.pending}</span>
        </div>
        <div className="rounded border border-violet-300 bg-violet-50 px-2 py-1.5">
          Over: <span className="font-semibold">{report.over}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
        <Button type="button" size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>Pending</Button>
        <Button type="button" size="sm" variant={filter === "completed" ? "default" : "outline"} onClick={() => setFilter("completed")}>Completed</Button>
      </div>
      <NeedList rows={visibleRows} onOpenItem={undefined} />
    </section>
  );
};

export default PurchasePlanPage;
