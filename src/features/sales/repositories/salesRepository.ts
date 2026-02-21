import { supabase } from "@/integrations/supabase/client";
import type {
  DeliveredOrder,
  SalesInvoice,
  SalesInvoiceLine,
  SalesInvoiceOrder,
  SalesPayment,
} from "@/features/sales/types";

export const salesRepository = {
  async listDeliveredOrders(fromDate: string, toDate: string, page = 1, pageSize = 1000) {
    const safePageSize = Math.max(1, Math.min(pageSize, 500));
    const safePage = Math.max(1, page);
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    const { data, error } = await supabase
      .from("orders")
      .select("id,order_ref,restaurant_id,restaurant_name,restaurant_slug,delivery_date,created_at,items")
      .eq("status", "delivered")
      .gte("delivery_date", fromDate)
      .lte("delivery_date", toDate)
      .order("delivery_date", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as unknown as DeliveredOrder[];
  },

  async listInvoices(fromDate: string, toDate: string, page = 1, pageSize = 1000) {
    const safePageSize = Math.max(1, Math.min(pageSize, 500));
    const safePage = Math.max(1, page);
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    const { data, error } = await supabase
      .from("sales_invoices")
      .select("*")
      .gte("invoice_date", fromDate)
      .lte("invoice_date", toDate)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as SalesInvoice[];
  },

  async listInvoicedOrderIds(fromDate: string, toDate: string, limit = 2000) {
    const safeLimit = Math.max(1, Math.min(limit, 5000));
    const { data, error } = await supabase
      .from("sales_invoice_orders")
      .select("order_id,sales_invoices!inner(invoice_date)")
      .gte("sales_invoices.invoice_date", fromDate)
      .lte("sales_invoices.invoice_date", toDate)
      .limit(safeLimit);
    if (error) throw error;
    return Array.from(new Set(((data ?? []) as Array<{ order_id: string }>).map((row) => row.order_id)));
  },

  async getInvoiceLines(invoiceId: string, limit = 300) {
    const safeLimit = Math.max(1, Math.min(limit, 1000));
    const { data, error } = await supabase
      .from("sales_invoice_lines")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("item_en", { ascending: true })
      .limit(safeLimit);
    if (error) throw error;
    return (data ?? []) as SalesInvoiceLine[];
  },

  async listInvoiceOrders(invoiceId: string, limit = 300) {
    const safeLimit = Math.max(1, Math.min(limit, 1000));
    const { data, error } = await supabase
      .from("sales_invoice_orders")
      .select("id,invoice_id,order_id,created_at")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: true })
      .limit(safeLimit);
    if (error) throw error;
    return (data ?? []) as SalesInvoiceOrder[];
  },

  async listPayments(invoiceId: string, limit = 300) {
    const safeLimit = Math.max(1, Math.min(limit, 1000));
    const { data, error } = await supabase
      .from("sales_payments")
      .select("id,invoice_id,amount,payment_date,method,notes,created_at")
      .eq("invoice_id", invoiceId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    if (error) throw error;
    return (data ?? []) as SalesPayment[];
  },

  async createInvoiceFromOrders(orderIds: string[]) {
    const { data, error } = await supabase.rpc("create_invoice_from_orders", {
      p_order_ids: orderIds,
    });
    if (error) throw error;
    return data as string;
  },

  async upsertInvoiceLines(lines: SalesInvoiceLine[]) {
    if (lines.length === 0) return;
    const { error } = await supabase.from("sales_invoice_lines").upsert(lines, { onConflict: "id" });
    if (error) throw error;
  },

  async getInvoiceById(invoiceId: string) {
    const { data, error } = await supabase
      .from("sales_invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();
    if (error) throw error;
    return data as SalesInvoice;
  },

  async updateInvoiceDraft(invoiceId: string, discount: number, otherCharges: number, notes: string) {
    const { error } = await supabase
      .from("sales_invoices")
      .update({
        discount_amount: Math.max(0, Number(discount) || 0),
        other_charges: Math.max(0, Number(otherCharges) || 0),
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);
    if (error) throw error;
  },

  async updateInvoiceTotals(invoiceId: string) {
    const { data, error } = await supabase.rpc("update_invoice_totals", {
      p_invoice_id: invoiceId,
    });
    if (error) throw error;
    return data;
  },

  async addPayment(invoiceId: string, amount: number, method: SalesPayment["method"], notes?: string) {
    const { data, error } = await supabase.rpc("add_payment", {
      p_invoice_id: invoiceId,
      p_amount: Math.max(0, Number(amount) || 0),
      p_method: method,
      p_notes: notes?.trim() || null,
    });
    if (error) throw error;
    return data;
  },

  async finalizeInvoice(invoiceId: string, actorName: string) {
    const { error } = await supabase.rpc("finalize_invoice", {
      p_invoice_id: invoiceId,
      p_actor: actorName,
    });
    if (error) throw error;
  },
};
