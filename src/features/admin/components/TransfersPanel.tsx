import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InventoryLocationRow, StockTransferLineRow, StockTransferRow } from "@/features/admin/types";

interface TransfersPanelProps {
  locations: InventoryLocationRow[];
  transfers: StockTransferRow[];
  transferLinesById: Map<string, StockTransferLineRow[]>;
  isSubmitting: boolean;
  onCreateTransfer: (payload: {
    from_location_code: string;
    to_location_code: string;
    lines: Array<{ item_code: string; item_en: string; qty: number }>;
    notes?: string;
  }) => void;
}

const TransfersPanel = ({
  locations,
  transfers,
  transferLinesById,
  isSubmitting,
  onCreateTransfer,
}: TransfersPanelProps) => {
  const [fromCode, setFromCode] = useState("MAIN_STORE");
  const [toCode, setToCode] = useState("LOCAL_STORE");
  const [itemCode, setItemCode] = useState("");
  const [itemEn, setItemEn] = useState("");
  const [qty, setQty] = useState("0");
  const [notes, setNotes] = useState("");
  const activeLocations = useMemo(() => locations.filter((l) => l.is_active), [locations]);

  return (
    <section className="bg-card rounded-lg border border-border p-4 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Transfers</h2>

      <div className="grid md:grid-cols-6 gap-2">
        <select value={fromCode} onChange={(e) => setFromCode(e.target.value)} className="h-10 rounded-md border border-border bg-background px-2">
          {activeLocations.map((l) => (
            <option key={l.id} value={l.code}>{l.code}</option>
          ))}
        </select>
        <select value={toCode} onChange={(e) => setToCode(e.target.value)} className="h-10 rounded-md border border-border bg-background px-2">
          {activeLocations.map((l) => (
            <option key={l.id} value={l.code}>{l.code}</option>
          ))}
        </select>
        <Input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="Item code" />
        <Input value={itemEn} onChange={(e) => setItemEn(e.target.value)} placeholder="Item name" />
        <Input type="number" min={0} step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" />
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
      </div>
      <Button
        type="button"
        disabled={isSubmitting}
        onClick={() => {
          const code = itemCode.trim();
          const name = itemEn.trim();
          const q = Math.max(0, Number(qty) || 0);
          if (!code || !name || q <= 0 || fromCode === toCode) return;
          onCreateTransfer({
            from_location_code: fromCode,
            to_location_code: toCode,
            lines: [{ item_code: code, item_en: name, qty: q }],
            notes: notes.trim() || undefined,
          });
          setItemCode("");
          setItemEn("");
          setQty("0");
          setNotes("");
        }}
      >
        Create Transfer
      </Button>

      <div className="space-y-2">
        {transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transfers found.</p>
        ) : (
          transfers.map((row) => (
            <div key={row.id} className="rounded-md border border-border p-3 space-y-1">
              <p className="text-sm font-semibold">{row.transfer_no} · {row.transfer_date}</p>
              <p className="text-xs text-muted-foreground">{row.status} · {row.created_by}</p>
              {row.notes ? <p className="text-xs">{row.notes}</p> : null}
              <div className="text-xs text-muted-foreground">
                {(transferLinesById.get(row.id) || []).map((line) => (
                  <div key={line.id}>{line.item_en} ({line.item_code}) · {line.qty}</div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default TransfersPanel;
