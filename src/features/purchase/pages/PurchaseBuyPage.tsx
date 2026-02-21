import { Button } from "@/components/ui/button";
import type { PurchasePlanRow } from "@/features/admin/types";
import BuyItemCard from "@/features/purchase/components/BuyItemCard";

interface PurchaseBuyPageProps {
  currentRow: PurchasePlanRow | null;
  currentIndex: number;
  totalCount: number;
  pendingCount: number;
  isLocked: boolean;
  isSaving: boolean;
  buyQty: string;
  onStepQty: (delta: number) => void;
  onSetQty: (value: string) => void;
  onSetRate: (value: string) => void;
  onSetVendor: (value: string) => void;
  onPrev: () => void;
  onSaveAndNext: () => void;
  onSkip: () => void;
  onReviewFinalize: () => void;
  onBackToPlan: () => void;
}

const PurchaseBuyPage = ({
  currentRow,
  currentIndex,
  totalCount,
  pendingCount,
  isLocked,
  isSaving,
  buyQty,
  onStepQty,
  onSetQty,
  onSetRate,
  onSetVendor,
  onPrev,
  onSaveAndNext,
  onSkip,
  onReviewFinalize,
  onBackToPlan: _onBackToPlan,
}: PurchaseBuyPageProps) => {
  const isAllCompleted = totalCount > 0 && pendingCount === 0;
  return (
    <section className="bg-card rounded-lg border border-border p-4 mb-4 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Buy Flow</h2>
      {isAllCompleted ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 space-y-2">
          <p className="text-xs text-emerald-700">All items completed. Review summary before finalizing.</p>
          <Button type="button" size="sm" onClick={onReviewFinalize}>
            Review & Finalize
          </Button>
        </div>
      ) : null}

      <BuyItemCard
        row={currentRow}
        currentIndex={currentIndex}
        totalCount={Math.max(1, totalCount)}
        isLocked={isLocked}
        isSaving={isSaving}
        buyQty={buyQty}
        onStepQty={onStepQty}
        onSetQty={onSetQty}
        onSetRate={onSetRate}
        onSetVendor={onSetVendor}
        onPrev={onPrev}
        onSaveAndNext={onSaveAndNext}
        onSkip={onSkip}
      />
    </section>
  );
};

export default PurchaseBuyPage;
