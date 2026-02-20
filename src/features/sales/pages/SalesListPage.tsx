import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salesQueryKeys } from "@/features/sales/queryKeys";
import { salesRepository } from "@/features/sales/repositories/salesRepository";
import { formatIsoDateDdMmYyyy, getIndiaDateDaysAgoIso, getIndiaDateIso } from "@/lib/datetime";
import { useState } from "react";
import { useSalesAccess } from "@/features/sales/pages/useSalesAccess";

const SalesListPage = ({ basePath = "/sales" }: { basePath?: string }) => {
  const navigate = useNavigate();
  const { hasSalesAccess } = useSalesAccess();
  const todayIso = getIndiaDateIso();
  const [fromDate, setFromDate] = useState(getIndiaDateDaysAgoIso(30));
  const [toDate, setToDate] = useState(todayIso);
  const safeFromDate = fromDate <= toDate ? fromDate : toDate;
  const safeToDate = fromDate <= toDate ? toDate : fromDate;

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: salesQueryKeys.invoices(safeFromDate, safeToDate),
    queryFn: () => salesRepository.listInvoices(safeFromDate, safeToDate),
    enabled: hasSalesAccess,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  if (!hasSalesAccess) return null;

  return (
    <section className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sales Invoices</h2>
          <Button type="button" size="sm" onClick={() => navigate(`${basePath}/create`)}>
            Create New Invoice
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">From</span>
          <Input
            type="date"
            value={fromDate}
            max={todayIso}
            onChange={(e) => setFromDate(e.target.value || getIndiaDateDaysAgoIso(30))}
            className="h-9 w-[150px]"
          />
          <span className="text-muted-foreground">To</span>
          <Input
            type="date"
            value={toDate}
            max={todayIso}
            onChange={(e) => setToDate(e.target.value || todayIso)}
            className="h-9 w-[150px]"
          />
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading invoices...</p>
        ) : invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground">No invoices in selected range.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="border border-border rounded-md p-3">
                <div className="grid sm:grid-cols-7 gap-2 text-sm">
                  <p className="font-semibold">{invoice.invoice_no}</p>
                  <p>{invoice.restaurant_name}</p>
                  <p>{formatIsoDateDdMmYyyy(invoice.invoice_date)}</p>
                  <p>{invoice.status}</p>
                  <p>INR {invoice.grand_total}</p>
                  <p>Due INR {invoice.due_amount}</p>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => navigate(`${basePath}/${invoice.id}`)}>
                      View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`${basePath}/${invoice.id}/edit`)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`${basePath}/${invoice.id}?action=payment`)}
                    >
                      Add Payment
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SalesListPage;
