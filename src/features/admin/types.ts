export interface OrderItem {
  code?: string;
  en: string;
  hi: string;
  qty: number;
  category: string;
}

export interface Order {
  id: string;
  order_ref: string;
  restaurant_name: string;
  contact_name: string;
  contact_phone: string;
  order_date: string;
  delivery_date: string;
  items: OrderItem[];
  notes: string | null;
  status: string;
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean | null;
}

export interface ItemAvailability {
  item_code: string | null;
  item_en: string;
  is_in_stock: boolean;
  icon_url: string | null;
}

export type AdminView =
  | "orders"
  | "delivery"
  | "sales"
  | "purchase"
  | "restaurants"
  | "stock"
  | "users";

export type DeliveryFilter = "active" | "ready" | "out" | "delivered" | "failed" | "all";

export interface SourceOrderRef {
  order_ref: string;
  restaurant_name: string;
  qty: number;
}

export interface PurchasePlanRow {
  item_code: string;
  item_en: string;
  item_hi: string | null;
  category: string | null;
  ordered_qty: number;
  adjustment_qty: number;
  final_qty: number;
  purchased_qty: number;
  pack_size: number;
  pack_count: number;
  unit_price: number;
  line_total: number;
  variance_qty: number;
  vendor_name: string | null;
  purchase_status: "draft" | "finalized";
  finalized_at: string | null;
  finalized_by: string | null;
  notes: string | null;
  source_orders: SourceOrderRef[] | null;
}

export interface PurchasePlanDbRow {
  item_code: string | null;
  item_en: string;
  item_hi: string | null;
  category: string | null;
  ordered_qty: number;
  adjustment_qty: number;
  final_qty: number;
  purchased_qty: number;
  pack_size: number;
  pack_count: number;
  unit_price: number;
  line_total: number;
  variance_qty: number;
  vendor_name: string | null;
  purchase_status: string;
  finalized_at: string | null;
  finalized_by: string | null;
  notes: string | null;
  source_orders: SourceOrderRef[] | null;
}

export interface PurchaseEdit {
  adjustment_qty?: number;
  purchased_qty?: number;
  pack_size?: number;
  pack_count?: number;
  unit_price?: number;
  vendor_name?: string;
  notes?: string;
}

export interface StockQtyRow {
  item_code: string;
  item_en: string;
  available_qty: number;
}

export interface PurchaseDayLockRow {
  id: string;
  purchase_date: string;
  is_locked: boolean;
  locked_at: string | null;
  reopened_at: string | null;
}

export interface PurchaseStockHistoryRow {
  date: string;
  total_amount: number;
  item_count: number;
  total_required_qty: number;
  total_purchased_qty: number;
  total_variance_qty: number;
}

export interface FinalizePurchaseResult {
  purchase_date: string;
  run_id: string;
  already_finalized: boolean;
}

export type PurchaseNeedMode = "net" | "gross";

export interface PurchaseDaySettingRow {
  purchase_date: string;
  need_mode: PurchaseNeedMode;
}

export interface PurchaseDemandRow {
  item_code: string;
  item_en: string;
  restaurant_qty: number;
  local_policy_qty: number;
  carry_forward_qty: number;
  gross_required_qty: number;
  main_available_qty: number;
  required_qty: number;
  need_mode: PurchaseNeedMode;
}

export interface InventoryLocationRow {
  id: string;
  code: string;
  name: string;
  location_type: string;
  is_active: boolean;
}

export interface StockBalanceRow {
  id: string;
  location_id: string;
  item_code: string;
  item_en: string;
  qty: number;
  updated_at: string;
}

export interface LocalStorePolicyRow {
  id: string;
  item_code: string;
  item_en: string;
  min_qty: number;
  target_qty: number;
  is_active: boolean;
  updated_at: string;
}

export interface StockTransferLineRow {
  id: string;
  transfer_id: string;
  item_code: string;
  item_en: string;
  qty: number;
}

export interface StockTransferRow {
  id: string;
  transfer_no: string;
  transfer_date: string;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  from_location_id: string;
  to_location_id: string;
}

export type PurchaseStep = "need" | "buy" | "finalize" | "history";

export interface AppUserRow {
  id: string;
  name: string;
  username: string;
  password: string;
  role: string;
  is_active: boolean;
}

export const CATEGORY_BADGES: Record<string, string> = {
  vegetables: "🥦",
  herbs: "🌿",
  fruits: "🥝",
};
