export const salesQueryKeys = {
  deliveredOrders: (from: string, to: string, page = 1, pageSize = 1000) =>
    ["sales", "delivered-orders", from, to, page, pageSize] as const,
  invoicedOrderIds: (from: string, to: string) => ["sales", "invoiced-order-ids", from, to] as const,
  invoices: (from: string, to: string, page = 1, pageSize = 1000) =>
    ["sales", "invoices", from, to, page, pageSize] as const,
  invoiceLines: (invoiceId: string | null) => ["sales", "invoice-lines", invoiceId] as const,
  invoiceOrders: (invoiceId: string | null) => ["sales", "invoice-orders", invoiceId] as const,
  payments: (invoiceId: string | null) => ["sales", "payments", invoiceId] as const,
};
