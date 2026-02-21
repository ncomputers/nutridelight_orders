import { supabase } from "@/integrations/supabase/client";
import type {
  AppUserRow,
  FinalizePurchaseResult,
  ItemAvailability,
  LocalStorePolicyRow,
  Order,
  PagedResult,
  PurchaseDemandRow,
  PurchaseDayLockRow,
  PurchasePlanDbRow,
  PurchaseStockHistoryRow,
  Restaurant,
  StockQtyRow,
  SupportIssueRow,
  WarehouseTransactionRow,
} from "@/features/admin/types";

export const adminRepository = {
  async listOrders(fromDate: string, toDate: string) {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .gte("order_date", fromDate)
      .lte("order_date", toDate)
      .order("created_at", { ascending: false })
      .limit(1500);
    if (error) throw error;
    return (data ?? []) as unknown as Order[];
  },

  async listRestaurants() {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id,name,slug,is_active")
      .order("name", { ascending: true })
      .limit(1000);
    if (error) throw error;
    return (data ?? []) as Restaurant[];
  },

  async listAppUsers() {
    const { data, error } = await supabase
      .from("app_users")
      .select("id,name,username,role,is_active")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return (data ?? []) as AppUserRow[];
  },

  async listItemAvailability() {
    const { data, error } = await supabase
      .from("item_availability")
      .select("item_code,item_en,is_in_stock,icon_url")
      .limit(1000);
    if (error) throw error;
    return (data ?? []) as ItemAvailability[];
  },

  async listPurchasePlans(dateIso: string) {
    const { data, error } = await supabase
      .from("purchase_plans")
      .select(
        "item_code,item_en,item_hi,category,ordered_qty,adjustment_qty,final_qty,purchased_qty,pack_size,pack_count,unit_price,line_total,variance_qty,vendor_name,purchase_status,finalized_at,finalized_by,notes,source_orders",
      )
      .eq("purchase_date", dateIso)
      .limit(1000);
    if (error) throw error;
    return (data ?? []) as unknown as PurchasePlanDbRow[];
  },

  async listStockQty() {
    const { data, error } = await supabase
      .from("stock_qty")
      .select("item_code,item_en,available_qty")
      .limit(2000);
    if (error) throw error;
    return (data ?? []) as StockQtyRow[];
  },

  async listWarehouseTransactions(
    fromDate: string,
    toDate: string,
    page = 1,
    pageSize = 200,
  ): Promise<PagedResult<WarehouseTransactionRow>> {
    const safePageSize = Math.max(1, Math.min(pageSize, 500));
    const safePage = Math.max(1, page);
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    const { data, error } = await supabase
      .from("warehouse_transactions")
      .select("id,txn_date,txn_type,item_code,item_en,qty,signed_qty,unit_price,amount,ref_type,ref_id,notes,created_by,created_at")
      .gte("txn_date", fromDate)
      .lte("txn_date", toDate)
      .order("txn_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    const rows = (data ?? []) as unknown as WarehouseTransactionRow[];
    return {
      rows,
      page: safePage,
      pageSize: safePageSize,
      hasMore: rows.length === safePageSize,
    };
  },

  async getPurchaseDayLock(dateIso: string) {
    const { data, error } = await supabase
      .from("purchase_day_locks")
      .select("id,purchase_date,is_locked,locked_at,reopened_at")
      .eq("purchase_date", dateIso)
      .limit(1);
    if (error) throw error;
    return (data ?? []) as PurchaseDayLockRow[];
  },

  async listPurchaseHistory(fromDate: string, toDate: string) {
    const { data, error } = await supabase
      .from("purchase_plans")
      .select("purchase_date,item_en,item_hi,item_code,final_qty,purchased_qty,unit_price,line_total,variance_qty,vendor_name,purchase_status")
      .eq("purchase_status", "finalized")
      .gte("purchase_date", fromDate)
      .lte("purchase_date", toDate)
      .order("purchase_date", { ascending: false })
      .order("item_en", { ascending: true })
      .limit(5000);
    if (error) throw error;
    return data ?? [];
  },

  async listPurchaseStockHistory(fromDate: string, toDate: string) {
    const { data, error } = await supabase.rpc("get_purchase_stock_history", {
      p_from_date: fromDate,
      p_to_date: toDate,
    });
    if (error) throw error;
    return (data ?? []) as unknown as PurchaseStockHistoryRow[];
  },

  async listPurchaseStockDetails(dateIso: string) {
    const { data, error } = await supabase.rpc("get_purchase_stock_details", {
      p_purchase_date: dateIso,
    });
    if (error) throw error;
    return (data ?? []) as unknown as PurchasePlanDbRow[];
  },

  async updateOrderStatus(orderId: string, status: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
  },

  async createRestaurant(name: string, slug: string) {
    const { error } = await supabase.from("restaurants").insert({ name, slug, is_active: true });
    if (error) throw error;
  },

  async setRestaurantActive(id: string, isActive: boolean) {
    const { error } = await supabase
      .from("restaurants")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) throw error;
  },

  async canDeleteRestaurant(id: string, slug: string) {
    const { count, error } = await supabase
      .from("orders")
      .select("id", { head: true, count: "exact" })
      .or(`restaurant_id.eq.${id},restaurant_slug.eq.${slug}`);
    if (error) throw error;
    return (count ?? 0) === 0;
  },

  async deleteRestaurant(id: string) {
    const { error } = await supabase
      .from("restaurants")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async isUsernameTaken(username: string) {
    const { data, error } = await supabase
      .from("app_users")
      .select("id")
      .ilike("username", username)
      .limit(1);
    if (error) throw error;
    return (data ?? []).length > 0;
  },

  async createAppUser(name: string, username: string, password: string, role: string) {
    const { error } = await supabase.from("app_users").insert({
      name,
      username,
      password,
      role,
      is_active: true,
    });
    if (error) throw error;
  },

  async setAppUserActive(id: string, isActive: boolean) {
    const { error } = await supabase
      .from("app_users")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) throw error;
  },

  async setAppUserRole(id: string, role: string) {
    const { error } = await supabase
      .from("app_users")
      .update({ role })
      .eq("id", id);
    if (error) throw error;
  },

  async upsertItemAvailability(itemCode: string, itemEn: string, isInStock: boolean) {
    const { error } = await supabase
      .from("item_availability")
      .upsert(
        [
          {
            item_code: itemCode,
            item_en: itemEn,
            is_in_stock: isInStock,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "item_en" },
      );
    if (error) throw error;
  },

  async upsertItemIcon(itemCode: string, itemEn: string, iconUrl: string | null) {
    const { error } = await supabase
      .from("item_availability")
      .upsert(
        [
          {
            item_code: itemCode,
            item_en: itemEn,
            icon_url: iconUrl,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "item_en" },
      );
    if (error) throw error;
  },

  async upsertPurchasePlan(payload: Record<string, unknown>) {
    const { error } = await supabase
      .from("purchase_plans")
      .upsert([payload], { onConflict: "purchase_date,item_code" });
    if (error) throw error;
  },

  async upsertStockQty(payload: { item_code: string; item_en: string; available_qty: number }) {
    const { error } = await supabase
      .from("stock_qty")
      .upsert([payload], { onConflict: "item_code" });
    if (error) throw error;
  },

  async lockPurchaseDay(dateIso: string) {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("purchase_day_locks")
      .upsert(
        [
          {
            purchase_date: dateIso,
            is_locked: true,
            locked_at: nowIso,
            reopened_at: null,
            updated_at: nowIso,
          },
        ],
        { onConflict: "purchase_date" },
      );
    if (error) throw error;
  },

  async reopenPurchaseDay(dateIso: string) {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("purchase_day_locks")
      .upsert(
        [
          {
            purchase_date: dateIso,
            is_locked: false,
            reopened_at: nowIso,
            updated_at: nowIso,
          },
        ],
        { onConflict: "purchase_date" },
      );
    if (error) throw error;
  },

  async ensurePurchaseDayLockId(dateIso: string) {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("purchase_day_locks")
      .upsert(
        [
          {
            purchase_date: dateIso,
            is_locked: false,
            updated_at: nowIso,
          },
        ],
        { onConflict: "purchase_date" },
      )
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  },

  async finalizePurchase(purchaseDayId: string) {
    const { data, error } = await supabase.rpc("finalize_purchase", {
      p_purchase_day_id: purchaseDayId,
    });
    if (error) throw error;
    return data as FinalizePurchaseResult;
  },

  async listLocalStorePolicies() {
    const { data, error } = await supabase
      .from("local_store_inventory_policy")
      .select("id,item_code,item_en,required_stock_qty,is_active,updated_at")
      .order("item_en", { ascending: true })
      .limit(1000);
    if (error) throw error;
    return (data ?? []) as unknown as LocalStorePolicyRow[];
  },

  async upsertLocalStorePolicy(payload: {
    item_code: string;
    item_en: string;
    required_stock_qty: number;
    is_active?: boolean;
  }) {
    const { error } = await supabase
      .from("local_store_inventory_policy")
      .upsert(
        [{ ...payload, updated_at: new Date().toISOString(), is_active: payload.is_active ?? true }],
        { onConflict: "item_code" },
      );
    if (error) throw error;
  },

  async deleteLocalStorePolicy(itemCode: string) {
    const { error } = await supabase
      .from("local_store_inventory_policy")
      .delete()
      .eq("item_code", itemCode);
    if (error) throw error;
  },

  async getPurchaseDemand(dateIso: string) {
    const { data, error } = await supabase.rpc("get_purchase_demand", {
      p_purchase_date: dateIso,
      p_need_mode: "net",
    });
    if (error) throw error;
    return (data ?? []) as unknown as PurchaseDemandRow[];
  },

  async postOrderDispatchOut(orderId: string, actor = "admin") {
    const { data, error } = await supabase.rpc("post_order_dispatch_out", {
      p_order_id: orderId,
      p_actor: actor,
    });
    if (error) throw error;
    return data as { order_id: string; status: string; already_posted: boolean };
  },

  async setRestaurantPortalPin(payload: { restaurantId: string; username: string; pin: string; actor?: string }) {
    const rpcClient = supabase as unknown as {
      rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
    const { data, error } = await rpcClient.rpc("admin_set_restaurant_portal_pin", {
      p_restaurant_id: payload.restaurantId,
      p_username: payload.username,
      p_pin: payload.pin,
      p_actor: payload.actor || "admin",
    });
    if (error) throw new Error(error.message || "Could not set restaurant portal PIN.");
    return data;
  },

  async listSupportIssues(page = 1, pageSize = 50): Promise<PagedResult<SupportIssueRow>> {
    const safePageSize = Math.max(1, Math.min(pageSize, 200));
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safePageSize;
    const rpcClient = supabase as unknown as {
      rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown[] | null; error: { message?: string } | null }>;
    };
    const { data, error } = await rpcClient.rpc("admin_list_support_issues", {
      p_limit: safePageSize,
      p_offset: offset,
    });
    if (error) throw new Error(error.message || "Could not load support issues.");
    const rows = (data ?? []) as SupportIssueRow[];
    return {
      rows,
      page: safePage,
      pageSize: safePageSize,
      hasMore: rows.length === safePageSize,
    };
  },

  async updateSupportIssue(payload: {
    issueId: string;
    status: "open" | "in_review" | "resolved";
    resolutionNote?: string;
    actor?: string;
  }) {
    const rpcClient = supabase as unknown as {
      rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
    const { data, error } = await rpcClient.rpc("admin_update_support_issue", {
      p_issue_id: payload.issueId,
      p_status: payload.status,
      p_resolution_note: payload.resolutionNote || null,
      p_actor: payload.actor || "admin",
    });
    if (error) throw new Error(error.message || "Could not update support issue.");
    return data;
  },
};
