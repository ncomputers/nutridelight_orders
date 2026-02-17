import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { APP_CONFIG, ORDER_STATUS, type OrderStatus } from "@/config/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATALOG } from "@/data/items";
import {
  formatIndiaDate,
  formatIndiaDateTime,
  formatIndiaTime,
  formatIsoDateDdMmYyyy,
  getIndiaDateDaysAgoIso,
  getIndiaDateIso,
} from "@/lib/datetime";
import { computeAccountsDay } from "@/features/accounts/lib/accountingMath";
import {
  canCloseDay,
  canManageLedgerMapping,
  canPostAccounting,
  canPostForUser,
  type ActorRole,
} from "@/features/accounts/lib/permissions";
import SalesPanel from "./SalesPanel";

interface OrderItem {
  code?: string;
  en: string;
  hi: string;
  qty: number;
  category: string;
}

interface Order {
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

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean | null;
}

interface ItemAvailability {
  item_code: string | null;
  item_en: string;
  is_in_stock: boolean;
}
type AdminView = "orders" | "delivery" | "sales" | "restaurants" | "purchase" | "stock" | "users" | "accounts";
type DeliveryFilter = "active" | "ready" | "out" | "delivered" | "failed" | "all";
type AccountsSubView = "setup" | "issue" | "purchase" | "return" | "closing" | "reports" | "audit";
interface SourceOrderRef {
  order_ref: string;
  restaurant_name: string;
  qty: number;
}

interface PurchasePlanRow {
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

interface PurchasePlanDbRow {
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

interface PurchaseEdit {
  adjustment_qty?: number;
  purchased_qty?: number;
  pack_size?: number;
  pack_count?: number;
  unit_price?: number;
  vendor_name?: string;
  notes?: string;
}

interface StockQtyRow {
  item_code: string;
  item_en: string;
  available_qty: number;
}

interface PurchaseDayLockRow {
  purchase_date: string;
  is_locked: boolean;
  locked_at: string | null;
  reopened_at: string | null;
}

interface AccountsDayClosureRow {
  closure_date: string;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  close_note: string | null;
  reopened_at: string | null;
  reopened_by: string | null;
}

interface AccountLedgerRow {
  id: string;
  code: string;
  name: string;
  ledger_group: string;
  account_type: string;
  is_system: boolean;
  is_active: boolean;
}

interface PurchaseUserLedgerMapRow {
  id: string;
  user_id: string;
  ledger_id: string;
  is_active: boolean;
}

interface LedgerOpeningBalanceRow {
  id: string;
  opening_date: string;
  ledger_id: string;
  opening_dr: number;
  opening_cr: number;
  note: string | null;
  created_by: string;
}

interface JournalVoucherRow {
  id: string;
  voucher_no: string;
  voucher_date: string;
  voucher_type: "opening" | "cash_issue" | "purchase" | "cash_return" | "adjustment" | "reversal";
  voucher_amount: number;
  narration: string | null;
  source_type: string | null;
  source_id: string | null;
  posted_by: string;
  posted_at: string;
  is_reversed: boolean;
  created_by_user_id?: string | null;
  actor_role?: "admin" | "purchase" | "sales" | null;
}

interface JournalLineRow {
  id: string;
  voucher_id: string;
  ledger_id: string;
  dr_amount: number;
  cr_amount: number;
  line_note: string | null;
}

type PurchaseStep = "need" | "buy" | "finalize" | "history";

interface AppUserRow {
  id: string;
  name: string;
  username: string;
  password: string;
  role: string;
  is_active: boolean;
}

const CATEGORY_BADGES: Record<string, string> = {
  vegetables: "🥦",
  herbs: "🌿",
  fruits: "🥝",
};

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "")
    .replace(/-+/g, "-");

const getRestaurantOrderLink = (slug: string) => `${window.location.origin}/order?r=${slug}`;
const getAdminLoginLink = () => `${window.location.origin}/admin/login`;
const getAdminPanelLink = () => `${window.location.origin}/admin`;
const getPurchaseLink = () => `${window.location.origin}/purchase`;
const getStockLink = () => `${window.location.origin}/admin?view=stock`;

const getQrUrl = (link: string, size = 320) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(link)}`;
const getRestaurantQrUrl = (slug: string, size = 320) => getQrUrl(getRestaurantOrderLink(slug), size);

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const toSafeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round2 = (value: number) => Number(value.toFixed(2));
const normalizeUsername = (value: string) => value.trim().toLowerCase();
const toCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
const makeVoucherNo = (prefix: string, dateIso: string) =>
  `${prefix}-${dateIso.replaceAll("-", "")}-${Math.floor(Date.now() % 1000000)}`;

const toPurchaseKey = (itemCode: string | null | undefined, itemEn: string) =>
  itemCode && itemCode.trim() ? itemCode.trim() : itemEn.trim();

const buildPrintableOrderSection = (order: Order) => {
  const items = (order.items || []) as OrderItem[];
  const notes = order.notes ? escapeHtml(order.notes) : "None";
  const itemsRows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.en)}</td>
          <td>${escapeHtml(item.hi)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td style="text-align:right">${item.qty} kg</td>
        </tr>
      `,
    )
    .join("");

  return `
    <section class="order-block">
    <h1>Order Slip - ${escapeHtml(order.restaurant_name)}</h1>
    <div class="meta">
      <p><strong>Ref:</strong> ${escapeHtml(order.order_ref)}</p>
      <p><strong>Status:</strong> ${escapeHtml(order.status)}</p>
      <p><strong>Order Date:</strong> ${escapeHtml(order.order_date)}</p>
      <p><strong>Delivery Date:</strong> ${escapeHtml(order.delivery_date)}</p>
      <p><strong>Contact:</strong> ${escapeHtml(order.contact_name)} (${escapeHtml(order.contact_phone)})</p>
      <p><strong>Placed Time:</strong> ${escapeHtml(formatIndiaDateTime(order.created_at))}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Hindi</th>
          <th>Category</th>
          <th>Qty</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>
    <p class="notes"><strong>Notes:</strong> ${notes}</p>
    </section>`;
};

const buildPrintableDoc = (content: string, title: string) => {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      .meta { margin-bottom: 14px; font-size: 13px; }
      .meta p { margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
      th, td { border: 1px solid #bbb; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f5f5f5; }
      .notes { margin-top: 12px; font-size: 13px; }
      .order-block { break-after: page; page-break-after: always; margin-bottom: 20px; }
      .order-block:last-child { break-after: auto; page-break-after: auto; }
    </style>
  </head>
  <body>${content}</body>
</html>`;
};

const AdminPanel = ({ mode = "admin" }: { mode?: "admin" | "purchase" }) => {
  const isPurchaseMode = mode === "purchase";
  const isAdminMode = mode === "admin";
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
  const actorRole: ActorRole = isAdminMode ? "admin" : purchaseSessionUser?.role === "sales" ? "sales" : "purchase";
  const isSalesSession = isPurchaseMode && purchaseSessionUser?.role === "sales";
  const initialView = searchParams.get("view");
  const initialTab = searchParams.get("tab");
  const initialRestaurantFilter = searchParams.get("restaurant") || "";
  const [activeTab, setActiveTab] = useState<OrderStatus>(
    initialTab === ORDER_STATUS.pending ||
      initialTab === ORDER_STATUS.confirmed ||
      initialTab === ORDER_STATUS.rejected
      ? initialTab
      : ORDER_STATUS.pending,
  );
  const [activeView, setActiveView] = useState<AdminView>(
    isPurchaseMode
      ? initialView === "sales"
        ? "sales"
        : isSalesSession
          ? "sales"
          : "purchase"
      : initialView === "orders" ||
          initialView === "delivery" ||
          initialView === "sales" ||
          initialView === "restaurants" ||
          initialView === "purchase" ||
          initialView === "stock" ||
          initialView === "users" ||
          initialView === "accounts"
        ? initialView
        : "orders",
  );
  const [restaurantFilter, setRestaurantFilter] = useState(initialRestaurantFilter);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [restaurantError, setRestaurantError] = useState("");
  const [restaurantSuccess, setRestaurantSuccess] = useState("");
  const [qrSlug, setQrSlug] = useState<string | null>(null);
  const [showPurchaseQr, setShowPurchaseQr] = useState(false);
  const [purchaseEdits, setPurchaseEdits] = useState<Record<string, PurchaseEdit>>({});
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseStep, setPurchaseStep] = useState<PurchaseStep>("need");
  const [currentPurchaseKey, setCurrentPurchaseKey] = useState<string | null>(null);
  const [historyDate, setHistoryDate] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "purchase" | "sales">("purchase");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("active");
  const [deliverySearch, setDeliverySearch] = useState("");
  const [deliveryExpanded, setDeliveryExpanded] = useState<Record<string, boolean>>({});
  const todayIso = getIndiaDateIso();
  const ordersWindowStartIso = getIndiaDateDaysAgoIso(30);
  const purchaseHistoryWindowStartIso = getIndiaDateDaysAgoIso(45);
  const accountsWindowStartIso = getIndiaDateDaysAgoIso(30);
  const [ordersFromDate, setOrdersFromDate] = useState(ordersWindowStartIso);
  const [ordersToDate, setOrdersToDate] = useState(todayIso);
  const [purchaseHistoryFromDate, setPurchaseHistoryFromDate] = useState(purchaseHistoryWindowStartIso);
  const [purchaseHistoryToDate, setPurchaseHistoryToDate] = useState(todayIso);
  const [accountsFromDate, setAccountsFromDate] = useState(accountsWindowStartIso);
  const [accountsToDate, setAccountsToDate] = useState(todayIso);
  const [accountsSubView, setAccountsSubView] = useState<AccountsSubView>("setup");
  const [selectedAccountsDate, setSelectedAccountsDate] = useState<string | null>(null);
  const [cashTxnAmount, setCashTxnAmount] = useState("0");
  const [cashTxnPerson, setCashTxnPerson] = useState("");
  const [cashTxnUserId, setCashTxnUserId] = useState("");
  const [cashTxnNote, setCashTxnNote] = useState("");
  const [purchasePostingUserId, setPurchasePostingUserId] = useState("");
  const [setupMappingUserId, setSetupMappingUserId] = useState("");
  const [setupMappingLedgerId, setSetupMappingLedgerId] = useState("");
  const [openingLedgerId, setOpeningLedgerId] = useState("");
  const [openingDr, setOpeningDr] = useState("0");
  const [openingCr, setOpeningCr] = useState("0");
  const [openingNote, setOpeningNote] = useState("");
  const [accountsCloseNote, setAccountsCloseNote] = useState("");
  const [accountsError, setAccountsError] = useState("");
  const [accountsSuccess, setAccountsSuccess] = useState("");
  const safeOrdersFromDate = ordersFromDate <= ordersToDate ? ordersFromDate : ordersToDate;
  const safeOrdersToDate = ordersFromDate <= ordersToDate ? ordersToDate : ordersFromDate;
  const safePurchaseHistoryFromDate =
    purchaseHistoryFromDate <= purchaseHistoryToDate ? purchaseHistoryFromDate : purchaseHistoryToDate;
  const safePurchaseHistoryToDate =
    purchaseHistoryFromDate <= purchaseHistoryToDate ? purchaseHistoryToDate : purchaseHistoryFromDate;
  const safeAccountsFromDate = accountsFromDate <= accountsToDate ? accountsFromDate : accountsToDate;
  const safeAccountsToDate = accountsFromDate <= accountsToDate ? accountsToDate : accountsFromDate;
  const accountsGoLiveDate = APP_CONFIG.accounts.goLiveDate;
  const effectiveAccountsFromDate =
    accountsGoLiveDate && accountsGoLiveDate > safeAccountsFromDate ? accountsGoLiveDate : safeAccountsFromDate;

  useEffect(() => {
    if (isPurchaseMode) {
      if (sessionStorage.getItem(APP_CONFIG.purchase.sessionKey) !== APP_CONFIG.purchase.sessionValue) {
        navigate("/purchase/login");
        return;
      }
      setActiveView("purchase");
      return;
    }
    if (sessionStorage.getItem(APP_CONFIG.admin.sessionKey) !== APP_CONFIG.admin.sessionValue) {
      navigate("/admin/login");
    }
  }, [navigate, isPurchaseMode]);

  useEffect(() => {
    if (isSalesSession && activeView !== "sales" && activeView !== "accounts") {
      setActiveView("sales");
    }
  }, [isSalesSession, activeView]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders", safeOrdersFromDate, safeOrdersToDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("order_date", safeOrdersFromDate)
        .lte("order_date", safeOrdersToDate)
        .order("created_at", { ascending: false })
        .limit(1500);
      if (error) throw error;
      return data as unknown as Order[];
    },
    refetchInterval: APP_CONFIG.admin.pollIntervalMs,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const { data: restaurants = [] } = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id,name,slug,is_active")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Restaurant[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: appUsers = [] } = useQuery({
    queryKey: ["app-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_users")
        .select("id,name,username,password,role,is_active")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as AppUserRow[];
    },
    enabled: true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: availabilityRows = [] } = useQuery({
    queryKey: ["item-availability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_availability")
        .select("item_code,item_en,is_in_stock");
      if (error) throw error;
      return (data ?? []) as ItemAvailability[];
    },
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const { data: purchasePlanRows = [], isLoading: isPurchaseLoading } = useQuery({
    queryKey: ["purchase-plans", todayIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_plans")
        .select(
          "item_code,item_en,item_hi,category,ordered_qty,adjustment_qty,final_qty,purchased_qty,pack_size,pack_count,unit_price,line_total,variance_qty,vendor_name,purchase_status,finalized_at,finalized_by,notes,source_orders",
        )
        .eq("purchase_date", todayIso);
      if (error) throw error;
      return (data ?? []) as unknown as PurchasePlanDbRow[];
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const { data: stockQtyRows = [] } = useQuery({
    queryKey: ["stock-qty"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_qty")
        .select("item_code,item_en,available_qty")
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as StockQtyRow[];
    },
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const { data: purchaseDayLockRows = [] } = useQuery({
    queryKey: ["purchase-day-lock", todayIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_day_locks")
        .select("purchase_date,is_locked,locked_at,reopened_at")
        .eq("purchase_date", todayIso)
        .limit(1);
      if (error) throw error;
      return (data ?? []) as PurchaseDayLockRow[];
    },
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const { data: purchaseHistoryRows = [] } = useQuery({
    queryKey: ["purchase-history", safePurchaseHistoryFromDate, safePurchaseHistoryToDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_plans")
        .select("purchase_date,item_en,item_hi,item_code,final_qty,purchased_qty,unit_price,line_total,variance_qty,vendor_name,purchase_status")
        .eq("purchase_status", "finalized")
        .gte("purchase_date", safePurchaseHistoryFromDate)
        .lte("purchase_date", safePurchaseHistoryToDate)
        .order("purchase_date", { ascending: false })
        .limit(700);
      if (error) throw error;
      return (data ?? []) as Array<{
        purchase_date: string;
        item_en: string;
        item_hi: string | null;
        item_code: string | null;
        final_qty: number;
        purchased_qty: number;
        unit_price: number;
        line_total: number;
        variance_qty: number;
        vendor_name: string | null;
        purchase_status: string;
      }>;
    },
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const { data: accountSpendRows = [] } = useQuery({
    queryKey: ["accounts-spend", effectiveAccountsFromDate, safeAccountsToDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_plans")
        .select("purchase_date,line_total,purchase_status")
        .eq("purchase_status", "finalized")
        .gte("purchase_date", effectiveAccountsFromDate)
        .lte("purchase_date", safeAccountsToDate)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Array<{ purchase_date: string; line_total: number; purchase_status: string }>;
    },
    enabled: true,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const { data: accountsDayClosureRows = [] } = useQuery({
    queryKey: ["accounts-day-closures", effectiveAccountsFromDate, safeAccountsToDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_day_closures")
        .select("closure_date,is_closed,closed_at,closed_by,close_note,reopened_at,reopened_by")
        .gte("closure_date", effectiveAccountsFromDate)
        .lte("closure_date", safeAccountsToDate)
        .order("closure_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as AccountsDayClosureRow[];
    },
    enabled: true,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const { data: accountLedgers = [] } = useQuery({
    queryKey: ["account-ledgers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_ledgers")
        .select("id,code,name,ledger_group,account_type,is_system,is_active")
        .order("code", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AccountLedgerRow[];
    },
    enabled: true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: purchaseUserLedgerMapRows = [] } = useQuery({
    queryKey: ["purchase-user-ledger-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_user_ledger_map")
        .select("id,user_id,ledger_id,is_active");
      if (error) throw error;
      return (data ?? []) as PurchaseUserLedgerMapRow[];
    },
    enabled: true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: journalVoucherRows = [] } = useQuery({
    queryKey: ["journal-vouchers", effectiveAccountsFromDate, safeAccountsToDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_vouchers")
        .select("id,voucher_no,voucher_date,voucher_type,voucher_amount,narration,source_type,source_id,posted_by,posted_at,is_reversed,created_by_user_id,actor_role")
        .gte("voucher_date", effectiveAccountsFromDate)
        .lte("voucher_date", safeAccountsToDate)
        .order("voucher_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3000);
      if (error) throw error;
      return (data ?? []) as JournalVoucherRow[];
    },
    enabled: true,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const journalVoucherIds = useMemo(() => journalVoucherRows.map((row) => row.id), [journalVoucherRows]);

  const { data: journalLineRows = [] } = useQuery({
    queryKey: ["journal-lines", journalVoucherIds.join(",")],
    queryFn: async () => {
      if (journalVoucherIds.length === 0) return [] as JournalLineRow[];
      const { data, error } = await supabase
        .from("journal_lines")
        .select("id,voucher_id,ledger_id,dr_amount,cr_amount,line_note")
        .in("voucher_id", journalVoucherIds)
        .limit(6000);
      if (error) throw error;
      return (data ?? []) as JournalLineRow[];
    },
    enabled: journalVoucherIds.length > 0,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const { data: openingBalanceRows = [] } = useQuery({
    queryKey: ["ledger-opening-balances", effectiveAccountsFromDate, safeAccountsToDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_opening_balances")
        .select("id,opening_date,ledger_id,opening_dr,opening_cr,note,created_by")
        .gte("opening_date", effectiveAccountsFromDate)
        .lte("opening_date", safeAccountsToDate)
        .order("opening_date", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as LedgerOpeningBalanceRow[];
    },
    enabled: true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const availabilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    availabilityRows.forEach((row) => {
      if (row.item_code) map.set(row.item_code, row.is_in_stock);
      map.set(row.item_en, row.is_in_stock);
    });
    return map;
  }, [availabilityRows]);

  const stockQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    stockQtyRows.forEach((row) => {
      map.set(row.item_code, toSafeNumber(row.available_qty, 0));
      map.set(row.item_en, toSafeNumber(row.available_qty, 0));
    });
    return map;
  }, [stockQtyRows]);

  const isPurchaseDayLocked = Boolean(purchaseDayLockRows[0]?.is_locked);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const createRestaurant = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { error } = await supabase.from("restaurants").insert({
        name,
        slug,
        is_active: true,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      setRestaurantName("");
      setRestaurantSlug("");
      setRestaurantError("");
      setRestaurantSuccess("Restaurant created. Link is ready to share.");
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not create restaurant.");
    },
  });

  const toggleRestaurantActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("restaurants")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      setRestaurantError("");
      setRestaurantSuccess(
        variables.isActive ? "Restaurant link enabled." : "Restaurant link disabled.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not update restaurant status.");
    },
  });

  const deleteRestaurant = useMutation({
    mutationFn: async ({ id, slug }: { id: string; slug: string }) => {
      const { count, error: countError } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .or(`restaurant_id.eq.${id},restaurant_slug.eq.${slug}`);
      if (countError) throw countError;
      if ((count || 0) > 0) {
        throw new Error("Cannot delete link. Orders already exist for this restaurant. Disable it instead.");
      }

      const { error } = await supabase
        .from("restaurants")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setRestaurantError("");
      setRestaurantSuccess("Restaurant link deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not delete restaurant link.");
    },
  });

  const createAppUser = useMutation({
    mutationFn: async ({
      name,
      username,
      password,
      role,
    }: {
      name: string;
      username: string;
      password: string;
      role: "admin" | "purchase" | "sales";
    }) => {
      const normalizedUsername = normalizeUsername(username);
      const { data: existing, error: lookupError } = await supabase
        .from("app_users")
        .select("id")
        .ilike("username", normalizedUsername)
        .limit(1);
      if (lookupError) throw lookupError;
      if (existing && existing.length > 0) {
        throw new Error("Username already exists (case-insensitive).");
      }

      const { error } = await supabase.from("app_users").insert({
        name,
        username: normalizedUsername,
        password,
        role,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewUserName("");
      setNewUsername("");
      setNewUserPassword("");
      setNewUserRole("purchase");
      setRestaurantError("");
      setRestaurantSuccess("User created.");
      queryClient.invalidateQueries({ queryKey: ["app-users"] });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not create user.");
    },
  });

  const toggleAppUserStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("app_users")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-users"] });
    },
  });

  const updateAppUserRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "admin" | "purchase" | "sales" }) => {
      const { error } = await supabase
        .from("app_users")
        .update({ role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-users"] });
    },
  });

  const toggleAvailability = useMutation({
    mutationFn: async ({
      itemCode,
      itemEn,
      isInStock,
    }: {
      itemCode: string;
      itemEn: string;
      isInStock: boolean;
    }) => {
      const { error } = await supabase
        .from("item_availability")
        .upsert(
          {
            item_code: itemCode,
            item_en: itemEn,
            is_in_stock: isInStock,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "item_en" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-availability"] });
    },
  });

  const buildPurchasePayload = (row: PurchasePlanRow, mode: "draft" | "finalized", nowIso: string) => ({
    purchase_date: todayIso,
    item_code: row.item_code,
    item_en: row.item_en,
    item_hi: row.item_hi,
    category: row.category,
    ordered_qty: row.ordered_qty,
    adjustment_qty: row.adjustment_qty,
    final_qty: row.final_qty,
    purchased_qty: row.purchased_qty,
    pack_size: row.pack_size,
    pack_count: row.pack_count,
    unit_price: row.unit_price,
    line_total: row.line_total,
    variance_qty: row.variance_qty,
    vendor_name: row.vendor_name,
    purchase_status: mode,
    finalized_at: mode === "finalized" ? nowIso : row.finalized_at,
    finalized_by: mode === "finalized" ? "admin" : row.finalized_by,
    notes: row.notes,
    source_orders: row.source_orders,
    updated_at: nowIso,
  });

  const savePurchaseSheet = useMutation({
    mutationFn: async ({ mode }: { mode: "draft" | "finalized" }) => {
      const nowIso = new Date().toISOString();
      const rowsForSave = purchaseRows.map((row) => buildPurchasePayload(row, mode, nowIso));

      if (rowsForSave.length > 0) {
        const { error } = await supabase
          .from("purchase_plans")
          .upsert(rowsForSave, { onConflict: "purchase_date,item_en" });
        if (error) throw error;
      }

      if (mode === "finalized") {
        const stockDeltaByCode = new Map<string, { item_en: string; delta: number }>();
        purchaseRows.forEach((row) => {
          const key = toPurchaseKey(row.item_code, row.item_en);
          const previous = persistedPurchaseByKey.get(key);
          const previousPositive = Math.max(0, toSafeNumber(previous?.variance_qty, 0));
          const nextPositive = Math.max(0, row.variance_qty);
          const delta = round2(nextPositive - previousPositive);
          if (delta <= 0) return;
          const existing = stockDeltaByCode.get(row.item_code);
          if (existing) {
            existing.delta = round2(existing.delta + delta);
            stockDeltaByCode.set(row.item_code, existing);
          } else {
            stockDeltaByCode.set(row.item_code, { item_en: row.item_en, delta });
          }
        });

        if (stockDeltaByCode.size > 0) {
          const stockMap = new Map<string, StockQtyRow>();
          stockQtyRows.forEach((stockRow) => stockMap.set(stockRow.item_code, stockRow));
          const stockUpserts = Array.from(stockDeltaByCode.entries()).map(([itemCode, change]) => {
            const currentQty = toSafeNumber(stockMap.get(itemCode)?.available_qty, 0);
            return {
              item_code: itemCode,
              item_en: change.item_en,
              available_qty: round2(currentQty + change.delta),
              updated_at: nowIso,
            };
          });
          const { error } = await supabase
            .from("stock_qty")
            .upsert(stockUpserts, { onConflict: "item_code" });
          if (error) throw error;
        }
      }
    },
    onSuccess: (_, variables) => {
      setPurchaseEdits({});
      setRestaurantError("");
      setRestaurantSuccess(
        variables.mode === "finalized"
          ? "Purchase finalized. Extra qty carried to stock."
          : "Purchase draft saved.",
      );
      queryClient.invalidateQueries({ queryKey: ["purchase-plans", todayIso] });
      queryClient.invalidateQueries({ queryKey: ["stock-qty"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-spend"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-day-lock", todayIso] });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not save purchase sheet.");
    },
  });

  const savePurchaseItem = useMutation({
    mutationFn: async ({
      row,
      mode,
    }: {
      row: PurchasePlanRow;
      mode: "draft" | "finalized";
    }) => {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("purchase_plans")
        .upsert([buildPurchasePayload(row, mode, nowIso)], { onConflict: "purchase_date,item_en" });
      if (error) throw error;
    },
    onSuccess: () => {
      setRestaurantError("");
      setRestaurantSuccess("Item saved.");
      queryClient.invalidateQueries({ queryKey: ["purchase-plans", todayIso] });
      queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-spend"] });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not save item.");
    },
  });

  const lockPurchaseDay = useMutation({
    mutationFn: async () => {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("purchase_day_locks")
        .upsert(
          [
            {
              purchase_date: todayIso,
              is_locked: true,
              locked_at: nowIso,
              locked_by: "admin",
              reopened_at: null,
              reopened_by: null,
              updated_at: nowIso,
            },
          ],
          { onConflict: "purchase_date" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-day-lock", todayIso] });
    },
  });

  const reopenPurchaseDay = useMutation({
    mutationFn: async () => {
      if (!isAdminMode) {
        throw new Error("Only admin can reopen a locked purchase day.");
      }
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("purchase_day_locks")
        .upsert(
          [
            {
              purchase_date: todayIso,
              is_locked: false,
              reopened_at: nowIso,
              reopened_by: "admin",
              updated_at: nowIso,
            },
          ],
          { onConflict: "purchase_date" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      setRestaurantError("");
      setRestaurantSuccess("Purchase reopened for edits.");
      queryClient.invalidateQueries({ queryKey: ["purchase-day-lock", todayIso] });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not reopen purchase.");
    },
  });

  const upsertPurchaseUserLedgerMap = useMutation({
    mutationFn: async ({ userId, ledgerId }: { userId: string; ledgerId: string }) => {
      if (!canManageLedgerMapping(actorRole)) throw new Error("Only admin can edit ledger mapping.");
      if (!userId || !ledgerId) throw new Error("Select user and ledger.");
      const { error } = await supabase
        .from("purchase_user_ledger_map")
        .upsert(
          [
            {
              user_id: userId,
              ledger_id: ledgerId,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      setAccountsError("");
      setAccountsSuccess("User ledger mapping saved.");
      queryClient.invalidateQueries({ queryKey: ["purchase-user-ledger-map"] });
    },
    onError: (error: Error) => {
      setAccountsSuccess("");
      setAccountsError(error.message || "Could not save mapping.");
    },
  });

  const createAndMapUserLedger = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      if (!canManageLedgerMapping(actorRole)) throw new Error("Only admin can create user ledgers.");
      const user = purchaseUsers.find((row) => row.id === userId);
      if (!user) throw new Error("User not found.");
      const ledgerCode = `ADV_USER_${toCode(user.username)}`;
      let ledgerId = accountLedgersByCode.get(ledgerCode)?.id || "";
      if (!ledgerId) {
        const { data: newLedger, error: ledgerError } = await supabase
          .from("account_ledgers")
          .insert(
            [
              {
                code: ledgerCode,
                name: `Purchase Advance - ${user.name}`,
                ledger_group: "advance",
                account_type: "asset",
                is_system: false,
                is_active: true,
              },
            ],
          )
          .select("id")
          .single();
        if (ledgerError || !newLedger) throw ledgerError || new Error("Could not create ledger.");
        ledgerId = newLedger.id;
      }
      const { error } = await supabase
        .from("purchase_user_ledger_map")
        .upsert([{ user_id: userId, ledger_id: ledgerId, is_active: true }], { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      setAccountsError("");
      setAccountsSuccess("User advance ledger created and mapped.");
      queryClient.invalidateQueries({ queryKey: ["account-ledgers"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-user-ledger-map"] });
    },
    onError: (error: Error) => {
      setAccountsSuccess("");
      setAccountsError(error.message || "Could not create user ledger.");
    },
  });

  const createOpeningBalance = useMutation({
    mutationFn: async () => {
      if (!canManageLedgerMapping(actorRole)) throw new Error("Only admin can create opening balances.");
      if (!selectedAccountsDate) throw new Error("Select a date first.");
      if (!openingLedgerId) throw new Error("Select a ledger.");
      const dr = Math.max(0, round2(toSafeNumber(openingDr, 0)));
      const cr = Math.max(0, round2(toSafeNumber(openingCr, 0)));
      if ((dr > 0 && cr > 0) || (dr <= 0 && cr <= 0)) {
        throw new Error("Use only one side: either Dr or Cr.");
      }
      const { error } = await supabase
        .from("ledger_opening_balances")
        .upsert(
          [
            {
              opening_date: selectedAccountsDate,
              ledger_id: openingLedgerId,
              opening_dr: dr,
              opening_cr: cr,
              note: openingNote.trim() || null,
              created_by: "admin",
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "opening_date,ledger_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      setAccountsError("");
      setAccountsSuccess("Opening balance saved.");
      setOpeningDr("0");
      setOpeningCr("0");
      setOpeningNote("");
      queryClient.invalidateQueries({ queryKey: ["ledger-opening-balances"] });
    },
    onError: (error: Error) => {
      setAccountsSuccess("");
      setAccountsError(error.message || "Could not save opening balance.");
    },
  });

  const createCashTransaction = useMutation({
    mutationFn: async () => {
      if (!canPostAccounting(actorRole)) {
        throw new Error("Not allowed.");
      }
      if (!selectedAccountsDate) {
        throw new Error("Select a date first.");
      }
      if (isPurchaseMode && !purchaseSessionUser?.id) {
        throw new Error("Purchase session user is missing.");
      }
      const amount = Math.max(0, round2(toSafeNumber(cashTxnAmount, 0)));
      const effectiveUserId = isAdminMode ? cashTxnUserId : purchaseSessionUser?.id || "";
      if (!canPostForUser(actorRole, purchaseSessionUser?.id, effectiveUserId)) {
        throw new Error("You can post only for your own purchase user.");
      }
      const selectedUser = purchaseUserById.get(effectiveUserId);
      const personName = selectedUser?.name || cashTxnPerson.trim();
      if (!amount) {
        throw new Error("Amount must be greater than 0.");
      }
      if (!personName) {
        throw new Error("Purchase user is required.");
      }
      const selectedRow = accountRows.find((row) => row.date === selectedAccountsDate);
      if (selectedRow?.isClosed) {
        throw new Error("Day is closed. Reopen day first.");
      }
      const cashLedger = accountLedgersByCode.get("CASH_ON_HAND");
      const fallbackAdvanceLedger = accountLedgersByCode.get("PURCHASE_ADVANCE_UNMAPPED");
      const mappedAdvanceLedger = selectedUser
        ? accountLedgersById.get(purchaseUserLedgerByUserId.get(selectedUser.id)?.ledger_id || "")
        : null;
      const advanceLedger = mappedAdvanceLedger || fallbackAdvanceLedger;
      if (!cashLedger || !advanceLedger) {
        throw new Error("Required system ledgers are missing.");
      }
      const nowIso = new Date().toISOString();
      const { data: insertedTxn, error: txError } = await supabase.from("cash_transactions").insert(
        [
          {
            txn_date: selectedAccountsDate,
            txn_type: "issue",
            amount,
            person_name: personName,
            note: cashTxnNote.trim() || null,
            created_by: isAdminMode ? "admin" : purchaseSessionUser?.username || "purchase",
            updated_at: nowIso,
          },
        ],
      ).select("id").single();
      if (txError || !insertedTxn) throw txError || new Error("Could not add cash transaction.");

      const voucherNo = makeVoucherNo("CI", selectedAccountsDate);
      const { data: voucher, error: voucherError } = await supabase
        .from("journal_vouchers")
        .insert(
          [
            {
              voucher_no: voucherNo,
              voucher_date: selectedAccountsDate,
              voucher_type: "cash_issue",
              voucher_amount: amount,
              narration: `Cash issue to ${personName}`,
              source_type: "cash_transaction",
              source_id: insertedTxn.id,
              posted_by: isAdminMode ? "admin" : purchaseSessionUser?.username || "purchase",
              created_by_user_id: isAdminMode ? null : purchaseSessionUser?.id || null,
              actor_role: actorRole,
              posted_at: nowIso,
              updated_at: nowIso,
            },
          ],
        )
        .select("id")
        .single();
      if (voucherError || !voucher) throw voucherError || new Error("Could not create voucher.");

      const { error: linesError } = await supabase.from("journal_lines").insert([
        {
          voucher_id: voucher.id,
          ledger_id: advanceLedger.id,
          dr_amount: amount,
          cr_amount: 0,
          line_note: `Issue to ${personName}`,
        },
        {
          voucher_id: voucher.id,
          ledger_id: cashLedger.id,
          dr_amount: 0,
          cr_amount: amount,
          line_note: "Cash out",
        },
      ]);
      if (linesError) throw linesError;
    },
    onSuccess: () => {
      setAccountsError("");
      setAccountsSuccess("Cash issue posted.");
      setCashTxnAmount("0");
      setCashTxnPerson("");
      setCashTxnNote("");
      queryClient.invalidateQueries({ queryKey: ["accounts-spend"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-day-closures"] });
      queryClient.invalidateQueries({ queryKey: ["journal-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["journal-lines"] });
    },
    onError: (error: Error) => {
      setAccountsSuccess("");
      setAccountsError(error.message || "Could not post cash issue.");
    },
  });

  const postPurchaseSpend = useMutation({
    mutationFn: async () => {
      if (!canPostAccounting(actorRole)) throw new Error("Not allowed.");
      if (!selectedAccountsDate) throw new Error("Select a date first.");
      if (isPurchaseMode && !purchaseSessionUser?.id) throw new Error("Purchase session user is missing.");
      const row = accountRows.find((item) => item.date === selectedAccountsDate);
      if (row?.isClosed) throw new Error("Day is closed. Reopen day first.");
      const purchaseAmount = round2(finalizedPurchaseByDate.get(selectedAccountsDate) || 0);
      if (purchaseAmount <= 0) throw new Error("No finalized purchase amount for selected date.");
      if (row?.spend && row.spend > 0) throw new Error("Purchase already posted for this date.");
      const effectiveUserId = isAdminMode ? purchasePostingUserId : purchaseSessionUser?.id || "";
      if (!canPostForUser(actorRole, purchaseSessionUser?.id, effectiveUserId)) {
        throw new Error("You can post only for your own purchase user.");
      }
      const selectedUser = purchaseUserById.get(effectiveUserId);
      const cashAdvanceLedger = selectedUser
        ? accountLedgersById.get(purchaseUserLedgerByUserId.get(selectedUser.id)?.ledger_id || "")
        : null;
      const fallbackAdvanceLedger = accountLedgersByCode.get("PURCHASE_ADVANCE_UNMAPPED");
      const inventoryLedger = accountLedgersByCode.get("INVENTORY_RAW");
      const advanceLedger = cashAdvanceLedger || fallbackAdvanceLedger;
      if (!inventoryLedger || !advanceLedger) throw new Error("Inventory/advance ledger mapping missing.");

      const { data: existing } = await supabase
        .from("journal_vouchers")
        .select("id")
        .eq("source_type", "purchase_date")
        .eq("source_id", `${selectedAccountsDate}:${effectiveUserId || "unmapped"}`)
        .eq("voucher_type", "purchase")
        .limit(1);
      if (existing && existing.length > 0) throw new Error("Purchase already posted for selected date.");

      const nowIso = new Date().toISOString();
      const { data: voucher, error: voucherError } = await supabase
        .from("journal_vouchers")
        .insert(
          [
            {
              voucher_no: makeVoucherNo("PV", selectedAccountsDate),
              voucher_date: selectedAccountsDate,
              voucher_type: "purchase",
              voucher_amount: purchaseAmount,
              narration: `Purchase posting for ${selectedAccountsDate}`,
              source_type: "purchase_date",
              source_id: `${selectedAccountsDate}:${effectiveUserId || "unmapped"}`,
              posted_by: isAdminMode ? "admin" : purchaseSessionUser?.username || "purchase",
              created_by_user_id: isAdminMode ? null : purchaseSessionUser?.id || null,
              actor_role: actorRole,
              posted_at: nowIso,
              updated_at: nowIso,
            },
          ],
        )
        .select("id")
        .single();
      if (voucherError || !voucher) throw voucherError || new Error("Could not create purchase voucher.");

      const { error: linesError } = await supabase.from("journal_lines").insert([
        {
          voucher_id: voucher.id,
          ledger_id: inventoryLedger.id,
          dr_amount: purchaseAmount,
          cr_amount: 0,
          line_note: "Inventory value added",
        },
        {
          voucher_id: voucher.id,
          ledger_id: advanceLedger.id,
          dr_amount: 0,
          cr_amount: purchaseAmount,
          line_note: selectedUser ? `Advance adjusted (${selectedUser.name})` : "Advance adjusted",
        },
      ]);
      if (linesError) throw linesError;
    },
    onSuccess: () => {
      setAccountsError("");
      setAccountsSuccess("Purchase posted to journal.");
      queryClient.invalidateQueries({ queryKey: ["journal-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["journal-lines"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-spend"] });
    },
    onError: (error: Error) => {
      setAccountsSuccess("");
      setAccountsError(error.message || "Could not post purchase.");
    },
  });

  const postCashReturn = useMutation({
    mutationFn: async () => {
      if (!canPostAccounting(actorRole)) throw new Error("Not allowed.");
      if (!selectedAccountsDate) throw new Error("Select a date first.");
      if (isPurchaseMode && !purchaseSessionUser?.id) throw new Error("Purchase session user is missing.");
      const amount = Math.max(0, round2(toSafeNumber(cashTxnAmount, 0)));
      const effectiveUserId = isAdminMode ? cashTxnUserId : purchaseSessionUser?.id || "";
      if (!canPostForUser(actorRole, purchaseSessionUser?.id, effectiveUserId)) {
        throw new Error("You can post only for your own purchase user.");
      }
      const selectedUser = purchaseUserById.get(effectiveUserId);
      const personName = selectedUser?.name || cashTxnPerson.trim();
      if (!amount) throw new Error("Amount must be greater than 0.");
      if (!personName) throw new Error("Purchase user is required.");
      const row = accountRows.find((item) => item.date === selectedAccountsDate);
      if (row?.isClosed) throw new Error("Day is closed. Reopen day first.");
      const cashLedger = accountLedgersByCode.get("CASH_ON_HAND");
      const fallbackAdvanceLedger = accountLedgersByCode.get("PURCHASE_ADVANCE_UNMAPPED");
      const mappedAdvanceLedger = selectedUser
        ? accountLedgersById.get(purchaseUserLedgerByUserId.get(selectedUser.id)?.ledger_id || "")
        : null;
      const advanceLedger = mappedAdvanceLedger || fallbackAdvanceLedger;
      if (!cashLedger || !advanceLedger) throw new Error("Required system ledgers are missing.");

      const nowIso = new Date().toISOString();
      const { data: insertedTxn, error: txError } = await supabase.from("cash_transactions").insert(
        [
          {
            txn_date: selectedAccountsDate,
            txn_type: "return",
            amount,
            person_name: personName,
            note: cashTxnNote.trim() || null,
            created_by: isAdminMode ? "admin" : purchaseSessionUser?.username || "purchase",
            updated_at: nowIso,
          },
        ],
      ).select("id").single();
      if (txError || !insertedTxn) throw txError || new Error("Could not add cash return.");

      const { data: voucher, error: voucherError } = await supabase
        .from("journal_vouchers")
        .insert(
          [
            {
              voucher_no: makeVoucherNo("CR", selectedAccountsDate),
              voucher_date: selectedAccountsDate,
              voucher_type: "cash_return",
              voucher_amount: amount,
              narration: `Cash return by ${personName}`,
              source_type: "cash_transaction",
              source_id: insertedTxn.id,
              posted_by: isAdminMode ? "admin" : purchaseSessionUser?.username || "purchase",
              created_by_user_id: isAdminMode ? null : purchaseSessionUser?.id || null,
              actor_role: actorRole,
              posted_at: nowIso,
              updated_at: nowIso,
            },
          ],
        )
        .select("id")
        .single();
      if (voucherError || !voucher) throw voucherError || new Error("Could not create voucher.");

      const { error: linesError } = await supabase.from("journal_lines").insert([
        {
          voucher_id: voucher.id,
          ledger_id: cashLedger.id,
          dr_amount: amount,
          cr_amount: 0,
          line_note: "Cash return",
        },
        {
          voucher_id: voucher.id,
          ledger_id: advanceLedger.id,
          dr_amount: 0,
          cr_amount: amount,
          line_note: `Return by ${personName}`,
        },
      ]);
      if (linesError) throw linesError;
    },
    onSuccess: () => {
      setAccountsError("");
      setAccountsSuccess("Cash return posted.");
      setCashTxnAmount("0");
      setCashTxnPerson("");
      setCashTxnNote("");
      queryClient.invalidateQueries({ queryKey: ["journal-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["journal-lines"] });
    },
    onError: (error: Error) => {
      setAccountsSuccess("");
      setAccountsError(error.message || "Could not post cash return.");
    },
  });

  const closeAccountsDay = useMutation({
    mutationFn: async () => {
      if (!canCloseDay(actorRole)) {
        throw new Error("Only admin can close day.");
      }
      if (!selectedAccountsDate) {
        throw new Error("Select a date first.");
      }
      const row = accountRows.find((item) => item.date === selectedAccountsDate);
      if (!row) {
        throw new Error("Day row not found.");
      }
      if (row.purchaseNotPosted) {
        throw new Error("Post purchase voucher before closing day.");
      }
      if (row.difference !== 0 && !accountsCloseNote.trim()) {
        throw new Error("Mismatch note is required to close day.");
      }
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from("accounts_day_closures").upsert(
        [
          {
            closure_date: selectedAccountsDate,
            is_closed: true,
            closed_at: nowIso,
            closed_by: "admin",
            close_note: accountsCloseNote.trim() || null,
            reopened_at: null,
            reopened_by: null,
            updated_at: nowIso,
          },
        ],
        { onConflict: "closure_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setAccountsError("");
      setAccountsSuccess("Day closed.");
      queryClient.invalidateQueries({ queryKey: ["accounts-day-closures"] });
    },
    onError: (error: Error) => {
      setAccountsSuccess("");
      setAccountsError(error.message || "Could not close day.");
    },
  });

  const reopenAccountsDay = useMutation({
    mutationFn: async () => {
      if (!canCloseDay(actorRole)) {
        throw new Error("Only admin can reopen day.");
      }
      if (!selectedAccountsDate) {
        throw new Error("Select a date first.");
      }
      const nowIso = new Date().toISOString();
      const vouchersForDay = (journalVouchersByDate.get(selectedAccountsDate) || []).filter((voucher) => !voucher.is_reversed);
      for (const original of vouchersForDay) {
        const originalLines = journalLinesByVoucherId.get(original.id) || [];
        if (originalLines.length === 0) continue;
        const { data: reversalVoucher, error: reversalVoucherError } = await supabase
          .from("journal_vouchers")
          .insert(
            [
              {
                voucher_no: makeVoucherNo("RV", selectedAccountsDate),
                voucher_date: selectedAccountsDate,
                voucher_type: "reversal",
                voucher_amount: original.voucher_amount,
                narration: `Reversal of ${original.voucher_no}`,
                source_type: "reversal_of",
                source_id: original.id,
                posted_by: "admin",
                actor_role: "admin",
                posted_at: nowIso,
                updated_at: nowIso,
                reversal_of_voucher_id: original.id,
              },
            ],
          )
          .select("id")
          .single();
        if (reversalVoucherError || !reversalVoucher) throw reversalVoucherError || new Error("Could not create reversal voucher.");

        const reversalLines = originalLines.map((line) => ({
          voucher_id: reversalVoucher.id,
          ledger_id: line.ledger_id,
          dr_amount: line.cr_amount,
          cr_amount: line.dr_amount,
          line_note: `Reversal of line ${line.id}`,
        }));
        const { error: reversalLinesError } = await supabase.from("journal_lines").insert(reversalLines);
        if (reversalLinesError) throw reversalLinesError;

        const { error: markError } = await supabase
          .from("journal_vouchers")
          .update({
            is_reversed: true,
            reversed_at: nowIso,
            reversed_by: "admin",
            updated_at: nowIso,
          })
          .eq("id", original.id);
        if (markError) throw markError;
      }
      const { error } = await supabase.from("accounts_day_closures").upsert(
        [
          {
            closure_date: selectedAccountsDate,
            is_closed: false,
            reopened_at: nowIso,
            reopened_by: "admin",
            updated_at: nowIso,
          },
        ],
        { onConflict: "closure_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setAccountsError("");
      setAccountsSuccess("Day reopened.");
      queryClient.invalidateQueries({ queryKey: ["accounts-day-closures"] });
      queryClient.invalidateQueries({ queryKey: ["journal-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["journal-lines"] });
    },
    onError: (error: Error) => {
      setAccountsSuccess("");
      setAccountsError(error.message || "Could not reopen day.");
    },
  });

  const filteredOrders = orders.filter(
    (o) =>
      o.status === activeTab &&
      (!restaurantFilter || o.restaurant_slug === restaurantFilter),
  );
  const deliveryRelevantOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          Boolean(o.delivery_date) &&
          o.delivery_date >= todayIso &&
          (o.status === ORDER_STATUS.confirmed ||
            o.status === ORDER_STATUS.outForDelivery ||
            o.status === ORDER_STATUS.delivered ||
            o.status === ORDER_STATUS.failed),
      ),
    [orders, todayIso],
  );
  const deliveryActiveOrders = useMemo(
    () =>
      deliveryRelevantOrders.filter(
        (o) => o.status === ORDER_STATUS.confirmed || o.status === ORDER_STATUS.outForDelivery,
      ),
    [deliveryRelevantOrders],
  );
  const deliveryFilteredOrders = useMemo(() => {
    const term = deliverySearch.trim().toLowerCase();
    const filteredByStatus = deliveryRelevantOrders.filter((order) => {
      if (deliveryFilter === "all") return true;
      if (deliveryFilter === "active") {
        return order.status === ORDER_STATUS.confirmed || order.status === ORDER_STATUS.outForDelivery;
      }
      if (deliveryFilter === "ready") return order.status === ORDER_STATUS.confirmed;
      if (deliveryFilter === "out") return order.status === ORDER_STATUS.outForDelivery;
      if (deliveryFilter === "delivered") return order.status === ORDER_STATUS.delivered;
      if (deliveryFilter === "failed") return order.status === ORDER_STATUS.failed;
      return true;
    });
    const searched = term
      ? filteredByStatus.filter((order) => {
          const haystack = `${order.restaurant_name} ${order.order_ref} ${order.contact_name} ${order.contact_phone}`.toLowerCase();
          return haystack.includes(term);
        })
      : filteredByStatus;
    const statusPriority = (status: string) => {
      if (status === ORDER_STATUS.outForDelivery) return 0;
      if (status === ORDER_STATUS.confirmed) return 1;
      if (status === ORDER_STATUS.failed) return 2;
      if (status === ORDER_STATUS.delivered) return 3;
      return 10;
    };
    return [...searched].sort((a, b) => {
      const byStatus = statusPriority(a.status) - statusPriority(b.status);
      if (byStatus !== 0) return byStatus;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [deliveryRelevantOrders, deliveryFilter, deliverySearch]);
  const deliveryDispatchOrders = useMemo(
    () =>
      deliveryFilteredOrders.filter(
        (o) => o.status === ORDER_STATUS.confirmed || o.status === ORDER_STATUS.outForDelivery,
      ),
    [deliveryFilteredOrders],
  );

  const orderStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(ORDER_STATUS).forEach((status) => {
      counts[status] = 0;
    });
    orders.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  }, [orders]);
  const deliveryCounts = useMemo(
    () => ({
      confirmed: deliveryRelevantOrders.filter((o) => o.status === ORDER_STATUS.confirmed).length,
      outForDelivery: deliveryRelevantOrders.filter((o) => o.status === ORDER_STATUS.outForDelivery).length,
      delivered: deliveryRelevantOrders.filter((o) => o.status === ORDER_STATUS.delivered).length,
      failed: deliveryRelevantOrders.filter((o) => o.status === ORDER_STATUS.failed).length,
    }),
    [deliveryRelevantOrders],
  );

  const logout = () => {
    if (isPurchaseMode) {
      sessionStorage.removeItem(APP_CONFIG.purchase.sessionKey);
      sessionStorage.removeItem(APP_CONFIG.purchase.userKey);
      navigate("/purchase/login");
      return;
    }
    sessionStorage.removeItem(APP_CONFIG.admin.sessionKey);
    navigate("/admin/login");
  };

  const tabs: { key: OrderStatus; label: string }[] = [
    { key: ORDER_STATUS.pending, label: "Pending" },
    { key: ORDER_STATUS.confirmed, label: "Confirmed" },
    { key: ORDER_STATUS.rejected, label: "Rejected" },
  ];

  const catalogCodeByName = useMemo(() => {
    const map = new Map<string, string>();
    CATALOG.forEach((item) => map.set(item.en, item.code));
    return map;
  }, []);
  const catalogMetaMap = useMemo(() => {
    const map = new Map<string, { hi: string; category: string }>();
    CATALOG.forEach((item) => {
      map.set(item.code, { hi: item.hi, category: item.category });
      map.set(item.en, { hi: item.hi, category: item.category });
    });
    return map;
  }, []);

  const ordersForPurchase = useMemo(
    () => orders.filter((o) => o.status === ORDER_STATUS.confirmed),
    [orders],
  );

  const aggregatedPurchaseRows = useMemo(() => {
    const rows = new Map<string, PurchasePlanRow>();
    ordersForPurchase.forEach((order) => {
      const items = (order.items || []) as OrderItem[];
      items.forEach((item) => {
        const itemCode = item.code || catalogCodeByName.get(item.en) || item.en.trim();
        const key = toPurchaseKey(itemCode, item.en);
        const existing = rows.get(key);
        if (!existing) {
          rows.set(key, {
            item_code: itemCode,
            item_en: item.en.trim(),
            item_hi: item.hi || null,
            category: item.category || null,
            ordered_qty: Number(item.qty) || 0,
            adjustment_qty: 0,
            final_qty: Number(item.qty) || 0,
            purchased_qty: 0,
            pack_size: 0,
            pack_count: 0,
            unit_price: 0,
            line_total: 0,
            variance_qty: -(Number(item.qty) || 0),
            vendor_name: null,
            purchase_status: "draft",
            finalized_at: null,
            finalized_by: null,
            notes: null,
            source_orders: [
              {
                order_ref: order.order_ref,
                restaurant_name: order.restaurant_name,
                qty: Number(item.qty) || 0,
              },
            ],
          });
        } else {
          existing.ordered_qty += Number(item.qty) || 0;
          existing.final_qty = round2(existing.ordered_qty + existing.adjustment_qty);
          existing.variance_qty = round2(existing.purchased_qty - existing.final_qty);
          existing.source_orders = [
            ...(existing.source_orders || []),
            {
              order_ref: order.order_ref,
              restaurant_name: order.restaurant_name,
              qty: Number(item.qty) || 0,
            },
          ];
          rows.set(key, existing);
        }
      });
    });
    return rows;
  }, [catalogCodeByName, ordersForPurchase]);

  const persistedPurchaseByKey = useMemo(() => {
    const map = new Map<string, PurchasePlanDbRow>();
    purchasePlanRows.forEach((row) => {
      map.set(toPurchaseKey(row.item_code, row.item_en), row);
    });
    return map;
  }, [purchasePlanRows]);

  const purchaseRows = useMemo(() => {
    const keys = new Set<string>([
      ...Array.from(aggregatedPurchaseRows.keys()),
      ...Array.from(persistedPurchaseByKey.keys()),
    ]);
    const rows: PurchasePlanRow[] = [];

    keys.forEach((key) => {
      const live = aggregatedPurchaseRows.get(key);
      const saved = persistedPurchaseByKey.get(key);
      const edit = purchaseEdits[key] || {};
      const orderedQty = live ? toSafeNumber(live.ordered_qty, 0) : 0;
      const adjustmentQty =
        edit.adjustment_qty ??
        toSafeNumber(saved?.adjustment_qty, live?.adjustment_qty ?? 0);
      const finalQty = round2(orderedQty + adjustmentQty);
      const packSize = Math.max(0, edit.pack_size ?? toSafeNumber(saved?.pack_size, 0));
      const packCount = Math.max(0, edit.pack_count ?? toSafeNumber(saved?.pack_count, 0));
      const purchasedFromPack = packSize > 0 && packCount > 0 ? packSize * packCount : null;
      const shouldPrefillFromRequired =
        !!saved &&
        saved.purchase_status === "draft" &&
        toSafeNumber(saved.purchased_qty, 0) === 0 &&
        toSafeNumber(saved.unit_price, 0) === 0 &&
        !(saved.vendor_name || "").trim() &&
        !(saved.notes || "").trim();
      const purchasedQtyBase = Math.max(
        0,
        edit.purchased_qty ??
          (saved
            ? shouldPrefillFromRequired
              ? finalQty
              : toSafeNumber(saved.purchased_qty, 0)
            : finalQty),
      );
      const purchasedQty = round2(purchasedFromPack ?? purchasedQtyBase);
      const unitPrice = round2(Math.max(0, edit.unit_price ?? toSafeNumber(saved?.unit_price, 0)));
      const lineTotal = round2(purchasedQty * unitPrice);
      const varianceQty = round2(purchasedQty - finalQty);

      rows.push({
        item_code: live?.item_code || saved?.item_code || key,
        item_en: live?.item_en || saved?.item_en || key,
        item_hi:
          live?.item_hi ||
          saved?.item_hi ||
          catalogMetaMap.get(live?.item_code || saved?.item_code || key)?.hi ||
          catalogMetaMap.get(live?.item_en || saved?.item_en || key)?.hi ||
          null,
        category:
          live?.category ||
          saved?.category ||
          catalogMetaMap.get(live?.item_code || saved?.item_code || key)?.category ||
          catalogMetaMap.get(live?.item_en || saved?.item_en || key)?.category ||
          null,
        ordered_qty: round2(orderedQty),
        adjustment_qty: round2(adjustmentQty),
        final_qty: finalQty,
        purchased_qty: purchasedQty,
        pack_size: round2(packSize),
        pack_count: round2(packCount),
        unit_price: unitPrice,
        line_total: lineTotal,
        variance_qty: varianceQty,
        vendor_name: edit.vendor_name ?? saved?.vendor_name ?? null,
        purchase_status: (saved?.purchase_status === "finalized" ? "finalized" : "draft"),
        finalized_at: saved?.finalized_at ?? null,
        finalized_by: saved?.finalized_by ?? null,
        notes: edit.notes ?? saved?.notes ?? null,
        source_orders: live?.source_orders || (saved?.source_orders as SourceOrderRef[] | null) || null,
      });
    });

    return rows.sort((a, b) => a.item_en.localeCompare(b.item_en));
  }, [aggregatedPurchaseRows, persistedPurchaseByKey, purchaseEdits, catalogMetaMap]);

  const purchaseSheetStatus = useMemo(
    () => (purchaseRows.some((row) => row.purchase_status === "finalized") ? "finalized" : "draft"),
    [purchaseRows],
  );

  const purchaseTotals = useMemo(() => {
    let requiredQty = 0;
    let purchasedQty = 0;
    let spend = 0;
    let shortageCount = 0;
    let extraCount = 0;
    purchaseRows.forEach((row) => {
      requiredQty += row.final_qty;
      purchasedQty += row.purchased_qty;
      spend += row.line_total;
      if (row.variance_qty < 0) shortageCount += 1;
      if (row.variance_qty > 0) extraCount += 1;
    });
    return {
      requiredQty: round2(requiredQty),
      purchasedQty: round2(purchasedQty),
      spend: round2(spend),
      shortageCount,
      extraCount,
    };
  }, [purchaseRows]);

  const purchaseRowsForFlow = useMemo(
    () => purchaseRows.filter((row) => row.final_qty > 0 || row.purchased_qty > 0),
    [purchaseRows],
  );

  const filteredPurchaseRows = useMemo(() => {
    const term = purchaseSearch.trim().toLowerCase();
    if (!term) return purchaseRowsForFlow;
    return purchaseRowsForFlow.filter(
      (row) =>
        row.item_en.toLowerCase().includes(term) ||
        row.item_code.toLowerCase().includes(term),
    );
  }, [purchaseRowsForFlow, purchaseSearch]);

  const pendingPurchaseRows = useMemo(
    () => filteredPurchaseRows.filter((row) => row.purchased_qty <= 0),
    [filteredPurchaseRows],
  );

  const boughtPurchaseRows = useMemo(
    () => filteredPurchaseRows.filter((row) => row.purchased_qty > 0),
    [filteredPurchaseRows],
  );

  const currentPurchaseRow = useMemo(
    () => filteredPurchaseRows.find((row) => row.item_code === currentPurchaseKey) || null,
    [filteredPurchaseRows, currentPurchaseKey],
  );

  const currentPurchaseIndex = useMemo(() => {
    if (!currentPurchaseRow) return 0;
    const found = filteredPurchaseRows.findIndex((row) => row.item_code === currentPurchaseRow.item_code);
    return found < 0 ? 0 : found;
  }, [filteredPurchaseRows, currentPurchaseRow]);

  const purchaseHistoryByDate = useMemo(() => {
    const grouped = new Map<string, { totalAmount: number; itemCount: number }>();
    purchaseHistoryRows.forEach((row) => {
      const existing = grouped.get(row.purchase_date) || { totalAmount: 0, itemCount: 0 };
      existing.totalAmount = round2(existing.totalAmount + toSafeNumber(row.line_total, 0));
      existing.itemCount += 1;
      grouped.set(row.purchase_date, existing);
    });
    return Array.from(grouped.entries()).map(([date, values]) => ({
      date,
      ...values,
    })).sort((a, b) => b.date.localeCompare(a.date));
  }, [purchaseHistoryRows]);

  const purchaseHistoryDetailRows = useMemo(
    () =>
      historyDate
        ? purchaseHistoryRows.filter((row) => row.purchase_date === historyDate)
        : [],
    [historyDate, purchaseHistoryRows],
  );

  const finalizedPurchaseByDate = useMemo(() => {
    const map = new Map<string, number>();
    accountSpendRows.forEach((row) => {
      const next = (map.get(row.purchase_date) || 0) + toSafeNumber(row.line_total, 0);
      map.set(row.purchase_date, round2(next));
    });
    return map;
  }, [accountSpendRows]);

  const accountLedgersById = useMemo(() => {
    const map = new Map<string, AccountLedgerRow>();
    accountLedgers.forEach((row) => map.set(row.id, row));
    return map;
  }, [accountLedgers]);

  const accountLedgersByCode = useMemo(() => {
    const map = new Map<string, AccountLedgerRow>();
    accountLedgers.forEach((row) => map.set(row.code, row));
    return map;
  }, [accountLedgers]);

  const purchaseUsers = useMemo(
    () => appUsers.filter((user) => user.role === "purchase" || user.role === "sales"),
    [appUsers],
  );

  const purchaseUserLedgerByUserId = useMemo(() => {
    const map = new Map<string, PurchaseUserLedgerMapRow>();
    purchaseUserLedgerMapRows.forEach((row) => {
      if (row.is_active) map.set(row.user_id, row);
    });
    return map;
  }, [purchaseUserLedgerMapRows]);

  const purchaseUserById = useMemo(() => {
    const map = new Map<string, AppUserRow>();
    purchaseUsers.forEach((row) => map.set(row.id, row));
    return map;
  }, [purchaseUsers]);

  const journalLinesByVoucherId = useMemo(() => {
    const map = new Map<string, JournalLineRow[]>();
    journalLineRows.forEach((row) => {
      const list = map.get(row.voucher_id) || [];
      list.push(row);
      map.set(row.voucher_id, list);
    });
    return map;
  }, [journalLineRows]);

  const accountsDayClosureByDate = useMemo(() => {
    const map = new Map<string, AccountsDayClosureRow>();
    accountsDayClosureRows.forEach((row) => map.set(row.closure_date, row));
    return map;
  }, [accountsDayClosureRows]);

  const journalVouchersByDate = useMemo(() => {
    const map = new Map<string, JournalVoucherRow[]>();
    journalVoucherRows.forEach((row) => {
      const list = map.get(row.voucher_date) || [];
      list.push(row);
      map.set(row.voucher_date, list);
    });
    return map;
  }, [journalVoucherRows]);

  const openingNetByDate = useMemo(() => {
    const map = new Map<string, number>();
    openingBalanceRows.forEach((row) => {
      const next = (map.get(row.opening_date) || 0) + toSafeNumber(row.opening_dr, 0) - toSafeNumber(row.opening_cr, 0);
      map.set(row.opening_date, round2(next));
    });
    return map;
  }, [openingBalanceRows]);

  const accountRows = useMemo(() => {
    const keys = new Set<string>([
      ...Array.from(finalizedPurchaseByDate.keys()),
      ...Array.from(journalVouchersByDate.keys()),
      ...Array.from(accountsDayClosureByDate.keys()),
      ...Array.from(openingNetByDate.keys()),
    ]);
    return Array.from(keys)
      .map((date) => {
        const expectedSpend = round2(finalizedPurchaseByDate.get(date) || 0);
        const vouchers = journalVouchersByDate.get(date) || [];
        let spend = 0;
        let cashIssued = 0;
        let cashReturned = 0;
        vouchers.forEach((voucher) => {
          if (voucher.is_reversed) return;
          const amount = toSafeNumber(voucher.voucher_amount, 0);
          if (voucher.voucher_type === "cash_issue") cashIssued += amount;
          if (voucher.voucher_type === "cash_return") cashReturned += amount;
          if (voucher.voucher_type === "purchase") spend += amount;
        });
        spend = round2(spend);
        cashIssued = round2(cashIssued);
        cashReturned = round2(cashReturned);
        const closure = accountsDayClosureByDate.get(date);
        const isClosed = Boolean(closure?.is_closed);
        const computed = computeAccountsDay({
          date,
          expectedSpend,
          spend,
          cashIssued,
          cashReturned,
          isClosed,
          closeNote: closure?.close_note || "",
        });
        return {
          ...computed,
          vouchers,
          openingNet: round2(openingNetByDate.get(date) || 0),
          closedBy: closure?.closed_by || null,
          closedAt: closure?.closed_at || null,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [finalizedPurchaseByDate, journalVouchersByDate, accountsDayClosureByDate, openingNetByDate]);

  const accountTotals = useMemo(() => {
    let spend = 0;
    let cashIssued = 0;
    let cashReturned = 0;
    let mismatchCount = 0;
    let closedCount = 0;
    let openingNet = 0;
    accountRows.forEach((row) => {
      spend += row.spend;
      cashIssued += row.cashIssued;
      cashReturned += row.cashReturned;
      if (row.difference !== 0) mismatchCount += 1;
      if (row.isClosed) closedCount += 1;
      openingNet += row.openingNet || 0;
    });
    return {
      spend: round2(spend),
      cashIssued: round2(cashIssued),
      cashReturned: round2(cashReturned),
      mismatchCount,
      closedCount,
      openingNet: round2(openingNet),
    };
  }, [accountRows]);

  const selectedAccountRow = useMemo(
    () => accountRows.find((row) => row.date === selectedAccountsDate) || null,
    [accountRows, selectedAccountsDate],
  );
  const selectedAccountSpend = round2(selectedAccountRow?.spend || 0);
  const selectedCashIssued = round2(selectedAccountRow?.cashIssued || 0);
  const selectedCashReturned = round2(selectedAccountRow?.cashReturned || 0);
  const selectedCashDifference = round2(selectedAccountRow?.difference || 0);

  useEffect(() => {
    if (filteredPurchaseRows.length === 0) {
      setCurrentPurchaseKey(null);
      return;
    }
    const currentExists = filteredPurchaseRows.some((row) => row.item_code === currentPurchaseKey);
    if (currentExists) return;
    const firstPending = filteredPurchaseRows.find((row) => row.purchased_qty <= 0);
    setCurrentPurchaseKey((firstPending || filteredPurchaseRows[0]).item_code);
  }, [filteredPurchaseRows, currentPurchaseKey, purchaseStep]);

  useEffect(() => {
    if (accountRows.length === 0) {
      setSelectedAccountsDate(null);
      return;
    }
    const exists = accountRows.some((row) => row.date === selectedAccountsDate);
    if (!exists) {
      setSelectedAccountsDate(accountRows[0].date);
    }
  }, [accountRows, selectedAccountsDate]);

  useEffect(() => {
    if (!selectedAccountRow) {
      setAccountsCloseNote("");
      return;
    }
    setAccountsCloseNote(selectedAccountRow.closeNote || "");
  }, [selectedAccountRow]);

  useEffect(() => {
    if (isPurchaseMode && (accountsSubView === "setup" || accountsSubView === "closing")) {
      setAccountsSubView("issue");
    }
  }, [isPurchaseMode, accountsSubView]);

  useEffect(() => {
    if (purchaseUsers.length === 0) return;
    const defaultUserId = isPurchaseMode ? purchaseSessionUser?.id || purchaseUsers[0].id : purchaseUsers[0].id;
    if (!cashTxnUserId) setCashTxnUserId(defaultUserId);
    if (!purchasePostingUserId) setPurchasePostingUserId(defaultUserId);
    if (!setupMappingUserId) setSetupMappingUserId(purchaseUsers[0].id);
  }, [purchaseUsers, cashTxnUserId, purchasePostingUserId, setupMappingUserId, isPurchaseMode, purchaseSessionUser]);

  useEffect(() => {
    if (!setupMappingUserId) return;
    const mappedLedger = purchaseUserLedgerByUserId.get(setupMappingUserId);
    if (mappedLedger) {
      setSetupMappingLedgerId(mappedLedger.ledger_id);
      return;
    }
    if (!setupMappingLedgerId && accountLedgers.length > 0) {
      setSetupMappingLedgerId(accountLedgers[0].id);
    }
  }, [setupMappingUserId, purchaseUserLedgerByUserId, setupMappingLedgerId, accountLedgers]);

  useEffect(() => {
    if (!openingLedgerId && accountLedgers.length > 0) {
      setOpeningLedgerId(accountLedgers[0].id);
    }
  }, [openingLedgerId, accountLedgers]);

  const handleCreateRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    setRestaurantError("");
    setRestaurantSuccess("");
    const cleanName = restaurantName.trim();
    const cleanSlug = toSlug(restaurantSlug.trim());

    if (!cleanName) {
      setRestaurantError("Restaurant name is required.");
      return;
    }
    if (!cleanSlug) {
      setRestaurantError("Valid slug is required.");
      return;
    }

    createRestaurant.mutate({ name: cleanName, slug: cleanSlug });
  };

  const copyLink = async (link: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const input = document.createElement("textarea");
        input.value = link;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(input);
        if (!copied) {
          throw new Error("copy-failed");
        }
      }
      setRestaurantSuccess(`Copied ${label}: ${link}`);
      setRestaurantError("");
    } catch {
      setRestaurantError(`Copy failed on this browser. Use this link: ${link}`);
      setRestaurantSuccess("");
    }
  };

  const copyRestaurantLink = async (slug: string) => copyLink(getRestaurantOrderLink(slug), "order link");

  const printRestaurantQr = (name: string, slug: string) => {
    const link = getRestaurantOrderLink(slug);
    const qr = getQrUrl(link, 420);
    const popup = window.open("", "_blank", "width=700,height=900");
    if (!popup) return;
    popup.document.open();
    popup.document.write(
      buildPrintableDoc(
        `
        <section style="text-align:center; padding: 24px 8px;">
          <h1 style="font-size: 26px; margin-bottom: 10px;">${escapeHtml(name)}</h1>
          <p style="font-size: 14px; margin: 0 0 20px;">Scan to place order</p>
          <img src="${qr}" alt="Order QR code for ${escapeHtml(name)}" style="width: 320px; height: 320px; border: 1px solid #ddd; border-radius: 12px;" />
          <p style="margin-top: 16px; font-size: 12px; word-break: break-all;">${escapeHtml(link)}</p>
        </section>
        `,
        `${name} Order QR`,
      ),
    );
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const printPurchaseQr = () => {
    const link = getPurchaseLink();
    const qr = getQrUrl(link, 420);
    const popup = window.open("", "_blank", "width=700,height=900");
    if (!popup) return;
    popup.document.open();
    popup.document.write(
      buildPrintableDoc(
        `
        <section style="text-align:center; padding: 24px 8px;">
          <h1 style="font-size: 26px; margin-bottom: 10px;">Purchase Page QR</h1>
          <p style="font-size: 14px; margin: 0 0 20px;">Scan to open purchase page</p>
          <img src="${qr}" alt="Purchase page QR code" style="width: 320px; height: 320px; border: 1px solid #ddd; border-radius: 12px;" />
          <p style="margin-top: 16px; font-size: 12px; word-break: break-all;">${escapeHtml(link)}</p>
        </section>
        `,
        "Purchase Page QR",
      ),
    );
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const updatePurchaseRow = (
    itemKey: string,
    field:
      | "adjustment_qty"
      | "purchased_qty"
      | "pack_size"
      | "pack_count"
      | "unit_price"
      | "vendor_name"
      | "notes",
    value: string,
  ) => {
    setPurchaseEdits((prev) => {
      const existing = prev[itemKey] || {};
      if (
        field === "adjustment_qty" ||
        field === "purchased_qty" ||
        field === "pack_size" ||
        field === "pack_count" ||
        field === "unit_price"
      ) {
        const parsed = Number(value);
        return {
          ...prev,
          [itemKey]: {
            ...existing,
            [field]: Number.isFinite(parsed) ? parsed : 0,
          },
        };
      }
      return {
        ...prev,
        [itemKey]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleSaveDraft = () => savePurchaseSheet.mutate({ mode: "draft" });

  const handleFinalizePurchase = async () => {
    try {
      await savePurchaseSheet.mutateAsync({ mode: "finalized" });
      await lockPurchaseDay.mutateAsync();
      setPurchaseStep("history");
    } catch {
      // handled by mutation error handlers
    }
  };

  const moveWizardToIndex = (targetIndex: number) => {
    if (filteredPurchaseRows.length === 0) return;
    const clamped = Math.max(0, Math.min(filteredPurchaseRows.length - 1, targetIndex));
    setCurrentPurchaseKey(filteredPurchaseRows[clamped].item_code);
  };

  const updatePurchasedQtyByStep = (row: PurchasePlanRow, delta: number) => {
    const next = Math.max(0, round2(row.purchased_qty + delta));
    updatePurchaseRow(row.item_code, "purchased_qty", String(next));
  };

  const handleMarkBoughtAndNext = async () => {
    if (!currentPurchaseRow || isPurchaseDayLocked) return;
    try {
      await savePurchaseItem.mutateAsync({ row: currentPurchaseRow, mode: "draft" });
      const nextPending = filteredPurchaseRows.find(
        (row) => row.item_code !== currentPurchaseRow.item_code && row.purchased_qty <= 0,
      );
      if (nextPending) {
        setCurrentPurchaseKey(nextPending.item_code);
        return;
      }
      moveWizardToIndex(currentPurchaseIndex + 1);
    } catch {
      // handled by mutation error handlers
    }
  };

  const printOrder = (order: Order) => {
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) return;
    popup.document.open();
    popup.document.write(
      buildPrintableDoc(buildPrintableOrderSection(order), `Order ${order.order_ref}`),
    );
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const printCurrentList = () => {
    const printable = filteredOrders.map((o) => buildPrintableOrderSection(o)).join("\n");
    const popup = window.open("", "_blank", "width=1000,height=800");
    if (!popup) return;
    popup.document.open();
    popup.document.write(buildPrintableDoc(printable, "Orders Print"));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const printDispatchSlip = () => {
    const rowsHtml = deliveryDispatchOrders
      .map((order) => {
        const itemsSummary = (order.items || [])
          .map((item) => `${escapeHtml(item.en)} (${escapeHtml(String(item.qty))} kg)`)
          .join(", ");
        return `
          <tr>
            <td>${escapeHtml(order.restaurant_name || "-")}</td>
            <td>${escapeHtml(order.order_ref || "-")}</td>
            <td>${escapeHtml(formatIsoDateDdMmYyyy(order.delivery_date))}</td>
            <td>${escapeHtml(order.contact_name || "-")} (${escapeHtml(order.contact_phone || "-")})</td>
            <td>${escapeHtml(
              order.status
                .split("_")
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(" "),
            )}</td>
            <td>${itemsSummary || "-"}</td>
            <td>${escapeHtml(order.notes || "-")}</td>
          </tr>
        `;
      })
      .join("");

    const content = `
      <section class="order-block">
        <h1>Dispatch Slip</h1>
        <div class="meta">
          <p><strong>Printed At:</strong> ${escapeHtml(formatIndiaDate(new Date()))} ${escapeHtml(formatIndiaTime(new Date().toISOString()))}</p>
          <p><strong>Active Dispatch Orders:</strong> ${deliveryDispatchOrders.length}</p>
          <p><strong>Ready:</strong> ${deliveryCounts.confirmed} | <strong>Out:</strong> ${deliveryCounts.outForDelivery}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Restaurant</th>
              <th>Ref</th>
              <th>Delivery Date</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Items</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </section>
    `;
    const popup = window.open("", "_blank", "width=1200,height=800");
    if (!popup) return;
    popup.document.open();
    popup.document.write(buildPrintableDoc(content, "Dispatch Slip"));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const printPurchaseList = () => {
    const rowsHtml = purchaseRowsForFlow
      .map((row) => {
        const variance = round2(row.variance_qty);
        const mismatchStatus = variance === 0 ? "0" : variance > 0 ? `+${variance}` : String(variance);

        return `
          <tr>
            <td>${escapeHtml(row.item_code)}</td>
            <td>${escapeHtml(row.item_en)}</td>
            <td>${escapeHtml(row.item_hi || "-")}</td>
            <td>${escapeHtml(String(row.final_qty))}</td>
            <td>${escapeHtml(String(row.purchased_qty))}</td>
            <td>${escapeHtml(String(variance))}</td>
            <td>${escapeHtml(mismatchStatus)}</td>
            <td>${escapeHtml(String(row.unit_price))}</td>
            <td>${escapeHtml(String(row.line_total))}</td>
            <td>${escapeHtml(row.vendor_name || "-")}</td>
            <td>${escapeHtml(row.notes || "-")}</td>
          </tr>
        `;
      })
      .join("");
    const content = `
      <section class="order-block">
        <h1>Final Purchase Sheet (Confirmed Orders)</h1>
        <div class="meta">
          <p><strong>Date:</strong> ${escapeHtml(formatIndiaDate(new Date()))}</p>
          <p><strong>Confirmed Orders Count:</strong> ${ordersForPurchase.length}</p>
          <p><strong>Sheet Status:</strong> ${escapeHtml(purchaseSheetStatus)}</p>
          <p><strong>Total Required (kg):</strong> ${escapeHtml(String(purchaseTotals.requiredQty))}</p>
          <p><strong>Total Purchased (kg):</strong> ${escapeHtml(String(purchaseTotals.purchasedQty))}</p>
          <p><strong>Total Spend (INR):</strong> ${escapeHtml(String(purchaseTotals.spend))}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Item</th>
              <th>Hindi</th>
              <th>Required (kg)</th>
              <th>Purchased (kg)</th>
              <th>Variance (kg)</th>
              <th>Mismatch</th>
              <th>Unit Price</th>
              <th>Line Total</th>
              <th>Vendor</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </section>
    `;
    const popup = window.open("", "_blank", "width=1000,height=800");
    if (!popup) return;
    popup.document.open();
    popup.document.write(buildPrintableDoc(content, "Final Purchase Sheet"));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const printHistoryDateSheet = (date: string) => {
    const rows = purchaseHistoryRows.filter((row) => row.purchase_date === date);
    const rowsHtml = rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.item_code || "-")}</td>
            <td>${escapeHtml(row.item_en)}</td>
            <td>${escapeHtml(row.item_hi || "-")}</td>
            <td>${escapeHtml(String(row.final_qty ?? 0))}</td>
            <td>${escapeHtml(String(row.purchased_qty ?? 0))}</td>
            <td>${escapeHtml(String(row.variance_qty ?? 0))}</td>
            <td>${escapeHtml(String(row.unit_price ?? 0))}</td>
            <td>${escapeHtml(String(row.line_total ?? 0))}</td>
            <td>${escapeHtml(row.vendor_name || "-")}</td>
          </tr>
        `,
      )
      .join("");

    const content = `
      <section class="order-block">
        <h1>Purchase History - ${escapeHtml(date)}</h1>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Item</th>
              <th>Hindi</th>
              <th>Required (kg)</th>
              <th>Purchased (kg)</th>
              <th>Variance (kg)</th>
              <th>Unit Price</th>
              <th>Line Total</th>
              <th>Vendor</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </section>
    `;
    const popup = window.open("", "_blank", "width=1000,height=800");
    if (!popup) return;
    popup.document.open();
    popup.document.write(buildPrintableDoc(content, `Purchase History ${date}`));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const printAccountsSelectedDay = () => {
    if (!selectedAccountRow) return;
    const voucherRowsHtml = selectedAccountRow.vouchers
      .map(
        (voucher) => `
          <tr>
            <td>${escapeHtml(voucher.voucher_no)}</td>
            <td>${escapeHtml(voucher.voucher_type)}</td>
            <td>INR ${escapeHtml(String(voucher.voucher_amount))}</td>
            <td>${escapeHtml(voucher.narration || "-")}</td>
            <td>${escapeHtml(formatIndiaDateTime(voucher.posted_at))}</td>
          </tr>
        `,
      )
      .join("");
    const content = `
      <section class="order-block">
        <h1>Daily Cash Ledger - ${escapeHtml(formatIsoDateDdMmYyyy(selectedAccountRow.date))}</h1>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Finalized Purchase (Expected)</td><td>INR ${escapeHtml(String(selectedAccountRow.expectedSpend))}</td></tr>
            <tr><td>Purchase Posted</td><td>INR ${escapeHtml(String(selectedAccountRow.spend))}</td></tr>
            <tr><td>Cash Issued</td><td>INR ${escapeHtml(String(selectedAccountRow.cashIssued))}</td></tr>
            <tr><td>Expected Cash Left</td><td>INR ${escapeHtml(String(selectedAccountRow.expectedCashLeft))}</td></tr>
            <tr><td>Cash Returned</td><td>INR ${escapeHtml(String(selectedAccountRow.cashReturned))}</td></tr>
            <tr><td>Difference</td><td>INR ${escapeHtml(String(selectedAccountRow.difference))}</td></tr>
            <tr><td>Status</td><td>${escapeHtml(selectedAccountRow.status)}</td></tr>
            <tr><td>Close Note</td><td>${escapeHtml(selectedAccountRow.closeNote || "-")}</td></tr>
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th>Voucher No</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Narration</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>${voucherRowsHtml || "<tr><td colspan='5'>No vouchers</td></tr>"}</tbody>
        </table>
      </section>
    `;
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) return;
    popup.document.open();
    popup.document.write(buildPrintableDoc(content, `Daily Settlement ${selectedAccountRow.date}`));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const printAccountsRangeSummary = () => {
    if (accountRows.length === 0) return;
    const rowsHtml = accountRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(formatIsoDateDdMmYyyy(row.date))}</td>
            <td>INR ${escapeHtml(String(row.expectedSpend))}</td>
            <td>INR ${escapeHtml(String(row.spend))}</td>
            <td>INR ${escapeHtml(String(row.openingNet || 0))}</td>
            <td>INR ${escapeHtml(String(row.cashIssued))}</td>
            <td>INR ${escapeHtml(String(row.cashReturned))}</td>
            <td>INR ${escapeHtml(String(row.difference))}</td>
            <td>${escapeHtml(row.status)}</td>
          </tr>
        `,
      )
      .join("");

    const content = `
      <section class="order-block">
        <h1>Accounts Summary (${escapeHtml(formatIsoDateDdMmYyyy(safeAccountsFromDate))} to ${escapeHtml(formatIsoDateDdMmYyyy(safeAccountsToDate))})</h1>
        <div class="meta">
          <p><strong>Total Spend:</strong> INR ${escapeHtml(String(accountTotals.spend))}</p>
          <p><strong>Opening Net:</strong> INR ${escapeHtml(String(accountTotals.openingNet || 0))}</p>
          <p><strong>Total Cash Issued:</strong> INR ${escapeHtml(String(accountTotals.cashIssued))}</p>
          <p><strong>Total Cash Returned:</strong> INR ${escapeHtml(String(accountTotals.cashReturned))}</p>
          <p><strong>Mismatch Days:</strong> ${escapeHtml(String(accountTotals.mismatchCount))}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Expected Purchase</th>
              <th>Spend</th>
              <th>Opening Net</th>
              <th>Cash Given</th>
              <th>Cash Returned</th>
              <th>Difference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </section>
    `;
    const popup = window.open("", "_blank", "width=1000,height=800");
    if (!popup) return;
    popup.document.open();
    popup.document.write(buildPrintableDoc(content, "Accounts Summary"));
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div className="app-dvh bg-background overflow-hidden md:grid md:grid-cols-[250px_1fr]">
      <aside className="hidden md:flex md:flex-col border-r border-border bg-card sticky top-0 h-[100dvh] overflow-y-auto p-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold">{isSalesSession ? "Sales Panel" : "Admin Panel"}</h1>
          <p className="text-xs text-muted-foreground">{formatIndiaDate(new Date())}</p>
        </div>
        <div className="space-y-2">
          {!isPurchaseMode && (
            <>
              <Button variant={activeView === "orders" ? "default" : "outline"} className="w-full justify-start" onClick={() => setActiveView("orders")}>Orders</Button>
              <Button variant={activeView === "delivery" ? "default" : "outline"} className="w-full justify-start" onClick={() => setActiveView("delivery")}>Delivery</Button>
              <Button variant={activeView === "sales" ? "default" : "outline"} className="w-full justify-start" onClick={() => setActiveView("sales")}>Sales</Button>
            </>
          )}
          {isSalesSession && (
            <Button variant={activeView === "sales" ? "default" : "outline"} className="w-full justify-start" onClick={() => setActiveView("sales")}>Sales</Button>
          )}
          {!isSalesSession && (
            <>
              <Button variant={activeView === "purchase" ? "default" : "outline"} className="w-full justify-start" onClick={() => setActiveView("purchase")}>Purchase</Button>
              {!isPurchaseMode && (
                <Button variant={activeView === "accounts" ? "default" : "outline"} className="w-full justify-start" onClick={() => setActiveView("accounts")}>Accounts</Button>
              )}
            </>
          )}
          {!isPurchaseMode && (
            <>
              <Button variant={activeView === "restaurants" ? "default" : "outline"} className="w-full justify-start" onClick={() => setActiveView("restaurants")}>Page Links / QR</Button>
              <Button variant={activeView === "stock" ? "default" : "outline"} className="w-full justify-start" onClick={() => setActiveView("stock")}>Stock</Button>
              <Button variant={activeView === "users" ? "default" : "outline"} className="w-full justify-start" onClick={() => setActiveView("users")}>Users</Button>
            </>
          )}
        </div>
        {!isPurchaseMode && activeView === "orders" && (
          <div className="mt-6 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Order Status</p>
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                type="button"
                variant={activeTab === tab.key ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {(orderStatusCounts[tab.key] || 0) > 0 && (
                  <span className="ml-2 text-xs font-semibold">{orderStatusCounts[tab.key]}</span>
                )}
              </Button>
            ))}
          </div>
        )}
        <div className="mt-auto">
          <Button variant="outline" className="w-full" onClick={logout}>Logout</Button>
        </div>
      </aside>

      <main className="min-w-0 h-[100dvh] overflow-hidden flex flex-col">
        <header className={`md:hidden bg-card border-b border-border px-3 py-3 ${activeView === "purchase" ? "" : "sticky top-0 z-40"}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-base font-bold">{isSalesSession ? "Sales Panel" : "Admin Panel"}</h1>
              <p className="text-xs text-muted-foreground">{formatIndiaDate(new Date())}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {!isPurchaseMode && (
              <>
                <Button size="sm" variant={activeView === "orders" ? "default" : "outline"} onClick={() => setActiveView("orders")}>Orders</Button>
                <Button size="sm" variant={activeView === "delivery" ? "default" : "outline"} onClick={() => setActiveView("delivery")}>Delivery</Button>
                <Button size="sm" variant={activeView === "sales" ? "default" : "outline"} onClick={() => setActiveView("sales")}>Sales</Button>
              </>
            )}
            {isSalesSession && <Button size="sm" variant={activeView === "sales" ? "default" : "outline"} onClick={() => setActiveView("sales")}>Sales</Button>}
            {!isSalesSession && (
              <>
                <Button size="sm" variant={activeView === "purchase" ? "default" : "outline"} onClick={() => setActiveView("purchase")}>Purchase</Button>
                {!isPurchaseMode && (
                  <Button size="sm" variant={activeView === "accounts" ? "default" : "outline"} onClick={() => setActiveView("accounts")}>Accounts</Button>
                )}
              </>
            )}
            {!isPurchaseMode && (
              <>
                <Button size="sm" variant={activeView === "restaurants" ? "default" : "outline"} onClick={() => setActiveView("restaurants")}>Links / QR</Button>
                <Button size="sm" variant={activeView === "stock" ? "default" : "outline"} onClick={() => setActiveView("stock")}>Stock</Button>
                <Button size="sm" variant={activeView === "users" ? "default" : "outline"} onClick={() => setActiveView("users")}>Users</Button>
              </>
            )}
          </div>
          {!isPurchaseMode && activeView === "orders" && (
            <div className="flex gap-2 overflow-x-auto pt-2">
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  size="sm"
                  variant={activeTab === tab.key ? "secondary" : "ghost"}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {(orderStatusCounts[tab.key] || 0) > 0 && (
                    <span className="ml-1 text-xs font-semibold">{orderStatusCounts[tab.key]}</span>
                  )}
                </Button>
              ))}
            </div>
          )}
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mobile-stable-scroll p-3 sm:p-4 md:p-6 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="max-w-5xl">
{activeView === "purchase" && (
          <section className="bg-card rounded-lg border border-border p-4 mb-4 purchase-mobile-shell">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Purchase Wizard</h2>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-md ${
                    isPurchaseDayLocked ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isPurchaseDayLocked ? "Locked" : "Open"}
                </span>
                {isPurchaseDayLocked && isAdminMode && (
                  <Button type="button" variant="outline" size="sm" onClick={() => reopenPurchaseDay.mutate()} disabled={reopenPurchaseDay.isPending}>
                    Reopen
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Confirmed orders matched: <span className="font-semibold text-foreground">{ordersForPurchase.length}</span>
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Item-by-item buying flow. Simple and field friendly.
            </p>
            <div className="flex gap-2 flex-wrap mb-4">
              <Button type="button" size="sm" variant={purchaseStep === "need" ? "default" : "outline"} onClick={() => setPurchaseStep("need")}>Need List</Button>
              <Button type="button" size="sm" variant={purchaseStep === "buy" ? "default" : "outline"} onClick={() => setPurchaseStep("buy")}>Buy Item</Button>
              <Button type="button" size="sm" variant={purchaseStep === "finalize" ? "default" : "outline"} onClick={() => setPurchaseStep("finalize")}>Finalize</Button>
              <Button type="button" size="sm" variant={purchaseStep === "history" ? "default" : "outline"} onClick={() => setPurchaseStep("history")}>History</Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Required</p>
                <p className="text-sm font-semibold">{purchaseTotals.requiredQty} kg</p>
              </div>
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Purchased</p>
                <p className="text-sm font-semibold">{purchaseTotals.purchasedQty} kg</p>
              </div>
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Spend</p>
                <p className="text-sm font-semibold">INR {purchaseTotals.spend}</p>
              </div>
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Progress</p>
                <p className="text-sm font-semibold">{boughtPurchaseRows.length}/{filteredPurchaseRows.length}</p>
              </div>
            </div>

            {(purchaseStep === "need" || purchaseStep === "buy") && (
              <div className="mb-4">
              <Input
                value={purchaseSearch}
                onChange={(e) => setPurchaseSearch(e.target.value)}
                placeholder="Search item (name/code)"
                className="h-10"
                inputMode="search"
              />
              </div>
            )}

            {isPurchaseLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading purchase sheet...</p>
            ) : filteredPurchaseRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No confirmed order items.</p>
            ) : purchaseStep === "need" ? (
              <div className="space-y-2">
                {filteredPurchaseRows.map((row) => (
                  <button
                    key={row.item_code}
                    type="button"
                    onClick={() => {
                      setCurrentPurchaseKey(row.item_code);
                      setPurchaseStep("buy");
                    }}
                    className="w-full border border-border rounded-md p-3 text-left hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{row.item_en}</p>
                        <p className="text-xs text-muted-foreground font-hindi">{row.item_hi || "-"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{row.final_qty} kg</p>
                        <span className={`text-xs font-semibold ${row.purchased_qty > 0 ? "text-primary" : "text-muted-foreground"}`}>
                          {row.purchased_qty > 0 ? "Bought" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : purchaseStep === "buy" ? (
              currentPurchaseRow ? (
                <div className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold">{currentPurchaseRow.item_en}</p>
                      <p className="text-xs text-muted-foreground font-hindi">{currentPurchaseRow.item_hi || "-"}</p>
                      <p className="text-xs text-muted-foreground">Code: {currentPurchaseRow.item_code}</p>
                    </div>
                    <p className="text-sm font-semibold">Required: {currentPurchaseRow.final_qty} kg</p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Purchased Qty (kg)</label>
                      <div className="flex items-center gap-1.5">
                        <Button type="button" variant="outline" onClick={() => updatePurchasedQtyByStep(currentPurchaseRow, -1)} className="h-10 w-10 px-0 text-lg font-medium" disabled={isPurchaseDayLocked}>−</Button>
                        <Input type="number" step={APP_CONFIG.order.quantityInputStepKg} value={currentPurchaseRow.purchased_qty} onChange={(e) => updatePurchaseRow(currentPurchaseRow.item_code, "purchased_qty", e.target.value)} className="h-10 text-center purchase-field-input" disabled={isPurchaseDayLocked} inputMode="decimal" />
                        <Button type="button" variant="outline" onClick={() => updatePurchasedQtyByStep(currentPurchaseRow, 1)} className="h-10 w-10 px-0 text-lg font-medium" disabled={isPurchaseDayLocked}>+</Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Price (INR/kg)</label>
                      <Input type="number" step={0.01} value={currentPurchaseRow.unit_price} onChange={(e) => updatePurchaseRow(currentPurchaseRow.item_code, "unit_price", e.target.value)} className="h-10 purchase-field-input" disabled={isPurchaseDayLocked} inputMode="decimal" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Vendor</label>
                      <Input value={currentPurchaseRow.vendor_name || ""} onChange={(e) => updatePurchaseRow(currentPurchaseRow.item_code, "vendor_name", e.target.value)} placeholder="optional" className="h-10 purchase-field-input" disabled={isPurchaseDayLocked} />
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <p>Amount: <span className="font-semibold">INR {currentPurchaseRow.line_total}</span></p>
                    <p className="text-muted-foreground">Variance: {currentPurchaseRow.variance_qty} kg</p>
                  </div>
                  {isPurchaseDayLocked ? (
                    <p className="text-xs text-destructive mt-3">
                      Finalized and locked. Only admin can reopen for edits.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => moveWizardToIndex(currentPurchaseIndex - 1)}>Prev</Button>
                      <Button type="button" variant="outline" onClick={() => savePurchaseItem.mutate({ row: currentPurchaseRow, mode: "draft" })} disabled={savePurchaseItem.isPending}>Save Item</Button>
                      <Button type="button" onClick={handleMarkBoughtAndNext} disabled={savePurchaseItem.isPending}>Mark Bought & Next</Button>
                      <Button type="button" variant="outline" onClick={() => moveWizardToIndex(currentPurchaseIndex + 1)}>Next</Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">No item selected.</p>
              )
            ) : purchaseStep === "finalize" ? (
              <div className="space-y-3">
                <p className="text-sm">Bought items: <span className="font-semibold">{boughtPurchaseRows.length}</span> / {filteredPurchaseRows.length}</p>
                <p className="text-sm">Shortage items: <span className="font-semibold">{pendingPurchaseRows.length}</span></p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={purchaseRowsForFlow.length === 0 || savePurchaseSheet.isPending || isPurchaseDayLocked}>Save Draft</Button>
                  <Button type="button" onClick={handleFinalizePurchase} disabled={purchaseRowsForFlow.length === 0 || savePurchaseSheet.isPending || isPurchaseDayLocked || lockPurchaseDay.isPending}>Finalize Purchase</Button>
                  <Button type="button" variant="outline" onClick={printPurchaseList} disabled={purchaseRowsForFlow.length === 0}>Print Final Sheet</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Purchase History</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">From</label>
                    <Input type="date" value={purchaseHistoryFromDate} max={todayIso} onChange={(e) => setPurchaseHistoryFromDate(e.target.value || purchaseHistoryWindowStartIso)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">To</label>
                    <Input type="date" value={purchaseHistoryToDate} max={todayIso} onChange={(e) => setPurchaseHistoryToDate(e.target.value || todayIso)} />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setPurchaseHistoryFromDate(purchaseHistoryWindowStartIso);
                        setPurchaseHistoryToDate(todayIso);
                      }}
                    >
                      Reset Range
                    </Button>
                  </div>
                </div>
                {purchaseHistoryByDate.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No finalized history yet.</p>
                ) : (
                  <div className="space-y-1">
                    {purchaseHistoryByDate.map((row) => (
                      <button key={row.date} type="button" onClick={() => setHistoryDate(row.date)} className={`w-full text-left flex items-center justify-between text-sm border rounded-md px-3 py-2 ${historyDate === row.date ? "border-primary" : "border-border"}`}>
                        <span>{formatIsoDateDdMmYyyy(row.date)}</span>
                        <span className="font-semibold">{row.itemCount} items · INR {row.totalAmount}</span>
                      </button>
                    ))}
                  </div>
                )}
                {historyDate && (
                  <div className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">Detail: {formatIsoDateDdMmYyyy(historyDate)}</h4>
                      <Button type="button" variant="outline" size="sm" onClick={() => printHistoryDateSheet(historyDate)}>Print</Button>
                    </div>
                    {purchaseHistoryDetailRows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No items for this date.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left">
                              <th className="py-2 pr-2">Item</th>
                              <th className="py-2 pr-2">Hindi</th>
                              <th className="py-2 pr-2 text-right">Required</th>
                              <th className="py-2 pr-2 text-right">Purchased</th>
                              <th className="py-2 pr-2 text-right">Price</th>
                              <th className="py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchaseHistoryDetailRows.map((row) => (
                              <tr key={`${row.purchase_date}-${row.item_en}-${row.item_code || ""}`} className="border-b border-border last:border-b-0">
                                <td className="py-2 pr-2">{row.item_en}</td>
                                <td className="py-2 pr-2 font-hindi">{row.item_hi || "-"}</td>
                                <td className="py-2 pr-2 text-right">{row.final_qty}</td>
                                <td className="py-2 pr-2 text-right">{row.purchased_qty}</td>
                                <td className="py-2 pr-2 text-right">INR {row.unit_price}</td>
                                <td className="py-2 text-right font-semibold">INR {row.line_total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {purchaseStep !== "history" && (
              <div className="mt-4 rounded-md border border-border p-3 bg-background">
                <p className="text-xs text-muted-foreground">
                  Tip: open Need List, tap an item, buy and save, then finalize at end of day.
                </p>
              </div>
            )}
          </section>
        )}

        {!isPurchaseMode && activeView === "restaurants" && (
          <section className="bg-card rounded-lg border border-border p-4 mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Page Links / QR
          </h2>
          <div className="mb-4 border border-border rounded-md p-3 bg-background">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Platform Links</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => copyLink(getAdminLoginLink(), "admin login link")}>
                Copy Admin Login
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => copyLink(getAdminPanelLink(), "admin panel link")}>
                Copy Admin Panel
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => copyLink(getPurchaseLink(), "purchase link")}>
                Copy Purchase Link
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => copyLink(getStockLink(), "stock link")}>
                Copy Stock Link
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPurchaseQr((prev) => !prev)}>
                {showPurchaseQr ? "Hide Purchase QR" : "Show Purchase QR"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={printPurchaseQr}>
                Print Purchase QR
              </Button>
            </div>
            {showPurchaseQr && (
              <div className="mt-3 border border-border rounded-md p-3 bg-card">
                <p className="text-sm font-semibold mb-1">Purchase QR Preview</p>
                <p className="text-xs text-muted-foreground mb-3 break-all">{getPurchaseLink()}</p>
                <img
                  src={getQrUrl(getPurchaseLink(), 300)}
                  alt="Purchase page QR code preview"
                  className="w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] border border-border rounded-md bg-card"
                  loading="lazy"
                />
              </div>
            )}
          </div>
          <form onSubmit={handleCreateRestaurant} className="grid sm:grid-cols-3 gap-2 mb-3">
            <input
              value={restaurantName}
              onChange={(e) => {
                const name = e.target.value;
                setRestaurantName(name);
                if (!restaurantSlug) {
                  setRestaurantSlug(toSlug(name));
                }
              }}
              placeholder="Restaurant name"
              className="h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              value={restaurantSlug}
              onChange={(e) => setRestaurantSlug(toSlug(e.target.value))}
              placeholder="slug (e.g. spicegarden)"
              className="h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={createRestaurant.isPending}
              className="h-10 rounded-md bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60 hover:opacity-90 transition-opacity"
            >
              {createRestaurant.isPending ? "Creating..." : "Create & Save"}
            </button>
          </form>
          {restaurantError && <p className="text-xs text-destructive mb-3">{restaurantError}</p>}
          {restaurantSuccess && <p className="text-xs text-accent-foreground mb-3">{restaurantSuccess}</p>}

          <div className="space-y-2">
            {restaurants.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between border border-border rounded-md p-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.name}{" "}
                    <span className={`text-xs font-semibold ${r.is_active === false ? "text-destructive" : "text-emerald-700"}`}>
                      ({r.is_active === false ? "Disabled" : "Active"})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">/order?r={r.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyRestaurantLink(r.slug)}
                    className="h-9 px-3 rounded-md border border-border text-sm hover:bg-accent transition-colors"
                  >
                    Copy Order Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrSlug((prev) => (prev === r.slug ? null : r.slug))}
                    className="h-9 px-3 rounded-md border border-border text-sm hover:bg-accent transition-colors"
                  >
                    {qrSlug === r.slug ? "Hide QR" : "Show QR"}
                  </button>
                  <button
                    type="button"
                    onClick={() => printRestaurantQr(r.name, r.slug)}
                    className="h-9 px-3 rounded-md border border-border text-sm hover:bg-accent transition-colors"
                  >
                    Print QR
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toggleRestaurantActive.mutate({
                        id: r.id,
                        isActive: r.is_active === false,
                      })
                    }
                    className="h-9 px-3 rounded-md border border-border text-sm hover:bg-accent transition-colors"
                  >
                    {r.is_active === false ? "Enable" : "Disable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ok = window.confirm(
                        `Delete link for ${r.name}? This works only if no orders exist.`,
                      );
                      if (!ok) return;
                      if (qrSlug === r.slug) setQrSlug(null);
                      deleteRestaurant.mutate({ id: r.id, slug: r.slug });
                    }}
                    className="h-9 px-3 rounded-md border border-destructive text-destructive text-sm hover:bg-destructive/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {restaurants.length === 0 && (
              <p className="text-sm text-muted-foreground">No restaurants found.</p>
            )}
          </div>

          {qrSlug && (
            <div className="mt-4 border border-border rounded-md p-4 bg-background">
              <p className="text-sm font-semibold mb-1">Order QR Preview</p>
              <p className="text-xs text-muted-foreground mb-3 break-all">{getRestaurantOrderLink(qrSlug)}</p>
              <img
                src={getRestaurantQrUrl(qrSlug, 300)}
                alt="Order QR code preview"
                className="w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] border border-border rounded-md bg-card"
                loading="lazy"
              />
            </div>
          )}

          </section>
        )}

        {activeView === "sales" && <SalesPanel />}

        {!isPurchaseMode && activeView === "stock" && (
          <section className="bg-card rounded-lg border border-border p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Stock Availability</h2>
              <p className="text-xs text-muted-foreground">Client page updates live</p>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {CATALOG.map((item) => {
                const inStock = availabilityMap.get(item.code) ?? availabilityMap.get(item.en) ?? true;
                return (
                  <div key={item.en} className="flex items-center justify-between rounded-md border border-border p-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.en}</p>
                      <p className="text-xs text-muted-foreground font-hindi truncate">{item.hi}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.code}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Qty in stock: {round2(stockQtyMap.get(item.code) ?? stockQtyMap.get(item.en) ?? 0)} kg
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={inStock ? "secondary" : "outline"}
                      size="sm"
                      onClick={() =>
                        toggleAvailability.mutate({
                          itemCode: item.code,
                          itemEn: item.en,
                          isInStock: !inStock,
                        })
                      }
                    >
                      {inStock ? "In Stock" : "Out of Stock"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!isPurchaseMode && activeView === "accounts" && (
          <section className="bg-card rounded-lg border border-border p-4 mb-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Accounts - Journal Ledger</h2>
              <p className="text-xs text-muted-foreground">Double-entry flow: Setup → Issue Cash → Post Purchase → Cash Return → Day Closing.</p>
              {accountsGoLiveDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Go-live date: {formatIsoDateDdMmYyyy(accountsGoLiveDate)}. Older dates are treated as pre-accounting.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={accountsFromDate}
                max={todayIso}
                onChange={(e) => setAccountsFromDate(e.target.value || accountsWindowStartIso)}
                className="h-9 w-[150px]"
              />
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={accountsToDate}
                max={todayIso}
                onChange={(e) => setAccountsToDate(e.target.value || todayIso)}
                className="h-9 w-[150px]"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAccountsFromDate(accountsWindowStartIso);
                  setAccountsToDate(todayIso);
                }}
              >
                Last 30 Days
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={printAccountsRangeSummary} disabled={accountRows.length === 0}>
                Print Range Summary
              </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
              {isAdminMode && (
                <Button type="button" size="sm" variant={accountsSubView === "setup" ? "default" : "outline"} onClick={() => setAccountsSubView("setup")}>
                  Setup
                </Button>
              )}
              <Button type="button" size="sm" variant={accountsSubView === "issue" ? "default" : "outline"} onClick={() => setAccountsSubView("issue")}>
                Cash Issue
              </Button>
              <Button type="button" size="sm" variant={accountsSubView === "purchase" ? "default" : "outline"} onClick={() => setAccountsSubView("purchase")}>
                Purchase Post
              </Button>
              <Button type="button" size="sm" variant={accountsSubView === "return" ? "default" : "outline"} onClick={() => setAccountsSubView("return")}>
                Cash Return
              </Button>
              {isAdminMode && (
                <Button type="button" size="sm" variant={accountsSubView === "closing" ? "default" : "outline"} onClick={() => setAccountsSubView("closing")}>
                  Day Closing
                </Button>
              )}
              <Button type="button" size="sm" variant={accountsSubView === "reports" ? "default" : "outline"} onClick={() => setAccountsSubView("reports")}>
                Reports
              </Button>
              <Button type="button" size="sm" variant={accountsSubView === "audit" ? "default" : "outline"} onClick={() => setAccountsSubView("audit")}>
                Audit
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Purchase Posted</p>
                <p className="text-sm font-semibold">INR {accountTotals.spend}</p>
              </div>
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Cash Issued</p>
                <p className="text-sm font-semibold">INR {accountTotals.cashIssued}</p>
              </div>
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Cash Returned</p>
                <p className="text-sm font-semibold">INR {accountTotals.cashReturned}</p>
              </div>
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Mismatch Days</p>
                <p className="text-sm font-semibold">{accountTotals.mismatchCount}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Opening Net</p>
                <p className="text-sm font-semibold">INR {accountTotals.openingNet}</p>
              </div>
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Closed Days</p>
                <p className="text-sm font-semibold">{accountTotals.closedCount}</p>
              </div>
            </div>
            {accountsError && <p className="text-xs text-destructive">{accountsError}</p>}
            {accountsSuccess && <p className="text-xs text-accent-foreground">{accountsSuccess}</p>}

            {isAdminMode && accountsSubView === "setup" && (
              <div className="rounded-md border border-border p-3 space-y-2">
                <p className="text-sm font-semibold">Purchase User to Ledger Mapping</p>
                {purchaseUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Create purchase/sales users first.</p>
                ) : (
                  <div className="space-y-1 max-h-[420px] overflow-auto pr-1">
                    {purchaseUsers.map((user) => {
                      const mappedLedgerId = purchaseUserLedgerByUserId.get(user.id)?.ledger_id || "";
                      const mappedLedger = accountLedgersById.get(mappedLedgerId);
                      return (
                        <div key={user.id} className="rounded-md border border-border p-2">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-sm font-medium">{user.name}</p>
                            <span className="text-[11px] text-muted-foreground">{user.username}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Current: {mappedLedger ? `${mappedLedger.code} (${mappedLedger.name})` : "Not mapped"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => createAndMapUserLedger.mutate({ userId: user.id })} disabled={createAndMapUserLedger.isPending}>
                              Auto Create Ledger
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSetupMappingUserId(user.id);
                                setSetupMappingLedgerId(mappedLedgerId || "");
                              }}
                            >
                              Select Manually
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 pt-2">
                  <select value={setupMappingUserId} onChange={(e) => setSetupMappingUserId(e.target.value)} className="h-10 rounded-md border border-border bg-background px-2 text-sm">
                    {purchaseUsers.map((user) => (
                      <option key={`map-user-${user.id}`} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                  <select value={setupMappingLedgerId} onChange={(e) => setSetupMappingLedgerId(e.target.value)} className="h-10 rounded-md border border-border bg-background px-2 text-sm">
                    {accountLedgers.map((ledger) => (
                      <option key={`map-ledger-${ledger.id}`} value={ledger.id}>{ledger.code} - {ledger.name}</option>
                    ))}
                  </select>
                  <Button type="button" onClick={() => upsertPurchaseUserLedgerMap.mutate({ userId: setupMappingUserId, ledgerId: setupMappingLedgerId })} disabled={upsertPurchaseUserLedgerMap.isPending || !setupMappingUserId || !setupMappingLedgerId}>
                    Save Mapping
                  </Button>
                </div>
                <div className="rounded-md border border-border p-2 mt-2 space-y-2">
                  <p className="text-xs font-semibold">Opening Balances</p>
                  <p className="text-xs text-muted-foreground">Use only one side (Dr or Cr). Date is selected day.</p>
                  <div className="grid sm:grid-cols-4 gap-2">
                    <select value={openingLedgerId} onChange={(e) => setOpeningLedgerId(e.target.value)} className="h-10 rounded-md border border-border bg-background px-2 text-sm">
                      {accountLedgers.map((ledger) => (
                        <option key={`opening-ledger-${ledger.id}`} value={ledger.id}>{ledger.code}</option>
                      ))}
                    </select>
                    <Input type="number" step={0.01} min={0} value={openingDr} onChange={(e) => setOpeningDr(e.target.value)} placeholder="Opening Dr" />
                    <Input type="number" step={0.01} min={0} value={openingCr} onChange={(e) => setOpeningCr(e.target.value)} placeholder="Opening Cr" />
                    <Button type="button" onClick={() => createOpeningBalance.mutate()} disabled={createOpeningBalance.isPending || !selectedAccountsDate}>
                      {createOpeningBalance.isPending ? "Saving..." : "Save Opening"}
                    </Button>
                  </div>
                  <Input value={openingNote} onChange={(e) => setOpeningNote(e.target.value)} placeholder="Note (optional)" />
                </div>
              </div>
            )}

            {(accountsSubView === "issue" || accountsSubView === "purchase" || accountsSubView === "return" || accountsSubView === "closing" || accountsSubView === "reports" || accountsSubView === "audit") && (
              <div className="grid lg:grid-cols-[1.2fr_1fr] gap-3">
                <div className="rounded-md border border-border p-3 space-y-2">
                  <p className="text-sm font-semibold">Daily Rows</p>
                  {accountRows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No rows found.</p>
                  ) : (
                    <div className="space-y-1 max-h-[420px] overflow-auto pr-1">
                      {accountRows.map((row) => (
                        <button key={row.date} type="button" onClick={() => setSelectedAccountsDate(row.date)} className={`w-full text-left rounded-md border px-3 py-2 ${selectedAccountsDate === row.date ? "border-primary bg-accent/40" : "border-border"}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{formatIsoDateDdMmYyyy(row.date)}</p>
                            <span className="text-[11px] text-muted-foreground">{row.dayState} · {row.vouchers.length} vouchers</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Expected INR {row.expectedSpend} · Posted INR {row.spend} · OpenNet INR {row.openingNet} · Diff INR {row.difference}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-border p-3 space-y-3">
                  <p className="text-sm font-semibold">
                    {accountsSubView === "issue" && "Post Cash Issue"}
                    {accountsSubView === "purchase" && "Post Purchase"}
                    {accountsSubView === "return" && "Post Cash Return"}
                    {isAdminMode && accountsSubView === "closing" && "Day Closing"}
                    {accountsSubView === "reports" && "Reports"}
                    {accountsSubView === "audit" && "Audit Journal"}
                  </p>
                  {selectedAccountsDate ? (
                    <>
                      <p className="text-xs text-muted-foreground">Date: <span className="font-semibold text-foreground">{formatIsoDateDdMmYyyy(selectedAccountsDate)}</span></p>
                      {accountsSubView === "issue" && (
                        <div className="space-y-2">
                          {isAdminMode ? (
                            <select value={cashTxnUserId} onChange={(e) => setCashTxnUserId(e.target.value)} className="h-10 rounded-md border border-border bg-background px-2 text-sm">
                              {purchaseUsers.map((user) => (
                                <option key={`issue-user-${user.id}`} value={user.id}>{user.name}</option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-xs text-muted-foreground">User: <span className="font-semibold text-foreground">{purchaseSessionUser?.name || "-"}</span></p>
                          )}
                          <Input type="number" step={0.01} min={0} value={cashTxnAmount} onChange={(e) => setCashTxnAmount(e.target.value)} placeholder="Issue amount" disabled={selectedAccountRow?.isClosed} />
                          <Input value={cashTxnNote} onChange={(e) => setCashTxnNote(e.target.value)} placeholder="Note (optional)" disabled={selectedAccountRow?.isClosed} />
                          <Button type="button" onClick={() => createCashTransaction.mutate()} disabled={createCashTransaction.isPending || selectedAccountRow?.isClosed}>
                            {createCashTransaction.isPending ? "Posting..." : "Post Cash Issue"}
                          </Button>
                        </div>
                      )}
                      {accountsSubView === "purchase" && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Finalized purchase expected: INR {selectedAccountRow?.expectedSpend || 0}</p>
                          <p className="text-xs text-muted-foreground">Already posted: INR {selectedAccountRow?.spend || 0}</p>
                          {isAdminMode ? (
                            <select value={purchasePostingUserId} onChange={(e) => setPurchasePostingUserId(e.target.value)} className="h-10 rounded-md border border-border bg-background px-2 text-sm">
                              {purchaseUsers.map((user) => (
                                <option key={`purchase-user-${user.id}`} value={user.id}>{user.name}</option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-xs text-muted-foreground">User: <span className="font-semibold text-foreground">{purchaseSessionUser?.name || "-"}</span></p>
                          )}
                          <Button type="button" onClick={() => postPurchaseSpend.mutate()} disabled={postPurchaseSpend.isPending || selectedAccountRow?.isClosed || (selectedAccountRow?.expectedSpend || 0) <= 0 || (selectedAccountRow?.spend || 0) > 0}>
                            {postPurchaseSpend.isPending ? "Posting..." : "Post Purchase Voucher"}
                          </Button>
                        </div>
                      )}
                      {accountsSubView === "return" && (
                        <div className="space-y-2">
                          {isAdminMode ? (
                            <select value={cashTxnUserId} onChange={(e) => setCashTxnUserId(e.target.value)} className="h-10 rounded-md border border-border bg-background px-2 text-sm">
                              {purchaseUsers.map((user) => (
                                <option key={`return-user-${user.id}`} value={user.id}>{user.name}</option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-xs text-muted-foreground">User: <span className="font-semibold text-foreground">{purchaseSessionUser?.name || "-"}</span></p>
                          )}
                          <Input type="number" step={0.01} min={0} value={cashTxnAmount} onChange={(e) => setCashTxnAmount(e.target.value)} placeholder="Return amount" disabled={selectedAccountRow?.isClosed} />
                          <Input value={cashTxnNote} onChange={(e) => setCashTxnNote(e.target.value)} placeholder="Note (optional)" disabled={selectedAccountRow?.isClosed} />
                          <Button type="button" onClick={() => postCashReturn.mutate()} disabled={postCashReturn.isPending || selectedAccountRow?.isClosed}>
                            {postCashReturn.isPending ? "Posting..." : "Post Cash Return"}
                          </Button>
                        </div>
                      )}
                      {isAdminMode && accountsSubView === "closing" && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Posted spend INR {selectedAccountSpend} · Issued INR {selectedCashIssued} · Returned INR {selectedCashReturned}</p>
                          {selectedAccountRow?.purchaseNotPosted && <p className="text-xs text-destructive">Purchase is finalized but not posted. Post purchase voucher before close.</p>}
                          <p className="text-xs text-muted-foreground">
                            Difference: <span className={`font-semibold ${selectedCashDifference === 0 ? "text-emerald-700" : "text-destructive"}`}>INR {selectedCashDifference}</span>
                          </p>
                          <Input value={accountsCloseNote} onChange={(e) => setAccountsCloseNote(e.target.value)} placeholder="Close note (required if mismatch)" />
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={() => closeAccountsDay.mutate()} disabled={closeAccountsDay.isPending || selectedAccountRow?.isClosed || selectedAccountRow?.purchaseNotPosted || (selectedCashDifference !== 0 && !accountsCloseNote.trim())}>
                              {closeAccountsDay.isPending ? "Closing..." : "Close Day"}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => reopenAccountsDay.mutate()} disabled={reopenAccountsDay.isPending || !selectedAccountRow?.isClosed}>
                              {reopenAccountsDay.isPending ? "Reopening..." : "Reopen Day"}
                            </Button>
                          </div>
                        </div>
                      )}
                      {accountsSubView === "reports" && (
                        <div className="space-y-2">
                          <Button type="button" variant="outline" onClick={printAccountsRangeSummary} disabled={accountRows.length === 0}>Print Range Summary</Button>
                          <Button type="button" variant="outline" onClick={printAccountsSelectedDay} disabled={!selectedAccountRow}>Print Selected Day</Button>
                          <p className="text-xs text-muted-foreground">Mismatch and unposted days are highlighted in day list.</p>
                        </div>
                      )}
                      {accountsSubView === "audit" && (
                        <div className="space-y-1 max-h-[330px] overflow-auto pr-1">
                          {(selectedAccountRow?.vouchers || []).map((voucher) => (
                            <div key={`voucher-${voucher.id}`} className="border border-border rounded px-2 py-1.5">
                              <p className="text-xs font-semibold">{voucher.voucher_no} · {voucher.voucher_type} · INR {voucher.voucher_amount}</p>
                              <p className="text-[11px] text-muted-foreground">{voucher.narration || "-"} · {formatIndiaTime(voucher.posted_at)}</p>
                              {(journalLinesByVoucherId.get(voucher.id) || []).map((line) => {
                                const ledger = accountLedgersById.get(line.ledger_id);
                                return (
                                  <p key={`line-${line.id}`} className="text-[11px] text-muted-foreground">
                                    {ledger?.code || line.ledger_id} · Dr {line.dr_amount} · Cr {line.cr_amount}
                                  </p>
                                );
                              })}
                            </div>
                          ))}
                          {(selectedAccountRow?.vouchers || []).length === 0 && <p className="text-xs text-muted-foreground">No vouchers for selected date.</p>}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Select a date row first.</p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {!isPurchaseMode && activeView === "users" && (
          <section className="bg-card rounded-lg border border-border p-4 mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">User Management</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Create users and assign role (`admin`, `purchase`, `sales`).
            </p>
            <form
              className="grid sm:grid-cols-5 gap-2 mb-4"
              onSubmit={(e) => {
                e.preventDefault();
                const cleanName = newUserName.trim();
                const cleanUsername = normalizeUsername(newUsername);
                if (!cleanName || !cleanUsername || !newUserPassword.trim()) {
                  setRestaurantError("Name, username and password are required.");
                  setRestaurantSuccess("");
                  return;
                }
                createAppUser.mutate({
                  name: cleanName,
                  username: cleanUsername,
                  password: newUserPassword,
                  role: newUserRole,
                });
              }}
            >
              <Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Name" />
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username (case-insensitive)" />
              <Input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Password" />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as "admin" | "purchase" | "sales")}
                className="h-10 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="purchase">purchase</option>
                <option value="sales">sales</option>
                <option value="admin">admin</option>
              </select>
              <Button type="submit" disabled={createAppUser.isPending}>
                {createAppUser.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>

            <div className="space-y-2">
              {appUsers.map((user) => (
                <div key={user.id} className="border border-border rounded-md p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.username} · {user.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateAppUserRole.mutate({
                          id: user.id,
                          role: e.target.value as "admin" | "purchase" | "sales",
                        })
                      }
                      className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="admin">admin</option>
                      <option value="purchase">purchase</option>
                      <option value="sales">sales</option>
                    </select>
                    <Button
                      type="button"
                      variant={user.is_active ? "secondary" : "outline"}
                      size="sm"
                      onClick={() =>
                        toggleAppUserStatus.mutate({
                          id: user.id,
                          isActive: !user.is_active,
                        })
                      }
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </Button>
                  </div>
                </div>
              ))}
              {appUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">No users found.</p>
              )}
            </div>
          </section>
        )}

        {!isPurchaseMode && activeView === "delivery" && (
          <section className="space-y-4">
            <div className="md:hidden sticky top-0 z-20 rounded-md border border-border bg-card p-2">
              <div className="grid grid-cols-4 gap-1 text-center">
                <button type="button" onClick={() => setDeliveryFilter("ready")} className="rounded-md bg-background px-1 py-1">
                  <p className="text-[10px] text-muted-foreground">Ready</p>
                  <p className="text-sm font-semibold">{deliveryCounts.confirmed}</p>
                </button>
                <button type="button" onClick={() => setDeliveryFilter("out")} className="rounded-md bg-background px-1 py-1">
                  <p className="text-[10px] text-muted-foreground">Out</p>
                  <p className="text-sm font-semibold">{deliveryCounts.outForDelivery}</p>
                </button>
                <button type="button" onClick={() => setDeliveryFilter("delivered")} className="rounded-md bg-background px-1 py-1">
                  <p className="text-[10px] text-muted-foreground">Delivered</p>
                  <p className="text-sm font-semibold">{deliveryCounts.delivered}</p>
                </button>
                <button type="button" onClick={() => setDeliveryFilter("failed")} className="rounded-md bg-background px-1 py-1">
                  <p className="text-[10px] text-muted-foreground">Failed</p>
                  <p className="text-sm font-semibold">{deliveryCounts.failed}</p>
                </button>
              </div>
            </div>

            <div className="hidden md:grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-xs text-muted-foreground">Ready</p>
                <p className="text-base font-semibold">{deliveryCounts.confirmed}</p>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-xs text-muted-foreground">Out</p>
                <p className="text-base font-semibold">{deliveryCounts.outForDelivery}</p>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="text-base font-semibold">{deliveryCounts.delivered}</p>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-base font-semibold">{deliveryCounts.failed}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant={deliveryFilter === "active" ? "default" : "outline"} onClick={() => setDeliveryFilter("active")}>Active</Button>
                  <Button type="button" size="sm" variant={deliveryFilter === "ready" ? "default" : "outline"} onClick={() => setDeliveryFilter("ready")}>Ready</Button>
                  <Button type="button" size="sm" variant={deliveryFilter === "out" ? "default" : "outline"} onClick={() => setDeliveryFilter("out")}>Out</Button>
                  <Button type="button" size="sm" variant={deliveryFilter === "delivered" ? "default" : "outline"} onClick={() => setDeliveryFilter("delivered")}>Delivered</Button>
                  <Button type="button" size="sm" variant={deliveryFilter === "failed" ? "default" : "outline"} onClick={() => setDeliveryFilter("failed")}>Failed</Button>
                  <Button type="button" size="sm" variant={deliveryFilter === "all" ? "default" : "outline"} onClick={() => setDeliveryFilter("all")}>All</Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={deliverySearch}
                    onChange={(e) => setDeliverySearch(e.target.value)}
                    placeholder="Search restaurant/ref/phone"
                    className="h-9 w-[220px] max-w-full"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={printDispatchSlip}
                    disabled={deliveryDispatchOrders.length === 0}
                  >
                    Print Dispatch Slip
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Showing {deliveryFilteredOrders.length} orders.
              </p>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-6">Loading delivery orders...</p>
              ) : deliveryFilteredOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No delivery orders match filters.</p>
              ) : (
                <div className="space-y-2">
                  {deliveryFilteredOrders.map((order) => (
                    <DeliveryOrderCardCompact
                      key={order.id}
                      order={order}
                      expanded={Boolean(deliveryExpanded[order.id])}
                      onToggleExpand={() =>
                        setDeliveryExpanded((prev) => ({ ...prev, [order.id]: !prev[order.id] }))
                      }
                      onDispatch={() =>
                        updateStatus.mutate({ id: order.id, status: ORDER_STATUS.outForDelivery })
                      }
                      onDelivered={() =>
                        updateStatus.mutate({ id: order.id, status: ORDER_STATUS.delivered })
                      }
                      onFailed={() =>
                        updateStatus.mutate({ id: order.id, status: ORDER_STATUS.failed })
                      }
                      onRetryDispatch={() =>
                        updateStatus.mutate({ id: order.id, status: ORDER_STATUS.outForDelivery })
                      }
                      onPrint={() => printOrder(order)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {!isPurchaseMode && activeView === "orders" && (
          <div className="mb-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-muted-foreground">Restaurant Filter</label>
              <select
                value={restaurantFilter}
                onChange={(e) => setRestaurantFilter(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="">All</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
              {restaurantFilter && (
                <Button type="button" variant="outline" size="sm" onClick={() => setRestaurantFilter("")}>
                  Clear
                </Button>
              )}
              <label className="text-xs text-muted-foreground ml-1">From</label>
              <Input type="date" value={ordersFromDate} max={todayIso} onChange={(e) => setOrdersFromDate(e.target.value || ordersWindowStartIso)} className="h-9 w-[150px]" />
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={ordersToDate} max={todayIso} onChange={(e) => setOrdersToDate(e.target.value || todayIso)} className="h-9 w-[150px]" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setOrdersFromDate(ordersWindowStartIso);
                  setOrdersToDate(todayIso);
                }}
              >
                Last 30 Days
              </Button>
            </div>
            {!isLoading && filteredOrders.length > 0 && (
              <button
                onClick={printCurrentList}
                className="h-10 px-4 rounded-md border border-border bg-card text-sm font-medium hover:bg-accent transition-colors"
              >
                Print Current List
              </button>
            )}
          </div>
        )}

        {!isPurchaseMode && activeView === "orders" && (isLoading ? (
          <p className="text-center text-muted-foreground py-12">Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No orders here.</p>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onConfirm={() => updateStatus.mutate({ id: order.id, status: ORDER_STATUS.confirmed })}
                onReject={() => updateStatus.mutate({ id: order.id, status: ORDER_STATUS.rejected })}
                onPrint={() => printOrder(order)}
              />
            ))}
          </div>
        ))}
        </div>
        </div>
      </main>
    </div>
  );
};

const DeliveryOrderCardCompact = ({
  order,
  expanded,
  onToggleExpand,
  onDispatch,
  onDelivered,
  onFailed,
  onRetryDispatch,
  onPrint,
}: {
  order: Order;
  expanded: boolean;
  onToggleExpand: () => void;
  onDispatch: () => void;
  onDelivered: () => void;
  onFailed: () => void;
  onRetryDispatch: () => void;
  onPrint: () => void;
}) => {
  const items = (order.items || []) as OrderItem[];
  const itemCount = items.length;
  const totalQty = round2(items.reduce((sum, item) => sum + toSafeNumber(item.qty, 0), 0));

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{order.restaurant_name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {order.order_ref} · {formatIndiaTime(order.created_at)} · {itemCount} items · {totalQty} kg
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Ord: {formatIsoDateDdMmYyyy(order.order_date)}</span>
        <span>Del: {formatIsoDateDdMmYyyy(order.delivery_date)}</span>
        <a href={`tel:${order.contact_phone}`} className="text-primary font-medium">
          {order.contact_phone}
        </a>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === ORDER_STATUS.confirmed && (
          <Button type="button" size="sm" onClick={onDispatch}>Dispatch</Button>
        )}
        {order.status === ORDER_STATUS.outForDelivery && (
          <>
            <Button type="button" size="sm" onClick={onDelivered}>Delivered</Button>
            <Button type="button" size="sm" variant="outline" onClick={onFailed}>Failed</Button>
          </>
        )}
        {order.status === ORDER_STATUS.failed && (
          <Button type="button" size="sm" variant="outline" onClick={onRetryDispatch}>Retry</Button>
        )}
        <Button type="button" size="sm" variant="outline" onClick={onPrint}>Print</Button>
        <Button type="button" size="sm" variant="outline" onClick={onToggleExpand}>
          {expanded ? "Hide Details" : "View Details"}
        </Button>
      </div>
      {expanded && (
        <div className="mt-3 border-t border-border pt-3 space-y-2">
          <div className="space-y-1">
            {items.map((item, i) => (
              <div key={`${order.id}-item-${i}`} className="flex items-center justify-between text-sm">
                <span className="truncate">{item.en}</span>
                <span className="font-semibold">{item.qty} kg</span>
              </div>
            ))}
          </div>
          {order.notes && (
            <p className="text-xs text-warning-foreground bg-warning/50 rounded-md p-2">{order.notes}</p>
          )}
        </div>
      )}
    </div>
  );
};

const OrderCard = ({
  order,
  onConfirm,
  onReject,
  onDispatch,
  onDelivered,
  onFailed,
  onRetryDispatch,
  onPrint,
}: {
  order: Order;
  onConfirm?: () => void;
  onReject?: () => void;
  onDispatch?: () => void;
  onDelivered?: () => void;
  onFailed?: () => void;
  onRetryDispatch?: () => void;
  onPrint: () => void;
}) => {
  const items = (order.items || []) as OrderItem[];

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div>
          <h3 className="text-base font-bold text-foreground">🏪 {order.restaurant_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ref: {order.order_ref} · Placed {formatIndiaTime(order.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrint}
            className="h-8 px-2.5 rounded-md border border-border text-xs font-medium hover:bg-accent transition-colors"
          >
            Print
          </button>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs bg-background rounded-md border border-border p-2.5">
        <div>
          <span className="text-muted-foreground">Order: </span>
          <span className="font-medium">{formatIsoDateDdMmYyyy(order.order_date)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Delivery: </span>
          <span className="font-semibold text-accent-foreground">{formatIsoDateDdMmYyyy(order.delivery_date)}</span>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-accent rounded-md px-3 py-2 mb-3 flex items-center justify-between">
        <span className="text-sm text-foreground font-medium">{order.contact_name}</span>
        <a
          href={`tel:${order.contact_phone}`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          📞 {order.contact_phone}
        </a>
      </div>

      {/* Items */}
      <div className="mb-3">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">
          Items ({items.length})
        </p>
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs">{CATEGORY_BADGES[item.category] || "📦"}</span>
                <span className="font-medium text-foreground">{item.en}</span>
                <span className="text-xs text-muted-foreground font-hindi">{item.hi}</span>
              </div>
              <span className="font-semibold text-foreground shrink-0">{item.qty} kg</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-warning/50 rounded-md px-3 py-2 mb-3">
          <p className="text-xs text-warning-foreground">📝 {order.notes}</p>
        </div>
      )}

      {/* Actions */}
      {order.status === ORDER_STATUS.pending && onConfirm && onReject && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            ✅ Confirm Order
          </button>
          <button
            onClick={onReject}
            className="flex-1 h-10 rounded-md bg-card text-destructive font-semibold text-sm border border-destructive hover:bg-destructive/10 transition-colors"
          >
            ❌ Reject Order
          </button>
        </div>
      )}

      {order.status === ORDER_STATUS.confirmed && onDispatch && (
        <div className="mt-3 pt-3 border-t border-border">
          <button
            onClick={onDispatch}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            🚚 Out for Delivery
          </button>
        </div>
      )}

      {order.status === ORDER_STATUS.outForDelivery && onDelivered && onFailed && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          <button
            onClick={onDelivered}
            className="flex-1 h-10 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            ✅ Delivered
          </button>
          <button
            onClick={onFailed}
            className="flex-1 h-10 rounded-md bg-card text-destructive font-semibold text-sm border border-destructive hover:bg-destructive/10 transition-colors"
          >
            ⚠️ Failed
          </button>
        </div>
      )}

      {order.status === ORDER_STATUS.failed && onRetryDispatch && (
        <div className="mt-3 pt-3 border-t border-border">
          <button
            onClick={onRetryDispatch}
            className="w-full h-10 rounded-md border border-border bg-card font-semibold text-sm hover:bg-accent transition-colors"
          >
            ↻ Retry Dispatch
          </button>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: "bg-warning text-warning-foreground",
    confirmed: "bg-accent text-accent-foreground",
    out_for_delivery: "bg-primary/10 text-primary",
    delivered: "bg-green-100 text-green-800",
    failed: "bg-orange-100 text-orange-800",
    rejected: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${styles[status] || ""}`}>
      {status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")}
    </span>
  );
};

export default AdminPanel;
