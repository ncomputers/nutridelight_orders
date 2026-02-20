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
  onFinalize: () => void;
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
  onFinalize: _onFinalize,
  onBackToPlan: _onBackToPlan,
}: PurchaseBuyPageProps) => {
  return (
    <section className="bg-card rounded-lg border border-border p-4 mb-4 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Buy Flow</h2>
      {totalCount > 0 && pendingCount === 0 ? (
        <p className="text-xs text-emerald-700">All items completed. You can still open and edit any item here.</p>
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
