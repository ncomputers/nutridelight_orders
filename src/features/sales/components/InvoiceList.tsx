import { Button } from "@/components/ui/button";
import { formatIsoDateDdMmYyyy } from "@/lib/datetime";
import type { SalesInvoice } from "@/features/sales/types";

interface InvoiceListProps {
  invoices: SalesInvoice[];
  isLoading: boolean;
  selectedInvoiceId: string | null;
  onSelectInvoice: (invoiceId: string) => void;
  onView?: (invoiceId: string) => void;
  onEdit?: (invoiceId: string) => void;
  onAddPayment?: (invoiceId: string) => void;
}

const InvoiceList = ({
  invoices,
  isLoading,
  selectedInvoiceId,
  onSelectInvoice,
  onView,
  onEdit,
  onAddPayment,
}: InvoiceListProps) => {
  return (
    <div className="border border-border rounded-md p-3">
      <h3 className="text-sm font-semibold mb-2">Invoice List</h3>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading invoices...</p>
      ) : invoices.length === 0 ? (
        <p className="text-xs text-muted-foreground">No invoices in selected range.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3">invoice_no</th>
                <th className="py-2 pr-3">restaurant</th>
                <th className="py-2 pr-3">date</th>
                <th className="py-2 pr-3">status</th>
                <th className="py-2 pr-3 text-right">total</th>
                <th className="py-2 pr-3 text-right">due_amount</th>
                <th className="py-2">actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const isSelected = selectedInvoiceId === invoice.id;
                return (
                  <tr
                    key={invoice.id}
                    className={`border-b border-border last:border-b-0 ${isSelected ? "bg-accent/30" : ""}`}
                  >
                    <td className="py-2 pr-3 font-semibold">{invoice.invoice_no}</td>
                    <td className="py-2 pr-3">{invoice.restaurant_name}</td>
                    <td className="py-2 pr-3">{formatIsoDateDdMmYyyy(invoice.invoice_date)}</td>
                    <td className="py-2 pr-3">{invoice.status}</td>
                    <td className="py-2 pr-3 text-right">INR {invoice.grand_total}</td>
                    <td className="py-2 pr-3 text-right">INR {invoice.due_amount}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onSelectInvoice(invoice.id);
                            onView?.(invoice.id);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onSelectInvoice(invoice.id);
                            onEdit?.(invoice.id);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onSelectInvoice(invoice.id);
                            onAddPayment?.(invoice.id);
                          }}
                        >
                          Add Payment
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
