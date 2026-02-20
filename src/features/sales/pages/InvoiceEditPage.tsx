import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { computeLineTotal, computeSalesTotals, round2 } from "@/features/sales/domain/salesDomain";
import { salesQueryKeys } from "@/features/sales/queryKeys";
import { salesRepository } from "@/features/sales/repositories/salesRepository";
import type { SalesInvoiceLine } from "@/features/sales/types";
import InvoiceSummary from "@/features/sales/components/InvoiceSummary";
import InvoiceTable from "@/features/sales/components/InvoiceTable";
import { useSalesAccess } from "@/features/sales/pages/useSalesAccess";

const InvoiceEditPage = ({ basePath = "/sales" }: { basePath?: string }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: invoiceId } = useParams<{ id: string }>();
  const { hasSalesAccess, isAdminEditor, actorName } = useSalesAccess();

  const [discountAmount, setDiscountAmount] = useState("0");
  const [otherCharges, setOtherCharges] = useState("0");
  const [notes, setNotes] = useState("");
  const [workingLines, setWorkingLines] = useState<SalesInvoiceLine[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: invoice, isLoading: isInvoiceLoading } = useQuery({
    queryKey: ["sales", "invoice", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      return salesRepository.getInvoiceById(invoiceId);
    },
    enabled: hasSalesAccess && !!invoiceId,
  });

  const { data: invoiceLines = [], isLoading: isLinesLoading } = useQuery({
    queryKey: salesQueryKeys.invoiceLines(invoiceId || null),
    queryFn: async () => {
      if (!invoiceId) return [] as SalesInvoiceLine[];
      return salesRepository.getInvoiceLines(invoiceId);
    },
    enabled: hasSalesAccess && !!invoiceId,
  });

  useEffect(() => {
    if (!invoice) return;
    setDiscountAmount(String(invoice.discount_amount || 0));
    setOtherCharges(String(invoice.other_charges || 0));
    setNotes(invoice.notes || "");
    setWorkingLines(invoiceLines);
  }, [invoice, invoiceLines]);

  const canEdit =
    !!invoice && (invoice.status === "draft" || (isAdminEditor && invoice.status === "finalized"));

  const totals = useMemo(
    () => computeSalesTotals(workingLines, Number(discountAmount), Number(otherCharges)),
    [workingLines, discountAmount, otherCharges],
  );

  const saveDraft = useMutation({
    mutationFn: async () => {
      if (!invoiceId || !invoice) throw new Error("Invoice not found.");
      if (!canEdit) throw new Error("This invoice is not editable.");
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
        invoiceId,
        Number(discountAmount) || 0,
        Number(otherCharges) || 0,
        notes,
      );
      await salesRepository.updateInvoiceTotals(invoiceId);
    },
    onSuccess: async () => {
      setError("");
      setSuccess("Invoice saved.");
      if (!invoiceId) return;
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["sales", "invoice", invoiceId] }),
        queryClient.refetchQueries({ queryKey: salesQueryKeys.invoiceLines(invoiceId) }),
        queryClient.invalidateQueries({ queryKey: ["sales", "invoices"] }),
      ]);
    },
    onError: (mutationError: Error) => {
      setSuccess("");
      setError(mutationError.message || "Could not save invoice.");
    },
  });

  const finalizeInvoice = useMutation({
    mutationFn: async () => {
      if (!invoiceId || !invoice) throw new Error("Invoice not found.");
      if (invoice.status === "cancelled") throw new Error("Cancelled invoice cannot be finalized.");
      if (invoice.status === "finalized") return;
      await saveDraft.mutateAsync();
      const refreshed = await salesRepository.getInvoiceById(invoiceId);
      if ((refreshed.grand_total || 0) <= 0) throw new Error("Grand total must be greater than zero.");
      await salesRepository.finalizeInvoice(invoiceId, actorName);
    },
    onSuccess: async () => {
      setError("");
      setSuccess("Invoice finalized.");
      if (!invoiceId) return;
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["sales", "invoice", invoiceId] }),
        queryClient.refetchQueries({ queryKey: salesQueryKeys.invoiceLines(invoiceId) }),
      ]);
    },
    onError: (mutationError: Error) => {
      setSuccess("");
      setError(mutationError.message || "Could not finalize invoice.");
    },
  });

  const onChangeQty = (lineId: string, nextQty: number) => {
    setWorkingLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? { ...line, qty: nextQty, line_total: computeLineTotal(nextQty, Number(line.unit_price) || 0) }
          : line,
      ),
    );
  };

  const onChangeUnitPrice = (lineId: string, nextPrice: number) => {
    setWorkingLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? { ...line, unit_price: nextPrice, line_total: computeLineTotal(Number(line.qty) || 0, nextPrice) }
          : line,
      ),
    );
  };

  if (!hasSalesAccess) return null;
  if (!invoiceId) return <p className="text-xs text-destructive">Invalid invoice ID.</p>;

  return (
    <section className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Edit Invoice</h2>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => navigate(`${basePath}/${invoiceId}`)}>
              View
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => navigate(basePath)}>
              Back
            </Button>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && <p className="text-xs text-emerald-700">{success}</p>}

        {isInvoiceLoading ? (
          <p className="text-xs text-muted-foreground">Loading invoice...</p>
        ) : !invoice ? (
          <p className="text-xs text-muted-foreground">Invoice not found.</p>
        ) : (
          <>
            <p className="text-sm font-semibold">
              {invoice.invoice_no} · {invoice.restaurant_name} · {invoice.status}
            </p>

            {isLinesLoading ? (
              <p className="text-xs text-muted-foreground">Loading lines...</p>
            ) : (
              <InvoiceTable
                lines={workingLines}
                editable={canEdit}
                onChangeQty={onChangeQty}
                onChangeUnitPrice={onChangeUnitPrice}
              />
            )}

            <InvoiceSummary
              totals={totals}
              discountAmount={discountAmount}
              otherCharges={otherCharges}
              notes={notes}
              editable={canEdit}
              onChangeDiscount={setDiscountAmount}
              onChangeOtherCharges={setOtherCharges}
              onChangeNotes={setNotes}
            />

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => saveDraft.mutate()} disabled={!canEdit || saveDraft.isPending}>
                Save Draft
              </Button>
              <Button
                type="button"
                onClick={() => finalizeInvoice.mutate()}
                disabled={invoice.status === "cancelled" || finalizeInvoice.isPending}
              >
                Finalize
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default InvoiceEditPage;
