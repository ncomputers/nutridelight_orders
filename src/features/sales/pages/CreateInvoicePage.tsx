import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getIndiaDateDaysAgoIso, getIndiaDateIso } from "@/lib/datetime";
import { salesQueryKeys } from "@/features/sales/queryKeys";
import { salesRepository } from "@/features/sales/repositories/salesRepository";
import type { DeliveredOrder } from "@/features/sales/types";
import OrderSelector from "@/features/sales/components/OrderSelector";
import { useSalesAccess } from "@/features/sales/pages/useSalesAccess";

const CreateInvoicePage = ({ basePath = "/sales" }: { basePath?: string }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasSalesAccess } = useSalesAccess();
  const todayIso = getIndiaDateIso();
  const [fromDate, setFromDate] = useState(getIndiaDateDaysAgoIso(30));
  const [toDate, setToDate] = useState(todayIso);
  const safeFromDate = fromDate <= toDate ? fromDate : toDate;
  const safeToDate = fromDate <= toDate ? toDate : fromDate;
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const { data: deliveredOrders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: salesQueryKeys.deliveredOrders(safeFromDate, safeToDate),
    queryFn: () => salesRepository.listDeliveredOrders(safeFromDate, safeToDate),
    enabled: hasSalesAccess,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const { data: invoicedOrderIds = [] } = useQuery({
    queryKey: salesQueryKeys.invoicedOrderIds(safeFromDate, safeToDate),
    queryFn: () => salesRepository.listInvoicedOrderIds(safeFromDate, safeToDate),
    enabled: hasSalesAccess,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const selectedOrders = useMemo(
    () => deliveredOrders.filter((order) => selectedOrderIds.includes(order.id)),
    [deliveredOrders, selectedOrderIds],
  );
  const selectedRestaurantId = selectedOrders[0]?.restaurant_id || null;
  const invoicedOrderIdSet = useMemo(() => new Set(invoicedOrderIds), [invoicedOrderIds]);

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (selectedOrderIds.length === 0) throw new Error("Select at least one delivered order.");
      return salesRepository.createInvoiceFromOrders(selectedOrderIds);
    },
    onSuccess: async (invoiceId) => {
      setError("");
      await Promise.all([
        queryClient.refetchQueries({ queryKey: salesQueryKeys.invoices(safeFromDate, safeToDate) }),
        queryClient.refetchQueries({ queryKey: salesQueryKeys.deliveredOrders(safeFromDate, safeToDate) }),
        queryClient.refetchQueries({ queryKey: salesQueryKeys.invoicedOrderIds(safeFromDate, safeToDate) }),
      ]);
      navigate(`${basePath}/${invoiceId}/edit`);
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message || "Could not create invoice.");
    },
  });

  const toggleOrderSelection = (order: DeliveredOrder) => {
    setSelectedOrderIds((prev) => {
      if (invoicedOrderIdSet.has(order.id)) return prev;
      const exists = prev.includes(order.id);
      if (exists) return prev.filter((id) => id !== order.id);
      const selected = deliveredOrders.filter((row) => prev.includes(row.id));
      const firstRestaurant = selected[0]?.restaurant_id || null;
      if (firstRestaurant && firstRestaurant !== order.restaurant_id) {
        setError("Select orders from one restaurant only.");
        return prev;
      }
      setError("");
      return [...prev, order.id];
    });
  };

  if (!hasSalesAccess) return null;

  return (
    <section className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Create Invoice</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(basePath)}>
            Back to Invoices
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

        {error && <p className="text-xs text-destructive">{error}</p>}

        <OrderSelector
          orders={deliveredOrders}
          isLoading={isOrdersLoading}
          selectedOrderIds={selectedOrderIds}
          selectedRestaurantId={selectedRestaurantId}
          invoicedOrderIdSet={invoicedOrderIdSet}
          isCreatePending={createInvoice.isPending}
          onToggleOrder={toggleOrderSelection}
          onClearSelection={() => {
            setSelectedOrderIds([]);
            setError("");
          }}
          onCreateInvoice={() => createInvoice.mutate()}
        />
      </div>
    </section>
  );
};

export default CreateInvoicePage;
