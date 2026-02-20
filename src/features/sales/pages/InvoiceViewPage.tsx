import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { computeSalesTotals } from "@/features/sales/domain/salesDomain";
import { salesQueryKeys } from "@/features/sales/queryKeys";
import { salesRepository } from "@/features/sales/repositories/salesRepository";
import type { SalesPayment } from "@/features/sales/types";
import InvoiceSummary from "@/features/sales/components/InvoiceSummary";
import InvoiceTable from "@/features/sales/components/InvoiceTable";
import PaymentPanel from "@/features/sales/components/PaymentPanel";
import { useSalesAccess } from "@/features/sales/pages/useSalesAccess";

const InvoiceViewPage = ({ basePath = "/sales" }: { basePath?: string }) => {
  const { id: invoiceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasSalesAccess } = useSalesAccess();
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<Exclude<SalesPayment["method"], null>>("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
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

  const { data: lines = [], isLoading: isLinesLoading } = useQuery({
    queryKey: salesQueryKeys.invoiceLines(invoiceId || null),
    queryFn: async () => {
      if (!invoiceId) return [];
      return salesRepository.getInvoiceLines(invoiceId);
    },
    enabled: hasSalesAccess && !!invoiceId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: salesQueryKeys.payments(invoiceId || null),
    queryFn: async () => {
      if (!invoiceId) return [];
      return salesRepository.listPayments(invoiceId);
    },
    enabled: hasSalesAccess && !!invoiceId,
  });

  const totals = computeSalesTotals(
    lines,
    Number(invoice?.discount_amount || 0),
    Number(invoice?.other_charges || 0),
  );

  const addPayment = useMutation({
    mutationFn: async () => {
      if (!invoiceId || !invoice) throw new Error("Invoice not found.");
      if (invoice.status === "cancelled") throw new Error("Cannot add payment to cancelled invoice.");
      const amount = Math.max(0, Number(paymentAmount) || 0);
      if (amount <= 0) throw new Error("Enter valid payment amount.");
      if (!paymentMethod) throw new Error("Select payment method.");
      await salesRepository.addPayment(invoiceId, amount, paymentMethod, paymentNotes);
    },
    onSuccess: async () => {
      setError("");
      setSuccess("Payment added.");
      setPaymentAmount("0");
      setPaymentMethod("cash");
      setPaymentNotes("");
      if (!invoiceId) return;
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["sales", "invoice", invoiceId] }),
        queryClient.refetchQueries({ queryKey: salesQueryKeys.payments(invoiceId) }),
      ]);
    },
    onError: (mutationError: Error) => {
      setSuccess("");
      setError(mutationError.message || "Could not add payment.");
    },
  });

  if (!hasSalesAccess) return null;
  if (!invoiceId) return <p className="text-xs text-destructive">Invalid invoice ID.</p>;

  return (
    <section className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Invoice View</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate(`${basePath}/${invoiceId}/edit`)}
            >
              Edit
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
              <InvoiceTable lines={lines} editable={false} />
            )}

            <InvoiceSummary
              totals={totals}
              discountAmount={String(invoice.discount_amount || 0)}
              otherCharges={String(invoice.other_charges || 0)}
              notes={invoice.notes || ""}
              editable={false}
            />

            <PaymentPanel
              invoice={invoice}
              payments={payments}
              paymentAmount={paymentAmount}
              paymentMethod={paymentMethod}
              paymentNotes={paymentNotes}
              isSubmitting={addPayment.isPending}
              onChangeAmount={setPaymentAmount}
              onChangeMethod={setPaymentMethod}
              onChangeNotes={setPaymentNotes}
              onSubmit={() => addPayment.mutate()}
            />
          </>
        )}
      </div>
    </section>
  );
};

export default InvoiceViewPage;
