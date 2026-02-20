import { Input } from "@/components/ui/input";
import { computeLineTotal } from "@/features/sales/domain/salesDomain";
import type { SalesInvoiceLine } from "@/features/sales/types";

interface InvoiceTableProps {
  lines: SalesInvoiceLine[];
  editable: boolean;
  onChangeQty?: (lineId: string, nextQty: number) => void;
  onChangeUnitPrice?: (lineId: string, nextPrice: number) => void;
}

const InvoiceTable = ({ lines, editable, onChangeQty, onChangeUnitPrice }: InvoiceTableProps) => {
  if (lines.length === 0) {
    return <p className="text-xs text-muted-foreground">No invoice items found.</p>;
  }

  return (
    <div className="space-y-2">
      {lines.map((line) => (
        <div key={line.id} className="grid grid-cols-12 gap-2 items-center border border-border rounded-md p-2">
          <div className="col-span-4">
            <p className="text-sm font-medium">{line.item_en}</p>
            <p className="text-xs text-muted-foreground">{line.item_hi || "-"}</p>
          </div>
          <div className="col-span-2">
            {editable ? (
              <Input
                type="number"
                min={0}
                step={0.01}
                value={line.qty}
                onChange={(e) => onChangeQty?.(line.id, Math.max(0, Number(e.target.value) || 0))}
                className="h-9"
              />
            ) : (
              <p className="text-sm">{line.qty}</p>
            )}
          </div>
          <div className="col-span-2">
            {editable ? (
              <Input
                type="number"
                min={0}
                step={0.01}
                value={line.unit_price}
                onChange={(e) => onChangeUnitPrice?.(line.id, Math.max(0, Number(e.target.value) || 0))}
                className="h-9"
              />
            ) : (
              <p className="text-sm">INR {line.unit_price}</p>
            )}
          </div>
          <div className="col-span-4 text-right text-sm font-semibold">
            INR {computeLineTotal(Number(line.qty) || 0, Number(line.unit_price) || 0)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default InvoiceTable;
