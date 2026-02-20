export interface OrderItem {
  code?: string;
  en: string;
  hi: string;
  qty: number;
  category: string;
}

export interface DeliveredOrder {
  id: string;
  order_ref: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  delivery_date: string;
  created_at: string;
  items: OrderItem[];
}

export interface SalesInvoice {
  id: string;
  invoice_no: string;
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

export interface SalesInvoiceOrder {
  id: string;
  invoice_id: string;
  order_id: string;
  created_at: string;
}

export interface SalesPayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  method: "cash" | "upi" | "bank" | "card" | "other" | null;
  notes: string | null;
  created_at: string;
}

export interface SalesInvoiceLine {
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

export interface SalesTotals {
  subtotal: number;
  discount: number;
  other: number;
  grand: number;
}
