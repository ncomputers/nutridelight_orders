import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { APP_CONFIG, ORDER_STATUS, type OrderStatus } from "@/config/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TopTabs from "@/components/TopTabs";
import Sidebar from "@/components/Sidebar";
import { CATALOG } from "@/data/items";
import ItemIcon from "@/components/ItemIcon";
import ItemIconUploader from "@/components/ItemIconUploader";
import { hydrateCustomItemIcons } from "@/data/itemIcons";
import {
  formatIndiaDate,
  formatIndiaTime,
  formatIsoDateDdMmYyyy,
  getIndiaDateDaysAgoIso,
  getIndiaDateIso,
} from "@/lib/datetime";
import {
  buildPrintableDoc,
  buildPrintableOrderSection,
  copyTextToClipboard,
  escapeHtml,
  getCurrentPageLink,
  getAdminLoginLink,
  getPurchaseLink,
  getQrUrl,
  getRestaurantOrderLink,
  getRestaurantPortalLoginLink,
  getRestaurantQrUrl,
  round2,
  toSafeNumber,
} from "@/features/admin/utils";
import {
  type AdminView,
  type AppUserRow,
  type DeliveryFilter,
  type ItemAvailability,
  type LocalStorePolicyRow,
  type Order,
  type OrderItem,
  type PurchaseDemandRow,
  type PurchaseDayLockRow,
  type PurchaseEdit,
  type PurchasePlanDbRow,
  type PurchasePlanRow,
  type PurchaseStockHistoryRow,
  type Restaurant,
  type SourceOrderRef,
  type StockQtyRow,
  type SupportIssueRow,
  type WarehouseTransactionRow,
} from "@/features/admin/types";
import { adminRepository } from "@/features/admin/repositories/adminRepository";
import { adminQueryKeys } from "@/features/admin/queryKeys";
import {
  computePurchaseTotals,
  computeStockDeltaFromVariance,
  mergePurchaseRows,
} from "@/features/purchase/domain/purchaseDomain";
import PurchasePlanPage from "@/features/purchase/pages/PurchasePlanPage";
import PurchaseBuyPage from "@/features/purchase/pages/PurchaseBuyPage";
import PurchaseFinalizedPage from "@/features/purchase/pages/PurchaseFinalizedPage";
import PurchaseStockPage from "@/features/purchase/pages/PurchaseStockPage";
import LocalStorePanel from "@/features/admin/components/LocalStorePanel";
import SalesPanel from "./SalesPanel";
import type { SalesTabKey } from "./SalesPanel";
import ModuleLayout from "@/layouts/ModuleLayout";
import { getCurrentModule } from "@/lib/navigation";
import { navigation } from "@/config/navigation";

const AdminPanel = ({ mode = "admin" }: { mode?: "admin" | "purchase" }) => {
  const isPurchaseMode = mode === "purchase";
  const isAdminMode = mode === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
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
  const isSalesSession = isPurchaseMode && purchaseSessionUser?.role === "sales";
  const initialView = searchParams.get("view");
  const initialTab = searchParams.get("ordersTab") || searchParams.get("tab");
  const initialSalesTab = searchParams.get("salesTab");
  const initialPurchaseTab = searchParams.get("purchaseTab");
  const initialWarehouseTab = searchParams.get("warehouseTab");
  const initialWarehouseFromDate = searchParams.get("warehouseFromDate");
  const initialWarehouseToDate = searchParams.get("warehouseToDate");
  const initialRestaurantFilter = searchParams.get("restaurant") || "";
  const [activeTab, setActiveTab] = useState<OrderStatus>(
    initialTab === ORDER_STATUS.pending ||
      initialTab === ORDER_STATUS.confirmed ||
      initialTab === ORDER_STATUS.purchaseDone ||
      initialTab === ORDER_STATUS.invoiced ||
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
          initialView === "purchase" ||
          initialView === "warehouse" ||
          initialView === "restaurants" ||
          initialView === "stock" ||
          initialView === "users"
        ? (initialView === "stock" ? "warehouse" : (initialView as AdminView))
        : "orders",
  );
  const [activeSalesTab, setActiveSalesTab] = useState<SalesTabKey>(
    initialSalesTab === "create" || initialSalesTab === "payments" || initialSalesTab === "invoices"
      ? initialSalesTab
      : "invoices",
  );
  const normalizedInitialPurchaseTab =
    initialPurchaseTab === "stock_impact" ? "stock" : initialPurchaseTab;
  const [activePurchaseTab, setActivePurchaseTab] = useState<"plan" | "buy" | "finalized" | "stock">(
    normalizedInitialPurchaseTab === "finalized" ||
      normalizedInitialPurchaseTab === "stock" ||
      normalizedInitialPurchaseTab === "buy" ||
      normalizedInitialPurchaseTab === "plan"
      ? normalizedInitialPurchaseTab
      : "plan",
  );
  const [activeWarehouseTab, setActiveWarehouseTab] = useState<"overview" | "policy" | "movements">(
    initialWarehouseTab === "policy" || initialWarehouseTab === "movements" || initialWarehouseTab === "overview"
      ? initialWarehouseTab
      : "overview",
  );
  const [restaurantFilter, setRestaurantFilter] = useState(initialRestaurantFilter);
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantSlug, setNewRestaurantSlug] = useState("");
  const [showPurchaseQr, setShowPurchaseQr] = useState(false);
  const [previewRestaurantSlug, setPreviewRestaurantSlug] = useState<string | null>(null);
  const [activeStockIconItemCode, setActiveStockIconItemCode] = useState<string | null>(null);
  const [restaurantError, setRestaurantError] = useState("");
  const [restaurantSuccess, setRestaurantSuccess] = useState("");
  const [purchaseEdits, setPurchaseEdits] = useState<Record<string, PurchaseEdit>>({});
  const [currentPurchaseKey, setCurrentPurchaseKey] = useState<string | null>(null);
  const [buyQtyInput, setBuyQtyInput] = useState("0");
  const [historyDate, setHistoryDate] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "purchase" | "sales">("purchase");
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const [pendingUserToggleId, setPendingUserToggleId] = useState<string | null>(null);
  const [warehouseItemSearch, setWarehouseItemSearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("active");
  const [deliverySearch, setDeliverySearch] = useState("");
  const [deliveryExpanded, setDeliveryExpanded] = useState<Record<string, boolean>>({});
  const [portalPinByRestaurantId, setPortalPinByRestaurantId] = useState<Record<string, string>>({});
  const [supportResolutionByIssueId, setSupportResolutionByIssueId] = useState<Record<string, string>>({});
  const [warehousePage, setWarehousePage] = useState(1);
  const [supportIssuesPage, setSupportIssuesPage] = useState(1);
  const WAREHOUSE_PAGE_SIZE = 200;
  const SUPPORT_ISSUES_PAGE_SIZE = 50;
  const todayIso = getIndiaDateIso();
  const purchaseDate = todayIso;
  const ordersWindowStartIso = getIndiaDateDaysAgoIso(30);
  const warehouseWindowStartIso = getIndiaDateDaysAgoIso(30);
  const purchaseHistoryWindowStartIso = getIndiaDateDaysAgoIso(45);
  const [ordersFromDate, setOrdersFromDate] = useState(ordersWindowStartIso);
  const [ordersToDate, setOrdersToDate] = useState(todayIso);
  const [purchaseHistoryFromDate, setPurchaseHistoryFromDate] = useState(purchaseHistoryWindowStartIso);
  const [purchaseHistoryToDate, setPurchaseHistoryToDate] = useState(todayIso);
  const [warehouseFromDate, setWarehouseFromDate] = useState(
    initialWarehouseFromDate && /^\d{4}-\d{2}-\d{2}$/.test(initialWarehouseFromDate)
      ? initialWarehouseFromDate
      : warehouseWindowStartIso,
  );
  const [warehouseToDate, setWarehouseToDate] = useState(
    initialWarehouseToDate && /^\d{4}-\d{2}-\d{2}$/.test(initialWarehouseToDate)
      ? initialWarehouseToDate
      : todayIso,
  );
  const safeOrdersFromDate = ordersFromDate <= ordersToDate ? ordersFromDate : ordersToDate;
  const safeOrdersToDate = ordersFromDate <= ordersToDate ? ordersToDate : ordersFromDate;
  const safePurchaseHistoryFromDate =
    purchaseHistoryFromDate <= purchaseHistoryToDate ? purchaseHistoryFromDate : purchaseHistoryToDate;
  const safePurchaseHistoryToDate =
    purchaseHistoryFromDate <= purchaseHistoryToDate ? purchaseHistoryToDate : purchaseHistoryFromDate;
  const safeWarehouseFromDate = warehouseFromDate <= warehouseToDate ? warehouseFromDate : warehouseToDate;
  const safeWarehouseToDate = warehouseFromDate <= warehouseToDate ? warehouseToDate : warehouseFromDate;

  useEffect(() => {
    setPurchaseEdits({});
    setCurrentPurchaseKey(null);
  }, [purchaseDate]);

  useEffect(() => {
    if (isPurchaseMode) {
      if (sessionStorage.getItem(APP_CONFIG.purchase.sessionKey) !== APP_CONFIG.purchase.sessionValue) {
        navigate("/purchase/login");
        return;
      }
      if (isSalesSession) {
        setActiveView("sales");
      } else {
        setActiveView("purchase");
      }
      return;
    }
    if (sessionStorage.getItem(APP_CONFIG.admin.sessionKey) !== APP_CONFIG.admin.sessionValue) {
      navigate("/admin/login");
    }
  }, [navigate, isPurchaseMode, isSalesSession]);

  useEffect(() => {
    if (isSalesSession && activeView !== "sales") {
      setActiveView("sales");
    }
  }, [isSalesSession, activeView]);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("view", activeView);

    if (activeView === "orders") {
      next.set("ordersTab", activeTab);
      if (restaurantFilter) {
        next.set("restaurant", restaurantFilter);
      }
    } else if (activeView === "sales") {
      next.set("salesTab", activeSalesTab);
    } else if (activeView === "purchase") {
      next.set("purchaseTab", activePurchaseTab);
    } else if (activeView === "warehouse") {
      next.set("warehouseTab", activeWarehouseTab);
      if (activeWarehouseTab === "movements") {
        next.set("warehouseFromDate", safeWarehouseFromDate);
        next.set("warehouseToDate", safeWarehouseToDate);
      }
    }

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    activeView,
    activeTab,
    activeSalesTab,
    activePurchaseTab,
    activeWarehouseTab,
    safeWarehouseFromDate,
    safeWarehouseToDate,
    restaurantFilter,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    setWarehousePage(1);
  }, [safeWarehouseFromDate, safeWarehouseToDate]);

  useEffect(() => {
    setSupportIssuesPage(1);
  }, [activeView]);

  const shouldLoadOrders =
    isPurchaseMode || activeView === "orders" || activeView === "delivery" || activeView === "purchase";

  const { data: orders = [], isLoading } = useQuery({
    queryKey: adminQueryKeys.orders(safeOrdersFromDate, safeOrdersToDate),
    queryFn: () => adminRepository.listOrders(safeOrdersFromDate, safeOrdersToDate),
    enabled: shouldLoadOrders,
    refetchInterval:
      shouldLoadOrders && !isPurchaseMode && (activeView === "orders" || activeView === "delivery")
        ? APP_CONFIG.admin.pollIntervalMs
        : false,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const { data: restaurants = [] } = useQuery({
    queryKey: adminQueryKeys.restaurants(),
    queryFn: () => adminRepository.listRestaurants(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const {
    data: appUsers = [],
    isLoading: isUsersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: adminQueryKeys.appUsers(),
    queryFn: () => adminRepository.listAppUsers(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: availabilityRows = [] } = useQuery({
    queryKey: adminQueryKeys.itemAvailability(),
    queryFn: () => adminRepository.listItemAvailability(),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const { data: purchasePlanRows = [], isLoading: isPurchaseLoading } = useQuery({
    queryKey: adminQueryKeys.purchasePlans(purchaseDate),
    queryFn: () => adminRepository.listPurchasePlans(purchaseDate),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const { data: purchaseDemandRows = [] } = useQuery({
    queryKey: adminQueryKeys.purchaseDemand(purchaseDate),
    queryFn: () => adminRepository.getPurchaseDemand(purchaseDate),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const { data: stockQtyRows = [] } = useQuery({
    queryKey: adminQueryKeys.stockQty(),
    queryFn: () => adminRepository.listStockQty(),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const { data: localStorePolicies = [] } = useQuery({
    queryKey: adminQueryKeys.localStorePolicies(),
    queryFn: () => adminRepository.listLocalStorePolicies(),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const { data: warehouseTransactionsPageData } = useQuery({
    queryKey: adminQueryKeys.warehouseTransactions(safeWarehouseFromDate, safeWarehouseToDate, warehousePage, WAREHOUSE_PAGE_SIZE),
    queryFn: () => adminRepository.listWarehouseTransactions(safeWarehouseFromDate, safeWarehouseToDate, warehousePage, WAREHOUSE_PAGE_SIZE),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    enabled: !isPurchaseMode && activeView === "warehouse" && activeWarehouseTab === "movements",
  });
  const warehouseTransactions = warehouseTransactionsPageData?.rows ?? [];
  const hasMoreWarehouseTransactions = warehouseTransactionsPageData?.hasMore ?? false;

  const { data: supportIssuesPageData } = useQuery({
    queryKey: adminQueryKeys.supportIssues(supportIssuesPage, SUPPORT_ISSUES_PAGE_SIZE),
    queryFn: () => adminRepository.listSupportIssues(supportIssuesPage, SUPPORT_ISSUES_PAGE_SIZE),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    enabled: !isPurchaseMode && activeView === "restaurants",
  });
  const supportIssues = supportIssuesPageData?.rows ?? [];
  const hasMoreSupportIssues = supportIssuesPageData?.hasMore ?? false;

  const { data: purchaseDayLockRows = [] } = useQuery({
    queryKey: adminQueryKeys.purchaseDayLock(purchaseDate),
    queryFn: () => adminRepository.getPurchaseDayLock(purchaseDate),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const { data: purchaseHistoryByDateRaw = [] } = useQuery({
    queryKey: adminQueryKeys.purchaseStockHistory(safePurchaseHistoryFromDate, safePurchaseHistoryToDate),
    queryFn: () => adminRepository.listPurchaseStockHistory(safePurchaseHistoryFromDate, safePurchaseHistoryToDate),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const { data: purchaseHistoryDetailRows = [] } = useQuery({
    queryKey: adminQueryKeys.purchaseStockDetails(historyDate || ""),
    queryFn: () => adminRepository.listPurchaseStockDetails(historyDate || todayIso),
    enabled: Boolean(historyDate),
    staleTime: 20_000,
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

  useEffect(() => {
    hydrateCustomItemIcons(availabilityRows);
  }, [availabilityRows]);

  const stockQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    stockQtyRows.forEach((row) => {
      map.set(row.item_code, toSafeNumber(row.available_qty, 0));
      map.set(row.item_en, toSafeNumber(row.available_qty, 0));
    });
    return map;
  }, [stockQtyRows]);

  const localStorePolicyByCode = useMemo(() => {
    const map = new Map<string, LocalStorePolicyRow>();
    localStorePolicies.forEach((row) => map.set(row.item_code, row));
    return map;
  }, [localStorePolicies]);

  const warehouseCatalogRows = useMemo(() => {
    const query = warehouseItemSearch.trim().toLowerCase();
    const rows = CATALOG.map((item) => {
      const availableQty = round2(stockQtyMap.get(item.code) ?? stockQtyMap.get(item.en) ?? 0);
      const policy = localStorePolicyByCode.get(item.code);
      const requiredStockQty = round2(Math.max(0, policy?.required_stock_qty ?? 0));
      const isLow = requiredStockQty > 0 && availableQty < requiredStockQty;
      return {
        ...item,
        availableQty,
        requiredStockQty,
        isLow,
      };
    });
    if (!query) return rows;
    return rows.filter((row) => row.en.toLowerCase().includes(query) || row.code.toLowerCase().includes(query));
  }, [localStorePolicyByCode, stockQtyMap, warehouseItemSearch]);

  const warehouseSummary = useMemo(() => {
    const totalItems = warehouseCatalogRows.length;
    const totalAvailableQty = round2(
      warehouseCatalogRows.reduce((sum, row) => sum + Math.max(0, toSafeNumber(row.availableQty, 0)), 0),
    );
    const lowStockCount = warehouseCatalogRows.filter((row) => row.isLow).length;
    return { totalItems, totalAvailableQty, lowStockCount };
  }, [warehouseCatalogRows]);

  const warehouseMovementSummary = useMemo(() => {
    const summary = {
      purchaseIn: 0,
      dispatchOut: 0,
      retailOut: 0,
      adjustment: 0,
      net: 0,
    };
    warehouseTransactions.forEach((row) => {
      const qty = round2(Math.abs(toSafeNumber(row.qty, 0)));
      if (row.txn_type === "purchase_in") summary.purchaseIn += qty;
      if (row.txn_type === "dispatch_out") summary.dispatchOut += qty;
      if (row.txn_type === "retail_out") summary.retailOut += qty;
      if (row.txn_type === "adjustment") summary.adjustment += qty;
      summary.net += toSafeNumber(row.signed_qty, 0);
    });
    return {
      purchaseIn: round2(summary.purchaseIn),
      dispatchOut: round2(summary.dispatchOut),
      retailOut: round2(summary.retailOut),
      adjustment: round2(summary.adjustment),
      net: round2(summary.net),
    };
  }, [warehouseTransactions]);

  const isPurchaseDayLocked = Boolean(purchaseDayLockRows[0]?.is_locked);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      await adminRepository.updateOrderStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.orders(safeOrdersFromDate, safeOrdersToDate) });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.purchaseDemand(purchaseDate) });
    },
  });

  const dispatchOrder = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const actor =
        isPurchaseMode
          ? purchaseSessionUser?.username || "purchase"
          : "admin";
      await adminRepository.postOrderDispatchOut(id, actor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.orders(safeOrdersFromDate, safeOrdersToDate) });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stockQty() });
      queryClient.invalidateQueries({ queryKey: ["admin", "warehouse-transactions"] });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not post dispatch stock out.");
    },
  });

  const createRestaurant = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      await adminRepository.createRestaurant(name, slug);
    },
    onSuccess: () => {
      setNewRestaurantName("");
      setNewRestaurantSlug("");
      setRestaurantError("");
      setRestaurantSuccess("Restaurant created.");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.restaurants() });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not create restaurant.");
    },
  });

  const toggleRestaurantActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await adminRepository.setRestaurantActive(id, isActive);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.restaurants() }),
  });

  const setRestaurantPortalPin = useMutation({
    mutationFn: async ({ restaurantId, username, pin }: { restaurantId: string; username: string; pin: string }) => {
      await adminRepository.setRestaurantPortalPin({
        restaurantId,
        username,
        pin,
        actor: isPurchaseMode ? purchaseSessionUser?.username || "admin" : "admin",
      });
    },
    onSuccess: (_data, variables) => {
      setPortalPinByRestaurantId((prev) => ({ ...prev, [variables.restaurantId]: "" }));
      setRestaurantError("");
      setRestaurantSuccess(`Portal PIN updated for ${variables.username}.`);
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not update portal PIN.");
    },
  });

  const updateSupportIssue = useMutation({
    mutationFn: async ({
      issueId,
      status,
      resolutionNote,
    }: {
      issueId: string;
      status: "open" | "in_review" | "resolved";
      resolutionNote?: string;
    }) => {
      await adminRepository.updateSupportIssue({
        issueId,
        status,
        resolutionNote,
        actor: isPurchaseMode ? purchaseSessionUser?.username || "admin" : "admin",
      });
    },
    onSuccess: (_data, variables) => {
      if (variables.status === "resolved") {
      setSupportResolutionByIssueId((prev) => ({ ...prev, [variables.issueId]: "" }));
      }
      setRestaurantError("");
      setRestaurantSuccess("Support issue updated.");
      queryClient.invalidateQueries({ queryKey: ["admin", "support-issues"] });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not update support issue.");
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
      const normalizedUsername = username.trim().toLowerCase();
      const usernameTaken = await adminRepository.isUsernameTaken(normalizedUsername);
      if (usernameTaken) {
        throw new Error("Username already exists.");
      }
      await adminRepository.createAppUser(name.trim(), normalizedUsername, password, role);
    },
    onMutate: () => {
      setUserError("");
      setUserSuccess("");
    },
    onSuccess: () => {
      setNewUserName("");
      setNewUsername("");
      setNewUserPassword("");
      setNewUserRole("purchase");
      setUserError("");
      setUserSuccess("User created.");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.appUsers() });
    },
    onError: (error: Error & { code?: string }) => {
      setUserSuccess("");
      if (error?.code === "23505") {
        setUserError("Username already exists.");
        return;
      }
      setUserError(error.message || "Could not create user.");
    },
  });

  const toggleAppUserStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await adminRepository.setAppUserActive(id, isActive);
    },
    onMutate: ({ id }) => {
      setPendingUserToggleId(id);
      setUserError("");
      setUserSuccess("");
    },
    onSuccess: (_, variables) => {
      setUserError("");
      setUserSuccess(variables.isActive ? "User enabled." : "User disabled.");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.appUsers() });
    },
    onError: (error: Error) => {
      setUserSuccess("");
      setUserError(error.message || "Could not update user status.");
    },
    onSettled: () => {
      setPendingUserToggleId(null);
    },
  });

  const toggleItemAvailability = useMutation({
    mutationFn: async ({ itemCode, itemEn, isInStock }: { itemCode: string; itemEn: string; isInStock: boolean }) => {
      await adminRepository.upsertItemAvailability(itemCode, itemEn, isInStock);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.itemAvailability() });
    },
  });

  const upsertStockItemIcon = useMutation({
    mutationFn: async ({
      itemCode,
      itemEn,
      iconUrl,
    }: {
      itemCode: string;
      itemEn: string;
      iconUrl: string | null;
    }) => {
      await adminRepository.upsertItemIcon(itemCode, itemEn, iconUrl);
    },
    onSuccess: (_, variables) => {
      setRestaurantError("");
      setRestaurantSuccess(
        variables.iconUrl
          ? `${variables.itemEn} icon updated.`
          : `${variables.itemEn} icon removed.`,
      );
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.itemAvailability() });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not update item icon.");
    },
  });

  const upsertLocalStorePolicy = useMutation({
    mutationFn: async (payload: {
      item_code: string;
      item_en: string;
      required_stock_qty: number;
    }) => {
      await adminRepository.upsertLocalStorePolicy(payload);
    },
    onSuccess: () => {
      setRestaurantError("");
      setRestaurantSuccess("Warehouse policy saved.");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.localStorePolicies() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.purchaseDemand(purchaseDate) });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not save warehouse policy.");
    },
  });

  const deleteLocalStorePolicy = useMutation({
    mutationFn: async (itemCode: string) => {
      await adminRepository.deleteLocalStorePolicy(itemCode);
    },
    onSuccess: () => {
      setRestaurantError("");
      setRestaurantSuccess("Warehouse policy removed.");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.localStorePolicies() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.purchaseDemand(purchaseDate) });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not remove warehouse policy.");
    },
  });

  const buildPurchasePayload = (row: PurchasePlanRow, mode: "draft" | "finalized", nowIso: string) => ({
    purchase_date: purchaseDate,
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
        for (const row of rowsForSave) {
          await adminRepository.upsertPurchasePlan(row);
        }
      }

      if (mode === "finalized") {
        const stockDeltaByCode = computeStockDeltaFromVariance(purchaseRows, persistedPurchaseByKey);

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
          for (const stockRow of stockUpserts) {
            await adminRepository.upsertStockQty({
              item_code: stockRow.item_code,
              item_en: stockRow.item_en,
              available_qty: stockRow.available_qty,
            });
          }
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
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stockQty() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.purchaseStockHistory(safePurchaseHistoryFromDate, safePurchaseHistoryToDate) });
      if (historyDate) {
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.purchaseStockDetails(historyDate) });
      }
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.purchasePlans(purchaseDate) });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.purchaseDayLock(purchaseDate) });
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
      await adminRepository.upsertPurchasePlan(buildPurchasePayload(row, mode, nowIso));
    },
    onSuccess: () => {
      setRestaurantError("");
      setRestaurantSuccess("Item saved.");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.purchasePlans(purchaseDate) });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.purchaseStockHistory(safePurchaseHistoryFromDate, safePurchaseHistoryToDate) });
      if (historyDate) {
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.purchaseStockDetails(historyDate) });
      }
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not save item.");
    },
  });

  const lockPurchaseDay = useMutation({
    mutationFn: async () => {
      await adminRepository.lockPurchaseDay(purchaseDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.purchaseDayLock(purchaseDate) });
    },
  });

  const reopenPurchaseDay = useMutation({
    mutationFn: async () => {
      if (!isAdminMode) {
        throw new Error("Only admin can reopen a locked purchase day.");
      }
      await adminRepository.reopenPurchaseDay(purchaseDate);
    },
    onSuccess: () => {
      setRestaurantError("");
      setRestaurantSuccess("Purchase reopened for edits.");
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.purchaseDayLock(purchaseDate) });
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not reopen purchase.");
    },
  });

  const finalizePurchaseDay = useMutation({
    mutationFn: async () => {
      const lockId = purchaseDayLockRows[0]?.id || (await adminRepository.ensurePurchaseDayLockId(purchaseDate));
      // DB RPC is final authority: recompute purchase totals, stock deltas, and lock in one transaction.
      return adminRepository.finalizePurchase(lockId);
    },
    onSuccess: async (result) => {
      setPurchaseEdits({});
      setRestaurantError("");
      await Promise.all([
        queryClient.refetchQueries({ queryKey: adminQueryKeys.purchasePlans(purchaseDate) }),
        queryClient.refetchQueries({ queryKey: adminQueryKeys.stockQty() }),
        queryClient.refetchQueries({ queryKey: ["admin", "warehouse-transactions"] }),
        queryClient.refetchQueries({ queryKey: adminQueryKeys.purchaseStockHistory(safePurchaseHistoryFromDate, safePurchaseHistoryToDate) }),
        ...(historyDate ? [queryClient.refetchQueries({ queryKey: adminQueryKeys.purchaseStockDetails(historyDate) })] : []),
        queryClient.refetchQueries({ queryKey: adminQueryKeys.purchaseDayLock(purchaseDate) }),
      ]);
      if (result?.already_finalized) {
        setRestaurantSuccess("Purchase already finalized. No new stock delta was applied.");
      } else {
        setRestaurantSuccess("Purchase finalized. Extra qty carried to stock.");
      }
    },
    onError: (error: Error) => {
      setRestaurantSuccess("");
      setRestaurantError(error.message || "Could not finalize purchase.");
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
          (o.status === ORDER_STATUS.purchaseDone ||
            o.status === ORDER_STATUS.outForDelivery ||
            o.status === ORDER_STATUS.delivered ||
            o.status === ORDER_STATUS.failed),
      ),
    [orders, todayIso],
  );
  const deliveryActiveOrders = useMemo(
    () =>
      deliveryRelevantOrders.filter(
        (o) => o.status === ORDER_STATUS.purchaseDone || o.status === ORDER_STATUS.outForDelivery,
      ),
    [deliveryRelevantOrders],
  );
  const deliveryFilteredOrders = useMemo(() => {
    const term = deliverySearch.trim().toLowerCase();
    const filteredByStatus = deliveryRelevantOrders.filter((order) => {
      if (deliveryFilter === "all") return true;
      if (deliveryFilter === "active") {
        return order.status === ORDER_STATUS.purchaseDone || order.status === ORDER_STATUS.outForDelivery;
      }
      if (deliveryFilter === "ready") return order.status === ORDER_STATUS.purchaseDone;
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
      if (status === ORDER_STATUS.purchaseDone) return 1;
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
        (o) => o.status === ORDER_STATUS.purchaseDone || o.status === ORDER_STATUS.outForDelivery,
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
      ready: deliveryRelevantOrders.filter((o) => o.status === ORDER_STATUS.purchaseDone).length,
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

  const moduleItems = useMemo(() => {
    return navigation.filter((item) => {
      if (!item.show) return false;
      if (isPurchaseMode) {
        if (isSalesSession) return item.key === "sales";
        return item.key === "purchase";
      }
      return true;
    });
  }, [isPurchaseMode, isSalesSession]);

  const currentModulePath = `/${activeView}`;
  const activeModule = getCurrentModule(currentModulePath, moduleItems);

  const activeTabPath = useMemo(() => {
    if (activeView === "orders") return `/orders?tab=${activeTab}`;
    if (activeView === "sales") {
      if (activeSalesTab === "create") return "/sales/create";
      if (activeSalesTab === "payments") return "/sales/payments";
      return "/sales";
    }
    if (activeView === "purchase") {
      if (activePurchaseTab === "buy") return "/purchase/buy";
      if (activePurchaseTab === "finalized") return "/purchase/finalized";
      if (activePurchaseTab === "stock") return "/purchase/stock";
      return "/purchase";
    }
    if (activeView === "warehouse") {
      if (activeWarehouseTab === "policy") return "/warehouse/policy";
      if (activeWarehouseTab === "movements") return "/warehouse/movements";
      return "/warehouse";
    }
    return `/${activeView}`;
  }, [activeView, activeTab, activeSalesTab, activePurchaseTab, activeWarehouseTab]);

  const applyPathToState = (path: string) => {
    const parsed = new URL(path, "http://local");
    const pathname = parsed.pathname;
    const params = parsed.searchParams;

    if (pathname.startsWith("/orders")) {
      setActiveView("orders");
      const nextOrderTab = params.get("tab") || params.get("ordersTab");
      if (
        nextOrderTab === ORDER_STATUS.pending ||
        nextOrderTab === ORDER_STATUS.confirmed ||
        nextOrderTab === ORDER_STATUS.purchaseDone ||
        nextOrderTab === ORDER_STATUS.invoiced ||
        nextOrderTab === ORDER_STATUS.rejected
      ) {
        setActiveTab(nextOrderTab);
      }
      return;
    }

    if (pathname.startsWith("/sales")) {
      setActiveView("sales");
      if (pathname.startsWith("/sales/create")) {
        setActiveSalesTab("create");
      } else if (pathname.startsWith("/sales/payments")) {
        setActiveSalesTab("payments");
      } else {
        setActiveSalesTab("invoices");
      }
      return;
    }

    if (pathname.startsWith("/purchase")) {
      setActiveView("purchase");
      if (pathname.startsWith("/purchase/buy")) {
        setActivePurchaseTab("buy");
      } else if (pathname.startsWith("/purchase/finalized")) {
        setActivePurchaseTab("finalized");
      } else if (pathname.startsWith("/purchase/stock") || pathname.startsWith("/purchase/stock-impact")) {
        setActivePurchaseTab("stock");
      } else {
        setActivePurchaseTab("plan");
      }
      return;
    }

    if (pathname.startsWith("/warehouse")) {
      setActiveView("warehouse");
      if (pathname.startsWith("/warehouse/policy")) {
        setActiveWarehouseTab("policy");
      } else if (pathname.startsWith("/warehouse/movements")) {
        setActiveWarehouseTab("movements");
      } else {
        setActiveWarehouseTab("overview");
      }
      return;
    }

    if (pathname.startsWith("/delivery")) {
      setActiveView("delivery");
      return;
    }
    if (pathname.startsWith("/restaurants")) {
      setActiveView("restaurants");
      return;
    }
    if (pathname.startsWith("/stock")) {
      setActiveView("warehouse");
      setActiveWarehouseTab("overview");
      return;
    }
    if (pathname.startsWith("/users")) {
      setActiveView("users");
      return;
    }
    setActiveView("orders");
  };

  const catalogMetaMap = useMemo(() => {
    const map = new Map<string, { hi: string; category: string }>();
    CATALOG.forEach((item) => {
      map.set(item.code, { hi: item.hi, category: item.category });
      map.set(item.en, { hi: item.hi, category: item.category });
    });
    return map;
  }, []);

  const confirmedOrdersForPurchaseQueue = useMemo(
    () => orders.filter((o) => o.status === ORDER_STATUS.confirmed),
    [orders],
  );

  const sourceOrdersByItemCode = useMemo(() => {
    const map = new Map<string, SourceOrderRef[]>();
    confirmedOrdersForPurchaseQueue.forEach((order) => {
      const items = (order.items || []) as OrderItem[];
      items.forEach((item) => {
        const itemCode = item.code?.trim() || item.en.trim();
        const refs = map.get(itemCode) || [];
        refs.push({
          order_ref: order.order_ref,
          restaurant_name: order.restaurant_name,
          qty: round2(Math.max(0, toSafeNumber(item.qty, 0))),
        });
        map.set(itemCode, refs);
      });
    });
    return map;
  }, [confirmedOrdersForPurchaseQueue]);

  const aggregatedPurchaseRows = useMemo(() => {
    if (purchaseDemandRows.length === 0) return [] as PurchasePlanRow[];
    return purchaseDemandRows.map((row: PurchaseDemandRow) => {
      const code = row.item_code || row.item_en;
      const meta = catalogMetaMap.get(code) || catalogMetaMap.get(row.item_en);
      const requiredQty = round2(Math.max(0, row.purchase_required_qty));
      const refs = sourceOrdersByItemCode.get(code) || sourceOrdersByItemCode.get(row.item_en) || null;
      return {
        item_code: code,
        item_en: row.item_en,
        item_hi: meta?.hi || null,
        category: meta?.category || null,
        ordered_qty: requiredQty,
        adjustment_qty: 0,
        final_qty: requiredQty,
        purchased_qty: 0,
        pack_size: 0,
        pack_count: 0,
        unit_price: 0,
        line_total: 0,
        variance_qty: requiredQty === 0 ? 0 : -requiredQty,
        vendor_name: null,
        purchase_status: "draft",
        finalized_at: null,
        finalized_by: null,
        notes: null,
        source_orders: refs,
      } as PurchasePlanRow;
    });
  }, [purchaseDemandRows, catalogMetaMap, sourceOrdersByItemCode]);

  const { purchaseRows, persistedPurchaseByKey } = useMemo(() => {
    const merged = mergePurchaseRows({
      aggregatedRows: aggregatedPurchaseRows,
      persistedRows: purchasePlanRows,
      purchaseEdits,
      catalogMetaMap,
    });
    return {
      purchaseRows: merged.rows,
      persistedPurchaseByKey: merged.persistedByKey,
    };
  }, [aggregatedPurchaseRows, purchasePlanRows, purchaseEdits, catalogMetaMap]);

  const purchaseSheetStatus = useMemo(
    () => (purchaseRows.some((row) => row.purchase_status === "finalized") ? "finalized" : "draft"),
    [purchaseRows],
  );

  const purchaseTotals = useMemo(() => computePurchaseTotals(purchaseRows), [purchaseRows]);

  const purchaseRowsForFlow = useMemo(
    () => purchaseRows.filter((row) => row.final_qty > 0 || row.purchased_qty > 0),
    [purchaseRows],
  );

  const filteredPurchaseRows = useMemo(() => purchaseRowsForFlow, [purchaseRowsForFlow]);

  const remainingQtyForRow = (row: PurchasePlanRow) => round2(row.final_qty - row.purchased_qty);

  const pendingPurchaseRows = useMemo(
    () => filteredPurchaseRows.filter((row) => remainingQtyForRow(row) > 0),
    [filteredPurchaseRows],
  );

  const completedPurchaseRows = useMemo(
    () => filteredPurchaseRows.filter((row) => remainingQtyForRow(row) === 0),
    [filteredPurchaseRows],
  );
  const overPurchaseRows = useMemo(
    () => filteredPurchaseRows.filter((row) => remainingQtyForRow(row) < 0),
    [filteredPurchaseRows],
  );
  const coveredPurchaseRows = useMemo(
    () => filteredPurchaseRows.filter((row) => remainingQtyForRow(row) <= 0),
    [filteredPurchaseRows],
  );
  const totalRemainingQty = useMemo(
    () => round2(filteredPurchaseRows.reduce((sum, row) => sum + Math.max(0, remainingQtyForRow(row)), 0)),
    [filteredPurchaseRows],
  );
  const totalOverQty = useMemo(
    () => round2(filteredPurchaseRows.reduce((sum, row) => sum + Math.max(0, -remainingQtyForRow(row)), 0)),
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
  const currentPurchaseFinalQty = currentPurchaseRow?.final_qty;
  const currentPurchasePurchasedQty = currentPurchaseRow?.purchased_qty;

  useEffect(() => {
    if (activeView !== "purchase" || activePurchaseTab !== "buy" || !currentPurchaseKey) return;
    if (currentPurchaseFinalQty == null || currentPurchasePurchasedQty == null) return;
    const remainingQty = round2(Math.max(0, currentPurchaseFinalQty - currentPurchasePurchasedQty));
    setBuyQtyInput(String(remainingQty));
  }, [
    activeView,
    activePurchaseTab,
    currentPurchaseKey,
    currentPurchaseFinalQty,
    currentPurchasePurchasedQty,
  ]);

  useEffect(() => {
    if (activeView !== "purchase" || activePurchaseTab !== "buy") return;
    if (filteredPurchaseRows.length === 0) return;
    const selectedStillExists = currentPurchaseKey
      ? filteredPurchaseRows.some((row) => row.item_code === currentPurchaseKey)
      : false;
    if (selectedStillExists) return;
    const nextPending = filteredPurchaseRows.find((row) => remainingQtyForRow(row) > 0);
    setCurrentPurchaseKey((nextPending || filteredPurchaseRows[0]).item_code);
  }, [activeView, activePurchaseTab, filteredPurchaseRows, currentPurchaseKey]);

  const purchaseHistoryByDate = useMemo(
    () =>
      purchaseHistoryByDateRaw.map((row: PurchaseStockHistoryRow) => ({
        date: row.date,
        totalAmount: round2(toSafeNumber(row.total_amount, 0)),
        itemCount: Number(row.item_count) || 0,
      })),
    [purchaseHistoryByDateRaw],
  );

  useEffect(() => {
    if (purchaseHistoryByDate.length === 0) {
      if (historyDate !== null) setHistoryDate(null);
      return;
    }
    if (!historyDate || !purchaseHistoryByDate.some((row) => row.date === historyDate)) {
      setHistoryDate(purchaseHistoryByDate[0].date);
    }
  }, [purchaseHistoryByDate, historyDate]);

  const copyLink = async (link: string, label: string) => {
    try {
      const copied = await copyTextToClipboard(link);
      if (!copied) throw new Error("copy_failed");
      setRestaurantSuccess(`Copied ${label}`);
      setRestaurantError("");
    } catch {
      setRestaurantSuccess("");
      setRestaurantError(`Could not copy ${label}.`);
    }
  };

  const printPopupWhenImagesReady = (popup: Window) => {
    let attempts = 0;
    const maxAttempts = 40;
    const tick = () => {
      attempts += 1;
      if (popup.closed) return;
      const images = Array.from(popup.document.images);
      const loaded =
        images.length === 0 ||
        images.every((img) => img.complete && img.naturalWidth > 0);
      if (loaded || attempts >= maxAttempts) {
        popup.focus();
        popup.print();
        return;
      }
      window.setTimeout(tick, 150);
    };
    window.setTimeout(tick, 150);
  };

  const printPurchaseQr = () => {
    const link = getPurchaseLink();
    const qr = getQrUrl(link, 420);
    const popup = window.open("", "_blank", "width=700,height=900");
    if (!popup) return;
    popup.document.open();
    popup.document.write(
      buildPrintableDoc(
        `<section style="text-align:center; padding:24px 8px;">
          <h1 style="font-size:26px; margin-bottom:10px;">Purchase Page QR</h1>
          <img src="${qr}" alt="Purchase page QR code" style="width:320px; height:320px; border:1px solid #ddd; border-radius:12px;" />
          <p style="margin-top:16px; font-size:12px; word-break:break-all;">${escapeHtml(link)}</p>
        </section>`,
        "Purchase Page QR",
      ),
    );
    popup.document.close();
    printPopupWhenImagesReady(popup);
  };

  const printRestaurantQr = (restaurantName: string, slug: string) => {
    const orderLink = getRestaurantOrderLink(slug);
    const qr = getRestaurantQrUrl(slug, 420);
    const popup = window.open("", "_blank", "width=700,height=900");
    if (!popup) return;
    popup.document.open();
    popup.document.write(
      buildPrintableDoc(
        `<section style="text-align:center; padding:24px 8px;">
          <h1 style="font-size:24px; margin-bottom:8px;">${escapeHtml(restaurantName)}</h1>
          <p style="font-size:14px; color:#666; margin-bottom:12px;">Order QR</p>
          <img src="${qr}" alt="Restaurant QR code" style="width:320px; height:320px; border:1px solid #ddd; border-radius:12px;" />
          <p style="margin-top:16px; font-size:12px; word-break:break-all;">${escapeHtml(orderLink)}</p>
        </section>`,
        `${restaurantName} QR`,
      ),
    );
    popup.document.close();
    printPopupWhenImagesReady(popup);
  };

  const printAllActiveRestaurantQrs = () => {
    const activeRestaurants = restaurants.filter((r) => r.is_active !== false);
    if (activeRestaurants.length === 0) {
      setRestaurantError("No active restaurants to print.");
      setRestaurantSuccess("");
      return;
    }
    const blocks = activeRestaurants
      .map((r) => {
        const link = getRestaurantOrderLink(r.slug);
        const qr = getRestaurantQrUrl(r.slug, 360);
        return `
          <section style="text-align:center; page-break-after:always; padding:24px 8px;">
            <h1 style="font-size:24px; margin-bottom:8px;">${escapeHtml(r.name)}</h1>
            <img src="${qr}" alt="Restaurant QR code" style="width:300px; height:300px; border:1px solid #ddd; border-radius:12px;" />
            <p style="margin-top:12px; font-size:12px; word-break:break-all;">${escapeHtml(link)}</p>
          </section>
        `;
      })
      .join("");
    const popup = window.open("", "_blank", "width=900,height=900");
    if (!popup) return;
    popup.document.open();
    popup.document.write(buildPrintableDoc(blocks, "All Restaurant QRs"));
    popup.document.close();
    printPopupWhenImagesReady(popup);
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
      await savePurchaseSheet.mutateAsync({ mode: "draft" });
      await finalizePurchaseDay.mutateAsync();
      setActivePurchaseTab("finalized");
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
    const current = Math.max(0, toSafeNumber(buyQtyInput, 0));
    const next = Math.max(0, round2(current + delta));
    setBuyQtyInput(String(next));
  };

  const handleMarkBoughtAndNext = async () => {
    if (!currentPurchaseRow || isPurchaseDayLocked) return;
    const addQty = Math.max(0, round2(toSafeNumber(buyQtyInput, 0)));
    const nextPurchasedQty = round2(Math.max(0, currentPurchaseRow.purchased_qty + addQty));
    const nextLineTotal = round2(nextPurchasedQty * currentPurchaseRow.unit_price);
    const rowToSave = {
      ...currentPurchaseRow,
      purchased_qty: nextPurchasedQty,
      line_total: nextLineTotal,
      variance_qty: round2(nextPurchasedQty - currentPurchaseRow.final_qty),
    };
    updatePurchaseRow(currentPurchaseRow.item_code, "purchased_qty", String(nextPurchasedQty));
    try {
      await savePurchaseItem.mutateAsync({ row: rowToSave, mode: "draft" });
      const rowsWithCurrentUpdated = filteredPurchaseRows.map((row) =>
        row.item_code === currentPurchaseRow.item_code ? rowToSave : row,
      );
      const pendingRows = rowsWithCurrentUpdated.filter((row) => round2(row.final_qty - row.purchased_qty) > 0);
      if (pendingRows.length === 0) {
        if (rowsWithCurrentUpdated.length > 0) {
          const nextIndex = (currentPurchaseIndex + 1) % rowsWithCurrentUpdated.length;
          setCurrentPurchaseKey(rowsWithCurrentUpdated[nextIndex].item_code);
        }
        return;
      }
      const nextPending = pendingRows.find((row) => row.item_code !== currentPurchaseRow.item_code) || pendingRows[0];
      setCurrentPurchaseKey(nextPending.item_code);
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
          <p><strong>Ready:</strong> ${deliveryCounts.ready} | <strong>Out:</strong> ${deliveryCounts.outForDelivery}</p>
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
          <p><strong>Confirmed Orders (Rolling Queue):</strong> ${confirmedOrdersForPurchaseQueue.length}</p>
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
    const rowsHtml = purchaseHistoryDetailRows
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

  return (
    <div className="app-dvh bg-background overflow-hidden md:grid md:grid-cols-[250px_1fr]">
      <aside className="hidden md:flex md:flex-col border-r border-border bg-card sticky top-0 h-[100dvh] overflow-y-auto p-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold">{isSalesSession ? "Sales Panel" : "Admin Panel"}</h1>
          <p className="text-xs text-muted-foreground">{formatIndiaDate(new Date())}</p>
        </div>
        <Sidebar
          modules={moduleItems}
          activeModuleKey={activeModule?.key ?? null}
          onNavigate={applyPathToState}
        />
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
          <Sidebar
            modules={moduleItems}
            activeModuleKey={activeModule?.key ?? null}
            onNavigate={applyPathToState}
            mobile
          />
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mobile-stable-scroll p-3 sm:p-4 md:p-6 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="max-w-5xl">
{activeView === "purchase" && (
          <>
            <section className="bg-card rounded-lg border border-border p-4 mb-4 purchase-mobile-shell">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Purchase</h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      isPurchaseDayLocked ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isPurchaseDayLocked ? "Locked" : "Open"}
                  </span>
                  {isPurchaseDayLocked && isAdminMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => reopenPurchaseDay.mutate()}
                      disabled={reopenPurchaseDay.isPending}
                    >
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Demand rows: <span className="font-semibold text-foreground">{purchaseDemandRows.length}</span>
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Rolling demand from all confirmed orders + warehouse required stock gap.
              </p>
              {restaurantError ? <p className="text-xs text-destructive mb-2">{restaurantError}</p> : null}
              {restaurantSuccess ? <p className="text-xs text-emerald-700 mb-2">{restaurantSuccess}</p> : null}
              <TopTabs
                tabs={(moduleItems.find((item) => item.key === "purchase")?.tabs ?? []).map((tab) => ({
                  ...tab,
                }))}
                activePath={activeTabPath}
                onNavigate={applyPathToState}
                className="mb-0"
              />
            </section>

            {isPurchaseLoading ? (
              <section className="bg-card rounded-lg border border-border p-4 mb-4">
                <p className="text-sm text-muted-foreground py-6 text-center">Loading purchase sheet...</p>
              </section>
            ) : filteredPurchaseRows.length === 0 ? (
              <section className="bg-card rounded-lg border border-border p-4 mb-4">
                <p className="text-sm text-muted-foreground py-6 text-center">No purchase demand items in rolling queue.</p>
              </section>
            ) : activePurchaseTab === "plan" ? (
              <PurchasePlanPage
                rows={filteredPurchaseRows}
                requiredQty={purchaseTotals.requiredQty}
                purchasedQty={purchaseTotals.purchasedQty}
                totalRemainingQty={totalRemainingQty}
                completedCount={completedPurchaseRows.length}
                onStartBuying={() => {
                  const nextPending = filteredPurchaseRows.find((row) => remainingQtyForRow(row) > 0) || filteredPurchaseRows[0];
                  setCurrentPurchaseKey(nextPending?.item_code ?? null);
                  applyPathToState("/purchase/buy");
                }}
              />
            ) : activePurchaseTab === "buy" ? (
              <PurchaseBuyPage
                currentRow={currentPurchaseRow}
                currentIndex={currentPurchaseIndex}
                totalCount={filteredPurchaseRows.length}
                pendingCount={pendingPurchaseRows.length}
                isLocked={isPurchaseDayLocked}
                isSaving={savePurchaseItem.isPending}
                buyQty={buyQtyInput}
                onStepQty={(delta) => {
                  if (!currentPurchaseRow) return;
                  updatePurchasedQtyByStep(currentPurchaseRow, delta);
                }}
                onSetQty={(value) => {
                  setBuyQtyInput(value);
                }}
                onSetRate={(value) => {
                  if (!currentPurchaseRow) return;
                  updatePurchaseRow(currentPurchaseRow.item_code, "unit_price", value);
                }}
                onSetVendor={(value) => {
                  if (!currentPurchaseRow) return;
                  updatePurchaseRow(currentPurchaseRow.item_code, "vendor_name", value);
                }}
                onPrev={() => moveWizardToIndex(currentPurchaseIndex - 1)}
                onSaveAndNext={handleMarkBoughtAndNext}
                onSkip={() => moveWizardToIndex(currentPurchaseIndex + 1)}
                onReviewFinalize={() => setActivePurchaseTab("finalized")}
                onBackToPlan={() => applyPathToState("/purchase")}
              />
            ) : activePurchaseTab === "finalized" ? (
              <PurchaseFinalizedPage
                rows={filteredPurchaseRows}
                coveredCount={coveredPurchaseRows.length}
                totalCount={filteredPurchaseRows.length}
                pendingCount={pendingPurchaseRows.length}
                overCount={overPurchaseRows.length}
                requiredQty={purchaseTotals.requiredQty}
                purchasedQty={purchaseTotals.purchasedQty}
                remainingQty={totalRemainingQty}
                overQty={totalOverQty}
                spendAmount={purchaseTotals.spend}
                canFinalize={purchaseRowsForFlow.length > 0}
                isLocked={isPurchaseDayLocked}
                isSavePending={savePurchaseSheet.isPending}
                isFinalizePending={savePurchaseSheet.isPending || finalizePurchaseDay.isPending}
                onBackToBuy={() => setActivePurchaseTab("buy")}
                onSaveDraft={handleSaveDraft}
                onFinalize={handleFinalizePurchase}
                onPrint={printPurchaseList}
              />
            ) : (
              <PurchaseStockPage
                todayIso={todayIso}
                windowStartIso={purchaseHistoryWindowStartIso}
                fromDate={purchaseHistoryFromDate}
                toDate={purchaseHistoryToDate}
                historyByDate={purchaseHistoryByDate}
                selectedDate={historyDate}
                detailRows={purchaseHistoryDetailRows}
                onFromChange={(value) => setPurchaseHistoryFromDate(value)}
                onToChange={(value) => setPurchaseHistoryToDate(value)}
                onResetRange={() => {
                  setPurchaseHistoryFromDate(purchaseHistoryWindowStartIso);
                  setPurchaseHistoryToDate(todayIso);
                }}
                onSelectDate={(value) => setHistoryDate(value)}
                onPrintDate={printHistoryDateSheet}
              />
            )}
          </>
        )}

        {activeView === "sales" && (
          <ModuleLayout
            title="Sales"
            module={moduleItems.find((item) => item.key === "sales") ?? null}
            activeTabPath={activeTabPath}
            onTabNavigate={applyPathToState}
          >
            <SalesPanel activeTab={activeSalesTab} onTabChange={setActiveSalesTab} />
          </ModuleLayout>
        )}

        {!isPurchaseMode && activeView === "restaurants" && (
          <section className="bg-card rounded-lg border border-border p-4 mb-4 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Page Links / QR</h2>
            <div className="rounded-md border border-border p-3 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Platform Links</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => copyLink(getAdminLoginLink(), "Admin Login link")}>
                  Copy Admin Login
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => copyLink(getCurrentPageLink(), "Admin Panel link")}>
                  Copy Admin Panel
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => copyLink(getPurchaseLink(), "Purchase link")}>
                  Copy Purchase Link
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPurchaseQr((prev) => !prev)}>
                  {showPurchaseQr ? "Hide Purchase QR" : "Show Purchase QR"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={printPurchaseQr}>
                  Print Purchase QR
                </Button>
              </div>
              {showPurchaseQr && (
                <img
                  src={getQrUrl(getPurchaseLink(), 300)}
                  alt="Purchase page QR code preview"
                  className="w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] border border-border rounded-md bg-card"
                  loading="lazy"
                />
              )}
            </div>
            {restaurantError && <p className="text-xs text-destructive">{restaurantError}</p>}
            {restaurantSuccess && <p className="text-xs text-emerald-700">{restaurantSuccess}</p>}
            <div className="grid sm:grid-cols-3 gap-2">
              <Input value={newRestaurantName} placeholder="Restaurant name" onChange={(e) => setNewRestaurantName(e.target.value)} />
              <Input value={newRestaurantSlug} placeholder="restaurant-slug" onChange={(e) => setNewRestaurantSlug(e.target.value.trim().toLowerCase())} />
              <Button
                type="button"
                onClick={() => {
                  const name = newRestaurantName.trim();
                  const slug = newRestaurantSlug.trim();
                  if (!name || !slug) return;
                  createRestaurant.mutate({ name, slug });
                }}
                disabled={createRestaurant.isPending}
              >
                Add Restaurant
              </Button>
            </div>
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Restaurant Links</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={printAllActiveRestaurantQrs}
                >
                  Print All Active Restaurant QRs
                </Button>
              </div>
              {restaurants.map((r) => (
                <div key={r.id} className="rounded-md border border-border p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">/order?r={r.slug}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(getRestaurantOrderLink(r.slug), `${r.name} order link`)}
                      >
                        Copy Link
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(getRestaurantPortalLoginLink(r.slug), `${r.name} portal login link`)}
                      >
                        Copy Portal Link
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewRestaurantSlug((prev) => (prev === r.slug ? null : r.slug))}
                      >
                        {previewRestaurantSlug === r.slug ? "Hide QR" : "Show QR"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => printRestaurantQr(r.name, r.slug)}
                      >
                        Print QR
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={r.is_active === false ? "outline" : "secondary"}
                        onClick={() => toggleRestaurantActive.mutate({ id: r.id, isActive: r.is_active === false })}
                      >
                        {r.is_active === false ? "Enable" : "Disable"}
                      </Button>
                    </div>
                  </div>
                  {previewRestaurantSlug === r.slug && (
                    <img
                      src={getRestaurantQrUrl(r.slug, 260)}
                      alt={`${r.name} order QR code preview`}
                      className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] border border-border rounded-md bg-card"
                      loading="lazy"
                    />
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{getRestaurantOrderLink(r.slug)}</span>
                    <span>{r.is_active === false ? "Disabled" : "Active"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{getRestaurantPortalLoginLink(r.slug)}</span>
                    <span>Portal Login</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={portalPinByRestaurantId[r.id] || ""}
                      onChange={(e) =>
                        setPortalPinByRestaurantId((prev) => ({
                          ...prev,
                          [r.id]: e.target.value.replace(/[^0-9]/g, "").slice(0, 6),
                        }))
                      }
                      placeholder="Set 4-6 digit PIN"
                      className="h-8 w-[180px]"
                      inputMode="numeric"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const pin = (portalPinByRestaurantId[r.id] || "").trim();
                        if (!/^[0-9]{4,6}$/.test(pin)) {
                          setRestaurantSuccess("");
                          setRestaurantError("PIN must be 4 to 6 digits.");
                          return;
                        }
                        setRestaurantError("");
                        setRestaurantSuccess("");
                        setRestaurantPortalPin.mutate({ restaurantId: r.id, username: r.slug, pin });
                      }}
                      disabled={setRestaurantPortalPin.isPending}
                    >
                      Save Portal PIN
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Support Inbox</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{supportIssues.length} issues</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={supportIssuesPage <= 1}
                    onClick={() => setSupportIssuesPage((prev) => Math.max(1, prev - 1))}
                  >
                    Prev
                  </Button>
                  <span className="text-xs text-muted-foreground">Page {supportIssuesPage}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!hasMoreSupportIssues}
                    onClick={() => setSupportIssuesPage((prev) => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
              {supportIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No support issues yet.</p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                  {supportIssues.map((issue) => (
                    <div key={issue.id} className="rounded-md border border-border p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{issue.restaurant_name}</p>
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{issue.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {issue.issue_type.replaceAll("_", " ")} · {formatIsoDateDdMmYyyy(issue.created_at)} · {issue.order_id ? "Order linked" : "General"}
                      </p>
                      <p className="text-sm">{issue.note}</p>
                      {issue.photo_data_urls?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {issue.photo_data_urls.slice(0, 3).map((url) => (
                            <img
                              key={url}
                              src={url}
                              alt="Issue evidence"
                              className="w-14 h-14 rounded border border-border object-cover bg-card"
                            />
                          ))}
                        </div>
                      ) : null}
                      {issue.resolution_note ? (
                        <p className="text-xs text-emerald-700">Resolution: {issue.resolution_note}</p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => updateSupportIssue.mutate({ issueId: issue.id, status: "in_review" })}
                          disabled={updateSupportIssue.isPending || issue.status === "in_review"}
                        >
                          Mark In Review
                        </Button>
                        <Input
                          value={supportResolutionByIssueId[issue.id] || ""}
                          onChange={(e) =>
                            setSupportResolutionByIssueId((prev) => ({
                              ...prev,
                              [issue.id]: e.target.value,
                            }))
                          }
                          placeholder="Resolution note"
                          className="h-8 min-w-[180px] flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            updateSupportIssue.mutate({
                              issueId: issue.id,
                              status: "resolved",
                              resolutionNote: supportResolutionByIssueId[issue.id] || issue.resolution_note || "",
                            })
                          }
                          disabled={updateSupportIssue.isPending || issue.status === "resolved"}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {!isPurchaseMode && activeView === "warehouse" && (
          <section className="bg-card rounded-lg border border-border p-4 mb-4 space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Warehouse</h2>
              <p className="text-xs text-muted-foreground">Central inventory operations and policy.</p>
            </div>

            <TopTabs
              tabs={(moduleItems.find((item) => item.key === "warehouse")?.tabs ?? []).map((tab) => ({
                ...tab,
              }))}
              activePath={activeTabPath}
              onNavigate={applyPathToState}
            />

            {restaurantError && <p className="text-xs text-destructive">{restaurantError}</p>}
            {restaurantSuccess && <p className="text-xs text-emerald-700">{restaurantSuccess}</p>}

            {activeWarehouseTab === "overview" && (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-3 gap-2">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground">Items</p>
                    <p className="text-lg font-semibold">{warehouseSummary.totalItems}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground">Total Qty</p>
                    <p className="text-lg font-semibold">{warehouseSummary.totalAvailableQty} kg</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground">Low Stock</p>
                    <p className="text-lg font-semibold">{warehouseSummary.lowStockCount}</p>
                  </div>
                </div>

                <Input
                  value={warehouseItemSearch}
                  onChange={(e) => setWarehouseItemSearch(e.target.value)}
                  placeholder="Search item by name or code"
                />

                <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
                  {warehouseCatalogRows.map((item) => {
                    const inStock = availabilityMap.get(item.code) ?? availabilityMap.get(item.en) ?? true;
                    const qty = item.availableQty;
                    const isUploaderOpen = activeStockIconItemCode === item.code;
                    return (
                      <div key={item.code} className="rounded-md border border-border p-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <ItemIcon itemEn={item.en} category={item.category} size={20} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{item.en}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.code} · Qty {qty} kg
                                {item.requiredStockQty > 0 ? ` · Required ${item.requiredStockQty} kg` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setActiveStockIconItemCode((prev) => (prev === item.code ? null : item.code))
                              }
                            >
                              {isUploaderOpen ? "Close Upload" : "Upload"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={upsertStockItemIcon.isPending}
                              onClick={() =>
                                upsertStockItemIcon.mutate({
                                  itemCode: item.code,
                                  itemEn: item.en,
                                  iconUrl: null,
                                })
                              }
                            >
                              Remove Icon
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={inStock ? "default" : "destructive"}
                              onClick={() =>
                                toggleItemAvailability.mutate({
                                  itemCode: item.code,
                                  itemEn: item.en,
                                  isInStock: !inStock,
                                })
                              }
                              className="text-xs font-semibold"
                            >
                              {inStock ? "In Stock" : "Out of Stock"}
                            </Button>
                          </div>
                        </div>
                        {isUploaderOpen && (
                          <ItemIconUploader
                            itemLabel={item.en}
                            disabled={upsertStockItemIcon.isPending}
                            onUploaded={async ({ dataUrl }) => {
                              await upsertStockItemIcon.mutateAsync({
                                itemCode: item.code,
                                itemEn: item.en,
                                iconUrl: dataUrl,
                              });
                              setActiveStockIconItemCode(null);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeWarehouseTab === "policy" && (
              <LocalStorePanel
                stockItems={warehouseCatalogRows.map((row) => ({
                  item_code: row.code,
                  item_en: row.en,
                  available_qty: row.availableQty,
                }))}
                policies={localStorePolicies}
                isSaving={upsertLocalStorePolicy.isPending || deleteLocalStorePolicy.isPending}
                onSavePolicy={(payload) => upsertLocalStorePolicy.mutate(payload)}
                onDeletePolicy={(itemCode) => deleteLocalStorePolicy.mutate(itemCode)}
              />
            )}

            {activeWarehouseTab === "movements" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input
                    type="date"
                    value={warehouseFromDate}
                    max={todayIso}
                    onChange={(e) => setWarehouseFromDate(e.target.value || warehouseWindowStartIso)}
                    className="h-9 w-[150px]"
                  />
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input
                    type="date"
                    value={warehouseToDate}
                    max={todayIso}
                    onChange={(e) => setWarehouseToDate(e.target.value || todayIso)}
                    className="h-9 w-[150px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWarehouseFromDate(warehouseWindowStartIso);
                      setWarehouseToDate(todayIso);
                    }}
                  >
                    Last 30 Days
                  </Button>
                </div>

                <div className="grid sm:grid-cols-5 gap-2">
                  <div className="rounded-md border border-border p-2.5">
                    <p className="text-xs text-muted-foreground">Purchase In</p>
                    <p className="text-sm font-semibold">{warehouseMovementSummary.purchaseIn}</p>
                  </div>
                  <div className="rounded-md border border-border p-2.5">
                    <p className="text-xs text-muted-foreground">Dispatch Out</p>
                    <p className="text-sm font-semibold">{warehouseMovementSummary.dispatchOut}</p>
                  </div>
                  <div className="rounded-md border border-border p-2.5">
                    <p className="text-xs text-muted-foreground">Retail Out</p>
                    <p className="text-sm font-semibold">{warehouseMovementSummary.retailOut}</p>
                  </div>
                  <div className="rounded-md border border-border p-2.5">
                    <p className="text-xs text-muted-foreground">Adjustments</p>
                    <p className="text-sm font-semibold">{warehouseMovementSummary.adjustment}</p>
                  </div>
                  <div className="rounded-md border border-border p-2.5">
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className="text-sm font-semibold">{warehouseMovementSummary.net}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={warehousePage <= 1}
                    onClick={() => setWarehousePage((prev) => Math.max(1, prev - 1))}
                  >
                    Prev
                  </Button>
                  <span className="text-xs text-muted-foreground">Page {warehousePage}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!hasMoreWarehouseTransactions}
                    onClick={() => setWarehousePage((prev) => prev + 1)}
                  >
                    Next
                  </Button>
                </div>

                {warehouseTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No warehouse transactions for selected range.</p>
                ) : (
                  <div className="rounded-md border border-border overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2">Date</th>
                          <th className="text-left px-3 py-2">Type</th>
                          <th className="text-left px-3 py-2">Item</th>
                          <th className="text-right px-3 py-2">Qty</th>
                          <th className="text-left px-3 py-2">Ref</th>
                          <th className="text-left px-3 py-2">By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warehouseTransactions.map((row) => (
                          <tr key={row.id} className="border-t border-border">
                            <td className="px-3 py-2">{formatIsoDateDdMmYyyy(row.txn_date)}</td>
                            <td className="px-3 py-2">{row.txn_type}</td>
                            <td className="px-3 py-2">{row.item_en}</td>
                            <td className="px-3 py-2 text-right font-medium">{row.signed_qty > 0 ? "+" : ""}{round2(row.signed_qty)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {row.ref_type || "-"} {row.ref_id ? `· ${row.ref_id}` : ""}
                            </td>
                            <td className="px-3 py-2">{row.created_by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {!isPurchaseMode && activeView === "users" && (
          <section className="bg-card rounded-lg border border-border p-4 mb-4 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Users</h2>
            <p className="text-xs text-muted-foreground">
              Note: <code>/admin/login</code> currently uses the app config password. Admin role here is for app user records.
            </p>
            <p className="text-xs text-muted-foreground">
              Status updates apply on next login. Already logged-in users may continue until logout.
            </p>
            <form
              className="grid sm:grid-cols-5 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const trimmedName = newUserName.trim();
                const trimmedUsername = newUsername.trim();
                if (!trimmedName || !trimmedUsername || !newUserPassword.trim()) {
                  setUserSuccess("");
                  setUserError("Name, username, and password are required.");
                  return;
                }
                createAppUser.mutate({
                  name: trimmedName,
                  username: trimmedUsername,
                  password: newUserPassword,
                  role: newUserRole,
                });
              }}
            >
              <Input
                value={newUserName}
                onChange={(e) => {
                  setNewUserName(e.target.value);
                  setUserError("");
                }}
                placeholder="Name"
              />
              <Input
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  setUserError("");
                }}
                placeholder="Username"
              />
              <Input
                type="password"
                value={newUserPassword}
                onChange={(e) => {
                  setNewUserPassword(e.target.value);
                  setUserError("");
                }}
                placeholder="Password"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as "admin" | "purchase" | "sales")}
                className="h-10 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="purchase">purchase</option>
                <option value="sales">sales</option>
                <option value="admin">admin</option>
              </select>
              <Button type="submit" disabled={createAppUser.isPending}>Create</Button>
            </form>
            {userError ? <p className="text-xs text-destructive">{userError}</p> : null}
            {userSuccess ? <p className="text-xs text-emerald-700">{userSuccess}</p> : null}
            <div className="space-y-2">
              {isUsersLoading ? (
                <p className="text-sm text-muted-foreground">Loading users...</p>
              ) : usersError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 flex items-center justify-between gap-2">
                  <p className="text-sm text-destructive">
                    {(usersError as Error).message || "Could not load users."}
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={() => refetchUsers()}>
                    Retry
                  </Button>
                </div>
              ) : appUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users found.</p>
              ) : (
                appUsers.map((user) => {
                  const isTogglePending =
                    toggleAppUserStatus.isPending && pendingUserToggleId === user.id;
                  return (
                    <div key={user.id} className="rounded-md border border-border p-2.5 flex items-center justify-between gap-2">
                      <p className="text-sm">{user.name} · {user.username} · {user.role}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant={user.is_active ? "secondary" : "outline"}
                        disabled={isTogglePending}
                        onClick={() => toggleAppUserStatus.mutate({ id: user.id, isActive: !user.is_active })}
                      >
                        {isTogglePending ? "Updating..." : user.is_active ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  );
                })
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
                  <p className="text-sm font-semibold">{deliveryCounts.ready}</p>
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
                <p className="text-base font-semibold">{deliveryCounts.ready}</p>
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
                        dispatchOrder.mutate({ id: order.id })
                      }
                      onDelivered={() =>
                        updateStatus.mutate({ id: order.id, status: ORDER_STATUS.delivered })
                      }
                      onFailed={() =>
                        updateStatus.mutate({ id: order.id, status: ORDER_STATUS.failed })
                      }
                      onRetryDispatch={() =>
                        dispatchOrder.mutate({ id: order.id })
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
          <div className="mb-3 space-y-3">
            <TopTabs
              tabs={(moduleItems.find((item) => item.key === "orders")?.tabs ?? []).map((tab) => ({
                ...tab,
                badgeCount: orderStatusCounts[tab.key] || 0,
              }))}
              activePath={activeTabPath}
              onNavigate={applyPathToState}
            />
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
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
        {order.status === ORDER_STATUS.purchaseDone && (
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
                <span className="truncate inline-flex items-center gap-1.5">
                  <ItemIcon itemEn={item.en} category={item.category as "vegetables" | "herbs" | "fruits" | null} size={18} />
                  <span>{item.en}</span>
                </span>
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
                <span className="text-xs"><ItemIcon itemEn={item.en} category={item.category as "vegetables" | "herbs" | "fruits" | null} size={16} /></span>
                <span className="font-medium text-foreground inline-flex items-center gap-1.5">
                  <ItemIcon itemEn={item.en} category={item.category as "vegetables" | "herbs" | "fruits" | null} size={18} />
                  <span>{item.en}</span>
                </span>
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

      {order.status === ORDER_STATUS.purchaseDone && onDispatch && (
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
    purchase_done: "bg-sky-100 text-sky-800",
    out_for_delivery: "bg-primary/10 text-primary",
    delivered: "bg-green-100 text-green-800",
    invoiced: "bg-indigo-100 text-indigo-800",
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
