import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatIsoDateDdMmYyyy } from "@/lib/datetime";
import type { PurchasePlanDbRow } from "@/features/admin/types";

interface PurchaseStockPageProps {
  todayIso: string;
  windowStartIso: string;
  fromDate: string;
  toDate: string;
  historyByDate: Array<{ date: string; totalAmount: number; itemCount: number }>;
  selectedDate: string | null;
  detailRows: PurchasePlanDbRow[];
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onResetRange: () => void;
  onSelectDate: (value: string) => void;
  onPrintDate: (value: string) => void;
}

const PurchaseStockPage = ({
  todayIso,
  windowStartIso,
  fromDate,
  toDate,
  historyByDate,
  selectedDate,
  detailRows,
  onFromChange,
  onToChange,
  onResetRange,
  onSelectDate,
  onPrintDate,
}: PurchaseStockPageProps) => {
  return (
    <section className="bg-card rounded-lg border border-border p-4 mb-4 space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Stock Impact</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">From</label>
          <Input type="date" value={fromDate} max={todayIso} onChange={(e) => onFromChange(e.target.value || windowStartIso)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">To</label>
          <Input type="date" value={toDate} max={todayIso} onChange={(e) => onToChange(e.target.value || todayIso)} />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" className="w-full" onClick={onResetRange}>
            Reset Range
          </Button>
        </div>
      </div>

      {historyByDate.length === 0 ? (
        <p className="text-xs text-muted-foreground">No finalized history yet.</p>
      ) : (
        <div className="space-y-1">
          {historyByDate.map((row) => (
            <button
              key={row.date}
              type="button"
              onClick={() => onSelectDate(row.date)}
              className={`w-full text-left flex items-center justify-between text-sm border rounded-md px-3 py-2 ${selectedDate === row.date ? "border-primary" : "border-border"}`}
            >
              <span>{formatIsoDateDdMmYyyy(row.date)}</span>
              <span className="font-semibold">{row.itemCount} items · INR {row.totalAmount}</span>
            </button>
          ))}
        </div>
      )}

      {selectedDate && (
        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Detail: {formatIsoDateDdMmYyyy(selectedDate)}</h4>
            <Button type="button" variant="outline" size="sm" onClick={() => onPrintDate(selectedDate)}>
              Print
            </Button>
          </div>
          {detailRows.length === 0 ? (
            <p className="text-xs text-muted-foreground">No items for this date.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-2">Item</th>
                    <th className="py-2 pr-2">Hindi</th>
                    <th className="py-2 pr-2 text-right">Required</th>
                    <th className="py-2 pr-2 text-right">Purchased</th>
                    <th className="py-2 pr-2 text-right">Price</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((row) => (
                    <tr key={`${row.purchase_date}-${row.item_en}-${row.item_code || ""}`} className="border-b border-border last:border-b-0">
                      <td className="py-2 pr-2">{row.item_en}</td>
                      <td className="py-2 pr-2">{row.item_hi || "-"}</td>
                      <td className="py-2 pr-2 text-right">{row.final_qty}</td>
                      <td className="py-2 pr-2 text-right">{row.purchased_qty}</td>
                      <td className="py-2 pr-2 text-right">INR {row.unit_price}</td>
                      <td className="py-2 text-right font-semibold">INR {row.line_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default PurchaseStockPage;
