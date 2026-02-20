export const salesQueryKeys = {
  deliveredOrders: (from: string, to: string) => ["sales", "delivered-orders", from, to] as const,
  invoicedOrderIds: (from: string, to: string) => ["sales", "invoiced-order-ids", from, to] as const,
  invoices: (from: string, to: string) => ["sales", "invoices", from, to] as const,
  invoiceLines: (invoiceId: string | null) => ["sales", "invoice-lines", invoiceId] as const,
  invoiceOrders: (invoiceId: string | null) => ["sales", "invoice-orders", invoiceId] as const,
  payments: (invoiceId: string | null) => ["sales", "payments", invoiceId] as const,
};
