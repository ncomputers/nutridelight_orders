import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_CONFIG } from "@/config/app";
import { formatIsoDateDdMmYyyy, getIndiaDateDaysAgoIso, getIndiaDateIso } from "@/lib/datetime";

interface OrderItem {
  code?: string;
  en: string;
  hi: string;
  qty: number;
  category: string;
}

interface DeliveredOrder {
  id: string;
  order_ref: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  delivery_date: string;
  created_at: string;
  items: OrderItem[];
}

interface SalesInvoice {
  id: string;
  invoice_no: string;
  order_id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  invoice_date: string;
  delivery_date: string;
  status: "draft" | "finalized" | "cancelled";
  subtotal: number;
  discount_amount: number;
  other_charges: number;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  payment_status: "unpaid" | "partial" | "paid";
  notes: string | null;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  finalized_by: string | null;
}

interface SalesInvoiceLine {
  id: string;
  invoice_id: string;
  item_code: string | null;
  item_en: string;
  item_hi: string | null;
  qty: number;
  unit: string;
  unit_price: number;
  line_total: number;
  line_note: string | null;
  created_at: string;
  updated_at: string;
}

const round2 = (value: number) => Number(value.toFixed(2));

const makeInvoiceNo = (dateIso: string) =>
  `SI-${dateIso.replaceAll("-", "")}-${Math.floor(10000 + Math.random() * 90000)}`;

const makeVoucherNo = (dateIso: string) =>
  `SV-${dateIso.replaceAll("-", "")}-${Math.floor(10000 + Math.random() * 90000)}`;

const SalesPanel = () => {
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
  const actorRole = purchaseSessionUser?.role === "sales" ? "sales" : "admin";
  const actorName = purchaseSessionUser?.username || "admin";
  const actorUserId = purchaseSessionUser?.id || null;
  const todayIso = getIndiaDateIso();
  const [fromDate, setFromDate] = useState(getIndiaDateDaysAgoIso(30));
  const [toDate, setToDate] = useState(todayIso);
  const safeFromDate = fromDate <= toDate ? fromDate : toDate;
  const safeToDate = fromDate <= toDate ? toDate : fromDate;

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [otherCharges, setOtherCharges] = useState("0");
  const [notes, setNotes] = useState("");
  const [workingLines, setWorkingLines] = useState<SalesInvoiceLine[]>([]);
  const [paymentInput, setPaymentInput] = useState("0");
  const [salesError, setSalesError] = useState("");
  const [salesSuccess, setSalesSuccess] = useState("");

  const { data: deliveredOrders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ["sales-delivered-orders", safeFromDate, safeToDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_ref,restaurant_id,restaurant_name,restaurant_slug,delivery_date,created_at,items")
        .eq("status", "delivered")
        .gte("delivery_date", safeFromDate)
        .lte("delivery_date", safeToDate)
        .order("delivery_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as DeliveredOrder[];
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const { data: salesInvoices = [], isLoading: isInvoicesLoading } = useQuery({
    queryKey: ["sales-invoices", safeFromDate, safeToDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_invoices")
        .select("*")
        .gte("invoice_date", safeFromDate)
        .lte("invoice_date", safeToDate)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as SalesInvoice[];
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const selectedInvoice = useMemo(
    () => salesInvoices.find((invoice) => invoice.id === selectedInvoiceId) || null,
    [salesInvoices, selectedInvoiceId],
  );

  const { data: selectedInvoiceLines = [], isLoading: isLinesLoading } = useQuery({
    queryKey: ["sales-invoice-lines", selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return [] as SalesInvoiceLine[];
      const { data, error } = await supabase
        .from("sales_invoice_lines")
        .select("*")
        .eq("invoice_id", selectedInvoiceId)
        .order("item_en", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SalesInvoiceLine[];
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
      setWorkingLines([]);
      return;
    }

    setDiscountAmount(String(selectedInvoice.discount_amount || 0));
    setOtherCharges(String(selectedInvoice.other_charges || 0));
    setNotes(selectedInvoice.notes || "");
    setPaymentInput("0");
    setWorkingLines(selectedInvoiceLines);
  }, [selectedInvoice, selectedInvoiceLines]);

  const invoicedOrderIds = useMemo(() => new Set(salesInvoices.map((invoice) => invoice.order_id)), [salesInvoices]);

  const readyOrders = useMemo(
    () => deliveredOrders.filter((order) => !invoicedOrderIds.has(order.id)),
    [deliveredOrders, invoicedOrderIds],
  );

  const totals = useMemo(() => {
    const subtotal = round2(
      workingLines.reduce((sum, line) => sum + round2(Number(line.qty || 0) * Number(line.unit_price || 0)), 0),
    );
    const discount = Math.max(0, Number(discountAmount) || 0);
    const other = Math.max(0, Number(otherCharges) || 0);
    const grand = round2(Math.max(0, subtotal - discount + other));
    return {
      subtotal,
      discount,
      other,
      grand,
    };
  }, [workingLines, discountAmount, otherCharges]);

  const createInvoiceFromOrder = useMutation({
    mutationFn: async (order: DeliveredOrder) => {
      if (!order.restaurant_id) {
        throw new Error("Missing restaurant on order.");
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const invoiceNo = makeInvoiceNo(todayIso);
        const { data: invoiceRow, error: invoiceError } = await supabase
          .from("sales_invoices")
          .insert({
            invoice_no: invoiceNo,
            order_id: order.id,
            restaurant_id: order.restaurant_id,
            restaurant_name: order.restaurant_name,
            restaurant_slug: order.restaurant_slug,
            invoice_date: todayIso,
            delivery_date: order.delivery_date,
            status: "draft",
            subtotal: 0,
            discount_amount: 0,
            other_charges: 0,
            grand_total: 0,
            paid_amount: 0,
            due_amount: 0,
            payment_status: "unpaid",
            notes: null,
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (invoiceError) {
          if (invoiceError.code === "23505") continue;
          throw invoiceError;
        }

        const lines = (order.items || []).map((item) => {
          const qty = Number(item.qty) || 0;
          return {
            invoice_id: invoiceRow.id,
            item_code: item.code || null,
            item_en: item.en,
            item_hi: item.hi || null,
            qty,
            unit: "kg",
            unit_price: 0,
            line_total: 0,
            line_note: null,
            updated_at: new Date().toISOString(),
          };
        });

        if (lines.length > 0) {
          const { error: linesError } = await supabase.from("sales_invoice_lines").insert(lines);
          if (linesError) throw linesError;
        }

        return invoiceRow.id as string;
      }

      throw new Error("Could not generate unique invoice number.");
    },
    onSuccess: (invoiceId) => {
      setSalesError("");
      setSalesSuccess("Invoice draft created.");
      setSelectedInvoiceId(invoiceId);
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sales-delivered-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-invoice-lines", invoiceId] });
    },
    onError: (error: Error) => {
      setSalesSuccess("");
      setSalesError(error.message || "Could not create invoice.");
    },
  });

  const saveInvoiceDraft = useMutation({
    mutationFn: async () => {
      if (!selectedInvoiceId || !selectedInvoice) throw new Error("Select an invoice first.");
      if (selectedInvoice.status !== "draft") throw new Error("Only draft invoices can be edited.");

      const updatedLines = workingLines.map((line) => {
        const qty = Number(line.qty) || 0;
        const unitPrice = Math.max(0, Number(line.unit_price) || 0);
        return {
          ...line,
          qty,
          unit_price: unitPrice,
          line_total: round2(qty * unitPrice),
          updated_at: new Date().toISOString(),
        };
      });

      if (updatedLines.length > 0) {
        const { error: linesError } = await supabase
          .from("sales_invoice_lines")
          .upsert(updatedLines, { onConflict: "id" });
        if (linesError) throw linesError;
      }

      const dueAmount = round2(Math.max(0, totals.grand - (Number(selectedInvoice.paid_amount) || 0)));
      const paymentStatus = dueAmount <= 0 ? "paid" : selectedInvoice.paid_amount > 0 ? "partial" : "unpaid";

      const { error } = await supabase
        .from("sales_invoices")
        .update({
          subtotal: totals.subtotal,
          discount_amount: totals.discount,
          other_charges: totals.other,
          grand_total: totals.grand,
          due_amount: dueAmount,
          payment_status: paymentStatus,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedInvoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      setSalesError("");
      setSalesSuccess("Invoice draft saved.");
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      if (selectedInvoiceId) queryClient.invalidateQueries({ queryKey: ["sales-invoice-lines", selectedInvoiceId] });
    },
    onError: (error: Error) => {
      setSalesSuccess("");
      setSalesError(error.message || "Could not save draft.");
    },
  });

  const finalizeInvoice = useMutation({
    mutationFn: async () => {
      if (!selectedInvoiceId || !selectedInvoice) throw new Error("Select an invoice first.");
      if (selectedInvoice.status !== "draft") throw new Error("Invoice is already finalized/cancelled.");

      await saveInvoiceDraft.mutateAsync();

      const { data: refreshedInvoice, error: invoiceFetchError } = await supabase
        .from("sales_invoices")
        .select("*")
        .eq("id", selectedInvoiceId)
        .single();
      if (invoiceFetchError) throw invoiceFetchError;
      if ((refreshedInvoice.grand_total || 0) <= 0) throw new Error("Grand total must be greater than zero.");

      const { data: existingVoucher } = await supabase
        .from("journal_vouchers")
        .select("id")
        .eq("source_type", "sales_invoice")
        .eq("source_id", refreshedInvoice.id)
        .eq("voucher_type", "adjustment")
        .limit(1);
      if (existingVoucher && existingVoucher.length > 0) {
        const { error: finalizeAgainError } = await supabase
          .from("sales_invoices")
          .update({
            status: "finalized",
            finalized_at: new Date().toISOString(),
            finalized_by: actorName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", refreshedInvoice.id);
        if (finalizeAgainError) throw finalizeAgainError;
        return;
      }

      const { data: ledgers, error: ledgerError } = await supabase
        .from("account_ledgers")
        .select("id,code")
        .in("code", ["ACCOUNTS_RECEIVABLE", "SALES_REVENUE"]);
      if (ledgerError) throw ledgerError;

      const arLedgerId = ledgers.find((l) => l.code === "ACCOUNTS_RECEIVABLE")?.id;
      const salesLedgerId = ledgers.find((l) => l.code === "SALES_REVENUE")?.id;
      if (!arLedgerId || !salesLedgerId) {
        throw new Error("Required ledgers (ACCOUNTS_RECEIVABLE/SALES_REVENUE) are missing.");
      }

      const voucherNo = makeVoucherNo(refreshedInvoice.invoice_date);
      const { data: voucher, error: voucherError } = await supabase
        .from("journal_vouchers")
        .insert({
          voucher_no: voucherNo,
          voucher_date: refreshedInvoice.invoice_date,
          voucher_type: "adjustment",
          voucher_amount: refreshedInvoice.grand_total,
          narration: `Sales Invoice ${refreshedInvoice.invoice_no} - ${refreshedInvoice.restaurant_name}`,
          source_type: "sales_invoice",
          source_id: refreshedInvoice.id,
          posted_by: actorName,
          created_by_user_id: actorUserId,
          actor_role: actorRole,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (voucherError) throw voucherError;

      const amount = round2(Number(refreshedInvoice.grand_total) || 0);
      const { error: lineError } = await supabase
        .from("journal_lines")
        .insert([
          {
            voucher_id: voucher.id,
            ledger_id: arLedgerId,
            dr_amount: amount,
            cr_amount: 0,
            line_note: `AR for ${refreshedInvoice.invoice_no}`,
          },
          {
            voucher_id: voucher.id,
            ledger_id: salesLedgerId,
            dr_amount: 0,
            cr_amount: amount,
            line_note: `Sales for ${refreshedInvoice.invoice_no}`,
          },
        ]);
      if (lineError) throw lineError;

      const { error: finalizeError } = await supabase
        .from("sales_invoices")
        .update({
          status: "finalized",
          finalized_at: new Date().toISOString(),
          finalized_by: actorName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", refreshedInvoice.id);
      if (finalizeError) throw finalizeError;
    },
    onSuccess: () => {
      setSalesError("");
      setSalesSuccess("Invoice finalized and posted.");
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["journal-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["journal-lines"] });
    },
    onError: (error: Error) => {
      setSalesSuccess("");
      setSalesError(error.message || "Could not finalize invoice.");
    },
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!selectedInvoice) throw new Error("Select an invoice first.");
      if (selectedInvoice.status !== "finalized") throw new Error("Payment can be recorded only on finalized invoices.");
      const addAmount = Math.max(0, Number(paymentInput) || 0);
      if (addAmount <= 0) throw new Error("Enter valid payment amount.");

      const nextPaid = round2((selectedInvoice.paid_amount || 0) + addAmount);
      const nextDue = round2(Math.max(0, (selectedInvoice.grand_total || 0) - nextPaid));
      const nextStatus = nextDue <= 0 ? "paid" : nextPaid > 0 ? "partial" : "unpaid";

      const { error } = await supabase
        .from("sales_invoices")
        .update({
          paid_amount: nextPaid,
          due_amount: nextDue,
          payment_status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedInvoice.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSalesError("");
      setSalesSuccess("Payment recorded.");
      setPaymentInput("0");
      queryClient.invalidateQueries({ queryKey: ["sales-invoices"] });
    },
    onError: (error: Error) => {
      setSalesSuccess("");
      setSalesError(error.message || "Could not record payment.");
    },
  });

  return (
    <section className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sales Invoices</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">From</span>
            <Input type="date" value={fromDate} max={todayIso} onChange={(e) => setFromDate(e.target.value || getIndiaDateDaysAgoIso(30))} className="h-9 w-[150px]" />
            <span className="text-muted-foreground">To</span>
            <Input type="date" value={toDate} max={todayIso} onChange={(e) => setToDate(e.target.value || todayIso)} className="h-9 w-[150px]" />
          </div>
        </div>

        {salesError && <p className="text-xs text-destructive mb-2">{salesError}</p>}
        {salesSuccess && <p className="text-xs text-emerald-700 mb-2">{salesSuccess}</p>}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-border rounded-md p-3">
            <h3 className="text-sm font-semibold mb-2">Ready For Invoice (Delivered)</h3>
            {isOrdersLoading ? (
              <p className="text-xs text-muted-foreground">Loading delivered orders...</p>
            ) : readyOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground">No delivered orders pending invoice in selected range.</p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                {readyOrders.map((order) => (
                  <div key={order.id} className="border border-border rounded-md p-2">
                    <p className="text-sm font-semibold">{order.restaurant_name}</p>
                    <p className="text-xs text-muted-foreground">Ref: {order.order_ref} · Del: {formatIsoDateDdMmYyyy(order.delivery_date)}</p>
                    <p className="text-xs text-muted-foreground">Items: {(order.items || []).length}</p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2"
                      onClick={() => createInvoiceFromOrder.mutate(order)}
                      disabled={createInvoiceFromOrder.isPending}
                    >
                      Create Invoice
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-border rounded-md p-3">
            <h3 className="text-sm font-semibold mb-2">Invoices</h3>
            {isInvoicesLoading ? (
              <p className="text-xs text-muted-foreground">Loading invoices...</p>
            ) : salesInvoices.length === 0 ? (
              <p className="text-xs text-muted-foreground">No invoices in selected range.</p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                {salesInvoices.map((invoice) => (
                  <button
                    key={invoice.id}
                    type="button"
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                    className={`w-full text-left border rounded-md p-2 ${selectedInvoiceId === invoice.id ? "border-primary bg-accent/40" : "border-border"}`}
                  >
                    <p className="text-sm font-semibold">{invoice.invoice_no}</p>
                    <p className="text-xs text-muted-foreground">{invoice.restaurant_name} · {formatIsoDateDdMmYyyy(invoice.invoice_date)}</p>
                    <p className="text-xs text-muted-foreground">INR {invoice.grand_total} · Due {invoice.due_amount} · {invoice.payment_status}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedInvoice && (
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold">{selectedInvoice.invoice_no}</h3>
              <p className="text-xs text-muted-foreground">{selectedInvoice.restaurant_name} · Delivery {formatIsoDateDdMmYyyy(selectedInvoice.delivery_date)}</p>
            </div>
            <p className="text-sm font-semibold">Status: {selectedInvoice.status}</p>
          </div>

          {isLinesLoading ? (
            <p className="text-xs text-muted-foreground">Loading invoice lines...</p>
          ) : (
            <div className="space-y-2">
              {workingLines.map((line) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-center border border-border rounded-md p-2">
                  <div className="col-span-5">
                    <p className="text-sm font-medium">{line.item_en}</p>
                    <p className="text-xs text-muted-foreground">{line.item_hi || "-"}</p>
                  </div>
                  <div className="col-span-2 text-sm">{line.qty} {line.unit}</div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step={0.01}
                      min={0}
                      value={line.unit_price}
                      disabled={selectedInvoice.status !== "draft"}
                      onChange={(e) => {
                        const price = Math.max(0, Number(e.target.value) || 0);
                        setWorkingLines((prev) =>
                          prev.map((row) =>
                            row.id === line.id
                              ? { ...row, unit_price: price, line_total: round2((Number(row.qty) || 0) * price) }
                              : row,
                          ),
                        );
                      }}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-3 text-right text-sm font-semibold">INR {round2((Number(line.qty) || 0) * (Number(line.unit_price) || 0))}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Discount</label>
              <Input type="number" min={0} step={0.01} value={discountAmount} disabled={selectedInvoice.status !== "draft"} onChange={(e) => setDiscountAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Other Charges</label>
              <Input type="number" min={0} step={0.01} value={otherCharges} disabled={selectedInvoice.status !== "draft"} onChange={(e) => setOtherCharges(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <Input value={notes} disabled={selectedInvoice.status !== "draft"} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div className="rounded-md border border-border p-2">
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="font-semibold">INR {totals.subtotal}</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-xs text-muted-foreground">Discount</p>
              <p className="font-semibold">INR {totals.discount}</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-xs text-muted-foreground">Other</p>
              <p className="font-semibold">INR {totals.other}</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-xs text-muted-foreground">Grand Total</p>
              <p className="font-semibold">INR {totals.grand}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => saveInvoiceDraft.mutate()} disabled={selectedInvoice.status !== "draft" || saveInvoiceDraft.isPending}>
              Save Draft
            </Button>
            <Button type="button" onClick={() => finalizeInvoice.mutate()} disabled={selectedInvoice.status !== "draft" || finalizeInvoice.isPending}>
              Finalize & Post
            </Button>
          </div>

          <div className="border-t border-border pt-3">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Add Payment</label>
                <Input type="number" min={0} step={0.01} value={paymentInput} onChange={(e) => setPaymentInput(e.target.value)} className="w-[180px]" />
              </div>
              <Button type="button" variant="outline" onClick={() => recordPayment.mutate()} disabled={selectedInvoice.status !== "finalized" || recordPayment.isPending}>
                Record Payment
              </Button>
              <p className="text-sm text-muted-foreground">Paid: INR {selectedInvoice.paid_amount} · Due: INR {selectedInvoice.due_amount} · {selectedInvoice.payment_status}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SalesPanel;
