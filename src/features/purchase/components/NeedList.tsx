import type { PurchasePlanRow } from "@/features/admin/types";
import ProgressBar from "@/features/purchase/components/ProgressBar";

interface NeedListProps {
  rows: PurchasePlanRow[];
  onOpenItem?: (itemCode: string) => void;
}

const NeedList = ({ rows, onOpenItem }: NeedListProps) => {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No purchase demand items.</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const remaining = Number((row.final_qty - row.purchased_qty).toFixed(2));
        const absRemaining = Number(Math.abs(remaining).toFixed(2));
        const required = Math.max(0, row.final_qty);
        const purchased = Math.max(0, row.purchased_qty);
        const progress = required > 0 ? Math.min(100, Number(((purchased / required) * 100).toFixed(2))) : 100;
        const status =
          remaining > 0 ? "Pending" : remaining === 0 ? "Completed" : "Over";
        const statusClass =
          status === "Completed"
            ? "bg-emerald-100 text-emerald-700 border-emerald-300"
            : status === "Over"
              ? "bg-violet-100 text-violet-700 border-violet-300"
              : "bg-rose-100 text-rose-700 border-rose-300";
        return (
          <button
            key={row.item_code}
            type="button"
            onClick={() => onOpenItem?.(row.item_code)}
            className="w-full border border-border rounded-md p-3 text-left hover:bg-accent/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{row.item_en}</p>
                <p className="text-xs text-muted-foreground font-hindi">{row.item_hi || "-"}</p>
                <div className="mt-2 w-full max-w-[260px]">
                  <ProgressBar value={progress} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{progress}% done</p>
              </div>
              <div className="text-right text-xs">
                <p className={`inline-flex items-center px-2 py-0.5 rounded border font-semibold mb-1 ${statusClass}`}>
                  {status}
                </p>
                <p>Required: {row.final_qty} kg</p>
                <p>Purchased: {row.purchased_qty} kg</p>
                <p className={`font-semibold ${remaining > 0 ? "text-rose-700" : remaining < 0 ? "text-violet-700" : ""}`}>
                  {remaining > 0 ? `Remaining: ${absRemaining} kg` : remaining < 0 ? `Over: ${absRemaining} kg` : "Completed"}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default NeedList;
