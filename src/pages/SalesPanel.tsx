import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { APP_CONFIG } from "@/config/app";
import { getIndiaDateDaysAgoIso, getIndiaDateIso } from "@/lib/datetime";
import { salesRepository } from "@/features/sales/repositories/salesRepository";
import { salesQueryKeys } from "@/features/sales/queryKeys";
import { computeLineTotal, computeSalesTotals, round2 } from "@/features/sales/domain/salesDomain";
import type { DeliveredOrder, SalesInvoiceLine, SalesPayment } from "@/features/sales/types";
import OrderSelector from "@/features/sales/components/OrderSelector";
import InvoiceEditor from "@/features/sales/components/InvoiceEditor";
import InvoiceList from "@/features/sales/components/InvoiceList";
import PaymentPanel from "@/features/sales/components/PaymentPanel";

export type SalesTabKey = "invoices" | "create" | "payments";
const EMPTY_LINES: SalesInvoiceLine[] = [];

interface SalesPanelProps {
  activeTab: SalesTabKey;
  onTabChange: (tab: SalesTabKey) => void;
}

const SalesPanel = ({ activeTab, onTabChange }: SalesPanelProps) => {
  const ORDERS_PAGE_SIZE = 120;
  const INVOICES_PAGE_SIZE = 120;
  const queryClient = useQueryClient();
  const purchaseSessionRaw = sessionStorage.getItem(APP_CONFIG.purchase.userKey);
  const purchaseSessionUser = useMemo(() => {
    if (!purchaseSessionRaw) return null;
    try {
      return JSON.parse(purchaseSessionRaw) as { id: string; name: string; username: string; role?: string };
    } catch {
      return null;
    }
  }, [purchaseSessionRaw]);

  const actorName = purchaseSessionUser?.username || "admin";
  const todayIso = getIndiaDateIso();
  const [fromDate, setFromDate] = useState(getIndiaDateDaysAgoIso(30));
  const [toDate, setToDate] = useState(todayIso);
  const safeFromDate = fromDate <= toDate ? fromDate : toDate;
  const safeToDate = fromDate <= toDate ? toDate : fromDate;
  const isAdminEditor = actorName === "admin";

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [otherCharges, setOtherCharges] = useState("0");
  const [notes, setNotes] = useState("");
  const [workingLines, setWorkingLines] = useState<SalesInvoiceLine[]>([]);
  const [paymentInput, setPaymentInput] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<Exclude<SalesPayment["method"], null>>("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [salesError, setSalesError] = useState("");
  const [salesSuccess, setSalesSuccess] = useState("");
  const [ordersPage, setOrdersPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);

  const { data: deliveredOrders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: salesQueryKeys.deliveredOrders(safeFromDate, safeToDate, ordersPage, ORDERS_PAGE_SIZE),
    queryFn: () => salesRepository.listDeliveredOrders(safeFromDate, safeToDate, ordersPage, ORDERS_PAGE_SIZE),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    enabled: activeTab === "create",
  });

  const { data: invoicedOrderIds = [] } = useQuery({
    queryKey: salesQueryKeys.invoicedOrderIds(safeFromDate, safeToDate),
    queryFn: () => salesRepository.listInvoicedOrderIds(safeFromDate, safeToDate),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    enabled: activeTab === "create",
  });

  const { data: salesInvoices = [], isLoading: isInvoicesLoading } = useQuery({
    queryKey: salesQueryKeys.invoices(safeFromDate, safeToDate, invoicesPage, INVOICES_PAGE_SIZE),
    queryFn: () => salesRepository.listInvoices(safeFromDate, safeToDate, invoicesPage, INVOICES_PAGE_SIZE),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    enabled: activeTab === "invoices" || activeTab === "payments",
  });

  useEffect(() => {
    setOrdersPage(1);
    setInvoicesPage(1);
  }, [safeFromDate, safeToDate]);

  const selectedInvoice = useMemo(
    () => salesInvoices.find((invoice) => invoice.id === selectedInvoiceId) || null,
    [salesInvoices, selectedInvoiceId],
  );

  const { data: selectedInvoiceLines = EMPTY_LINES, isLoading: isLinesLoading } = useQuery({
    queryKey: salesQueryKeys.invoiceLines(selectedInvoiceId),
    queryFn: async () => {
      if (!selectedInvoiceId) return [] as SalesInvoiceLine[];
      return salesRepository.getInvoiceLines(selectedInvoiceId);
    },
    enabled: !!selectedInvoiceId,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const { data: selectedInvoiceOrders = [] } = useQuery({
    queryKey: salesQueryKeys.invoiceOrders(selectedInvoiceId),
    queryFn: async () => {
      if (!selectedInvoiceId) return [];
      return salesRepository.listInvoiceOrders(selectedInvoiceId);
    },
    enabled: !!selectedInvoiceId,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const { data: selectedPayments = [] } = useQuery({
    queryKey: salesQueryKeys.payments(selectedInvoiceId),
    queryFn: async () => {
      if (!selectedInvoiceId) return [];
      return salesRepository.listPayments(selectedInvoiceId);
    },
    enabled: !!selectedInvoiceId,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!selectedInvoice) {
      setDiscountAmount("0");
      setOtherCharges("0");
      setNotes("");
      setPaymentInput("0");
      setWorkingLines((prev) => (prev.length === 0 ? prev : EMPTY_LINES));
      return;
    }

    setDiscountAmount(String(selectedInvoice.discount_amount || 0));
    setOtherCharges(String(selectedInvoice.other_charges || 0));
    setNotes(selectedInvoice.notes || "");
    setPaymentInput("0");
    setPaymentMethod("cash");
    setPaymentNotes("");
    setWorkingLines((prev) => (prev === selectedInvoiceLines ? prev : selectedInvoiceLines));
  }, [selectedInvoice, selectedInvoiceLines]);

  const invoicedOrderIdSet = useMemo(() => new Set(invoicedOrderIds), [invoicedOrderIds]);

  const selectedOrders = useMemo(
    () => deliveredOrders.filter((order) => selectedOrderIds.includes(order.id)),
    [deliveredOrders, selectedOrderIds],
  );

  const selectedRestaurantId = selectedOrders[0]?.restaurant_id || null;

  const totals = useMemo(
    () => computeSalesTotals(workingLines, Number(discountAmount), Number(otherCharges)),
    [workingLines, discountAmount, otherCharges],
  );

  const canEditInvoice =
    !!selectedInvoice &&
    (selectedInvoice.status === "draft" || (isAdminEditor && selectedInvoice.status === "finalized"));

  const createInvoiceFromOrders = useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (orderIds.length === 0) throw new Error("Select at least one delivered order.");
      return salesRepository.createInvoiceFromOrders(orderIds);
    },
    onSuccess: async (invoiceId) => {
      setSalesError("");
      setWorkingLines([]);
      setSelectedInvoiceId(invoiceId);
      setSelectedOrderIds([]);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: salesQueryKeys.invoices(safeFromDate, safeToDate, invoicesPage, INVOICES_PAGE_SIZE) }),
        queryClient.refetchQueries({ queryKey: salesQueryKeys.deliveredOrders(safeFromDate, safeToDate, ordersPage, ORDERS_PAGE_SIZE) }),
        queryClient.refetchQueries({ queryKey: salesQueryKeys.invoicedOrderIds(safeFromDate, safeToDate) }),
        queryClient.refetchQueries({ queryKey: salesQueryKeys.invoiceLines(invoiceId) }),
        queryClient.refetchQueries({ queryKey: salesQueryKeys.invoiceOrders(invoiceId) }),
      ]);
      setSalesSuccess("Invoice draft created.");
    },
    onError: (error: Error) => {
      setSalesSuccess("");
      setSalesError(error.message || "Could not create invoice.");
    },
  });

  const saveInvoiceDraft = useMutation({
    mutationFn: async () => {
      if (!selectedInvoiceId || !selectedInvoice) throw new Error("Select an invoice first.");
      if (selectedInvoice.status !== "draft" && !isAdminEditor) {
        throw new Error("Only admin can edit finalized invoices.");
      }

      const updatedLines = workingLines.map((line) => {
        const qty = Math.max(0, Number(line.qty) || 0);
        const unitPrice = Math.max(0, Number(line.unit_price) || 0);
        return {
          ...line,
          qty,
          unit_price: unitPrice,
          line_total: round2(qty * unitPrice),
          updated_at: new Date().toISOString(),
        };
      });

      await salesRepository.upsertInvoiceLines(updatedLines);
      await salesRepository.updateInvoiceDraft(
        selectedInvoiceId,
        Number(discountAmount) || 0,
        Number(otherCharges) || 0,
        notes,
      );
      await salesRepository.updateInvoiceTotals(selectedInvoiceId);
    },
    onSuccess: async () => {
      setSalesError("");
      if (selectedInvoiceId) {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: salesQueryKeys.invoices(safeFromDate, safeToDate, invoicesPage, INVOICES_PAGE_SIZE) }),
          queryClient.refetchQueries({ queryKey: salesQueryKeys.invoiceLines(selectedInvoiceId) }),
          queryClient.refetchQueries({ queryKey: salesQueryKeys.payments(selectedInvoiceId) }),
        ]);
      }
      setSalesSuccess("Invoice saved.");
    },
    onError: (error: Error) => {
      setSalesSuccess("");
      setSalesError(error.message || "Could not save draft.");
    },
  });

  const finalizeInvoice = useMutation({
    mutationFn: async () => {
      if (!selectedInvoiceId || !selectedInvoice) throw new Error("Select an invoice first.");
      if (selectedInvoice.status === "cancelled") throw new Error("Cancelled invoice cannot be finalized.");
      if (selectedInvoice.status === "finalized") return;

      await saveInvoiceDraft.mutateAsync();

      const refreshedInvoice = await salesRepository.getInvoiceById(selectedInvoiceId);
      if ((refreshedInvoice.grand_total || 0) <= 0) throw new Error("Grand total must be greater than zero.");
      await salesRepository.finalizeInvoice(refreshedInvoice.id, actorName);
    },
    onSuccess: async () => {
      setSalesError("");
      setWorkingLines([]);
      if (selectedInvoiceId) {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: salesQueryKeys.invoices(safeFromDate, safeToDate, invoicesPage, INVOICES_PAGE_SIZE) }),
          queryClient.refetchQueries({ queryKey: salesQueryKeys.invoiceLines(selectedInvoiceId) }),
        ]);
      }
      setSalesSuccess("Invoice finalized.");
    },
    onError: (error: Error) => {
      setSalesSuccess("");
      setSalesError(error.message || "Could not finalize invoice.");
    },
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!selectedInvoice) throw new Error("Select an invoice first.");
      if (selectedInvoice.status === "cancelled") throw new Error("Cannot add payment to cancelled invoice.");

      const addAmount = Math.max(0, Number(paymentInput) || 0);
      if (addAmount <= 0) throw new Error("Enter valid payment amount.");
      if (!paymentMethod) throw new Error("Select payment method.");

      await salesRepository.addPayment(selectedInvoice.id, addAmount, paymentMethod, paymentNotes);
    },
    onSuccess: async () => {
      setSalesError("");
      setSalesSuccess("Payment recorded.");
      setPaymentInput("0");
      setPaymentMethod("cash");
      setPaymentNotes("");
      if (selectedInvoiceId) {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: salesQueryKeys.invoices(safeFromDate, safeToDate, invoicesPage, INVOICES_PAGE_SIZE) }),
          queryClient.refetchQueries({ queryKey: salesQueryKeys.payments(selectedInvoiceId) }),
        ]);
      }
    },
    onError: (error: Error) => {
      setSalesSuccess("");
      setSalesError(error.message || "Could not record payment.");
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
        setSalesError("Select orders from one restaurant only.");
        setSalesSuccess("");
        return prev;
      }

      setSalesError("");
      return [...prev, order.id];
    });
  };

  const onChangeQty = (lineId: string, nextQty: number) => {
    setWorkingLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              qty: nextQty,
              line_total: computeLineTotal(nextQty, Number(line.unit_price) || 0),
            }
          : line,
      ),
    );
  };

  const onChangeUnitPrice = (lineId: string, nextPrice: number) => {
    setWorkingLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              unit_price: nextPrice,
              line_total: computeLineTotal(Number(line.qty) || 0, nextPrice),
            }
          : line,
      ),
    );
  };

  return (
    <section className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sales</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
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
            {activeTab === "create" && (
              <>
                <button
                  type="button"
                  className="h-9 px-3 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-50"
                  disabled={ordersPage <= 1}
                  onClick={() => setOrdersPage((prev) => Math.max(1, prev - 1))}
                >
                  Prev Orders
                </button>
                <span className="text-muted-foreground">Page {ordersPage}</span>
                <button
                  type="button"
                  className="h-9 px-3 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-50"
                  disabled={deliveredOrders.length < ORDERS_PAGE_SIZE}
                  onClick={() => setOrdersPage((prev) => prev + 1)}
                >
                  Next Orders
                </button>
              </>
            )}
            {(activeTab === "invoices" || activeTab === "payments") && (
              <>
                <button
                  type="button"
                  className="h-9 px-3 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-50"
                  disabled={invoicesPage <= 1}
                  onClick={() => setInvoicesPage((prev) => Math.max(1, prev - 1))}
                >
                  Prev Invoices
                </button>
                <span className="text-muted-foreground">Page {invoicesPage}</span>
                <button
                  type="button"
                  className="h-9 px-3 rounded-md border border-border bg-card hover:bg-accent disabled:opacity-50"
                  disabled={salesInvoices.length < INVOICES_PAGE_SIZE}
                  onClick={() => setInvoicesPage((prev) => prev + 1)}
                >
                  Next Invoices
                </button>
              </>
            )}
          </div>
        </div>

        {salesError && <p className="text-xs text-destructive mb-2">{salesError}</p>}
        {salesSuccess && <p className="text-xs text-emerald-700 mb-2">{salesSuccess}</p>}

        {activeTab === "invoices" && (
          <div className="grid gap-4">
            <InvoiceList
              invoices={salesInvoices}
              isLoading={isInvoicesLoading}
              selectedInvoiceId={selectedInvoiceId}
              onSelectInvoice={setSelectedInvoiceId}
              onView={setSelectedInvoiceId}
              onEdit={setSelectedInvoiceId}
              onAddPayment={(invoiceId) => {
                setSelectedInvoiceId(invoiceId);
                onTabChange("payments");
              }}
            />
            <InvoiceEditor
              invoice={selectedInvoice}
              linkedOrdersCount={selectedInvoiceOrders.length}
              lines={workingLines}
              isLoadingLines={isLinesLoading}
              canEdit={canEditInvoice}
              discountAmount={discountAmount}
              otherCharges={otherCharges}
              notes={notes}
              totals={totals}
              isSavePending={saveInvoiceDraft.isPending}
              isFinalizePending={finalizeInvoice.isPending}
              onChangeQty={onChangeQty}
              onChangeUnitPrice={onChangeUnitPrice}
              onChangeDiscount={setDiscountAmount}
              onChangeOtherCharges={setOtherCharges}
              onChangeNotes={setNotes}
              onSaveDraft={() => saveInvoiceDraft.mutate()}
              onFinalize={() => finalizeInvoice.mutate()}
            />
          </div>
        )}

        {activeTab === "create" && (
          <OrderSelector
            orders={deliveredOrders}
            isLoading={isOrdersLoading}
            selectedOrderIds={selectedOrderIds}
            selectedRestaurantId={selectedRestaurantId}
            invoicedOrderIdSet={invoicedOrderIdSet}
            isCreatePending={createInvoiceFromOrders.isPending}
            onToggleOrder={toggleOrderSelection}
            onClearSelection={() => setSelectedOrderIds([])}
            onCreateInvoice={() => {
              createInvoiceFromOrders.mutate(selectedOrderIds, {
                onSuccess: () => onTabChange("invoices"),
              });
            }}
          />
        )}

        {activeTab === "payments" && (
          <div className="grid md:grid-cols-2 gap-4">
            <InvoiceList
              invoices={salesInvoices}
              isLoading={isInvoicesLoading}
              selectedInvoiceId={selectedInvoiceId}
              onSelectInvoice={setSelectedInvoiceId}
              onView={setSelectedInvoiceId}
              onEdit={(invoiceId) => {
                setSelectedInvoiceId(invoiceId);
                onTabChange("invoices");
              }}
              onAddPayment={setSelectedInvoiceId}
            />
            <PaymentPanel
              invoice={selectedInvoice}
              payments={selectedPayments}
              paymentAmount={paymentInput}
              paymentMethod={paymentMethod}
              paymentNotes={paymentNotes}
              isSubmitting={recordPayment.isPending}
              onChangeAmount={setPaymentInput}
              onChangeMethod={setPaymentMethod}
              onChangeNotes={setPaymentNotes}
              onSubmit={() => recordPayment.mutate()}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default SalesPanel;
