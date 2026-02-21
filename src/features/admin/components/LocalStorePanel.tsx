import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LocalStorePolicyRow, StockQtyRow } from "@/features/admin/types";

interface LocalStorePanelProps {
  stockItems: StockQtyRow[];
  policies: LocalStorePolicyRow[];
  isSaving: boolean;
  onSavePolicy: (payload: { item_code: string; item_en: string; required_stock_qty: number }) => void;
  onDeletePolicy: (itemCode: string) => void;
}

const LocalStorePanel = ({ stockItems, policies, isSaving, onSavePolicy, onDeletePolicy }: LocalStorePanelProps) => {
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { required: string }>>({});

  const mergedRows = useMemo(() => {
    const policyByCode = new Map(policies.map((row) => [row.item_code, row]));
    return stockItems
      .map((stock) => {
      const policy = policyByCode.get(stock.item_code);
      return {
        item_code: stock.item_code,
        item_en: stock.item_en,
        available_qty: stock.available_qty,
        required_stock_qty: policy?.required_stock_qty ?? 0,
        is_configured: Boolean(policy),
      };
      })
      .sort((a, b) => a.item_en.localeCompare(b.item_en));
  }, [stockItems, policies]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mergedRows;
    return mergedRows.filter(
      (row) => row.item_en.toLowerCase().includes(q) || row.item_code.toLowerCase().includes(q),
    );
  }, [mergedRows, search]);

  const readDraft = (itemCode: string, fallback: number) =>
    drafts[itemCode]?.required ?? String(fallback);

  const updateDraft = (itemCode: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [itemCode]: {
        required: value,
      },
    }));
  };

  return (
    <section className="bg-card rounded-lg border border-border p-4 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Warehouse Required Stock Policy</h2>
      <p className="text-xs text-muted-foreground">Set required stock qty. Gap is computed as required stock minus current stock.</p>

      <div className="grid md:grid-cols-2 gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by item code or name"
        />
        <div className="text-xs text-muted-foreground flex items-center justify-end px-2">
          {filteredRows.length} items
        </div>
      </div>

      <div className="space-y-2">
        {filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items found.</p>
        ) : (
          filteredRows.map((row) => (
            <div key={row.item_code} className="rounded-md border border-border p-3 space-y-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{row.item_en}</p>
                <p className="text-xs text-muted-foreground">
                  {row.item_code} · Stock {row.available_qty}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-center">
                <Input
                  type="number"
                  min={0}
                  value={readDraft(row.item_code, row.required_stock_qty)}
                  onChange={(e) => updateDraft(row.item_code, e.target.value)}
                  placeholder="Required stock qty"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => {
                    const required = Math.max(0, Number(readDraft(row.item_code, row.required_stock_qty)) || 0);
                    onSavePolicy({
                      item_code: row.item_code,
                      item_en: row.item_en,
                      required_stock_qty: required,
                    });
                  }}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => {
                    setDrafts((prev) => {
                      const next = { ...prev };
                      delete next[row.item_code];
                      return next;
                    });
                  }}
                >
                  Reset
                </Button>
                {row.is_configured ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    onClick={() => onDeletePolicy(row.item_code)}
                  >
                    Clear
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground">Not configured</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default LocalStorePanel;
