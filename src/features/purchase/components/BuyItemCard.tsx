import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PurchasePlanRow } from "@/features/admin/types";
import ProgressBar from "@/features/purchase/components/ProgressBar";

interface BuyItemCardProps {
  row: PurchasePlanRow | null;
  currentIndex: number;
  totalCount: number;
  isLocked: boolean;
  isSaving: boolean;
  onStepQty: (delta: number) => void;
  buyQty: string;
  onSetQty: (value: string) => void;
  onSetRate: (value: string) => void;
  onSetVendor: (value: string) => void;
  onPrev: () => void;
  onSaveAndNext: () => void;
  onSkip: () => void;
}

const BuyItemCard = ({
  row,
  currentIndex,
  totalCount,
  isLocked,
  isSaving,
  onStepQty,
  buyQty,
  onSetQty,
  onSetRate,
  onSetVendor,
  onPrev,
  onSaveAndNext,
  onSkip,
}: BuyItemCardProps) => {
  const progress = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0;
  const requiredQty = row ? Number(row.final_qty.toFixed(2)) : 0;
  const purchasedQty = row ? Number(row.purchased_qty.toFixed(2)) : 0;
  const remainingQty = row ? Number((row.final_qty - row.purchased_qty).toFixed(2)) : 0;
  const absRemainingQty = Number(Math.abs(remainingQty).toFixed(2));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">
          {Math.min(currentIndex + 1, totalCount)} / {totalCount} items
        </p>
        <ProgressBar value={progress} />
      </div>

      {!row ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No item selected.</p>
      ) : (
        <div className="border border-border rounded-md p-4 space-y-4">
          <div>
            <p className="text-xl font-bold">{row.item_en}</p>
            <p className="text-xs text-muted-foreground font-hindi">{row.item_hi || "-"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Required: {requiredQty} kg | Purchased: {purchasedQty} kg</p>
            <p className={`text-sm font-semibold ${remainingQty > 0 ? "text-rose-700" : remainingQty < 0 ? "text-violet-700" : "text-emerald-700"}`}>
              {remainingQty > 0 ? `Remaining: ${absRemainingQty} kg` : remainingQty < 0 ? `Over: ${absRemainingQty} kg` : "Completed"}
            </p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Buy Qty</label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="h-11 w-11 px-0 text-lg" disabled={isLocked} onClick={() => onStepQty(-1)}>
                -
              </Button>
              <Input
                type="number"
                value={buyQty}
                onChange={(e) => onSetQty(e.target.value)}
                disabled={isLocked}
                className="h-11 text-center"
                inputMode="decimal"
              />
              <Button type="button" variant="outline" className="h-11 w-11 px-0 text-lg" disabled={isLocked} onClick={() => onStepQty(1)}>
                +
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Rate (INR/kg)</label>
            <Input
              type="number"
              step={0.01}
              value={row.unit_price}
              onChange={(e) => onSetRate(e.target.value)}
              disabled={isLocked}
              className="h-11"
              inputMode="decimal"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Supplier / Notes (optional)</label>
            <Input
              value={row.vendor_name || ""}
              onChange={(e) => onSetVendor(e.target.value)}
              disabled={isLocked}
              className="h-11"
            />
          </div>

          <p className="text-sm">
            Amount: <span className="font-semibold">INR {row.line_total}</span>
          </p>

          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant="outline" onClick={onPrev} disabled={isLocked}>
              Back
            </Button>
            <Button type="button" variant="outline" onClick={onSkip} disabled={isLocked}>
              Skip
            </Button>
            <Button type="button" onClick={onSaveAndNext} disabled={isLocked || isSaving}>
              Save & Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyItemCard;
