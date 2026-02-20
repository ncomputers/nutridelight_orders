export const adminQueryKeys = {
  orders: (fromDate: string, toDate: string) => ["admin", "orders", fromDate, toDate] as const,
  restaurants: () => ["admin", "restaurants"] as const,
  appUsers: () => ["admin", "app-users"] as const,
  itemAvailability: () => ["admin", "item-availability"] as const,
  purchasePlans: (dateIso: string) => ["admin", "purchase-plans", dateIso] as const,
  purchaseDemand: (dateIso: string, needMode: "net" | "gross") =>
    ["admin", "purchase-demand", dateIso, needMode] as const,
  purchaseDaySetting: (dateIso: string) => ["admin", "purchase-day-setting", dateIso] as const,
  stockQty: () => ["admin", "stock-qty"] as const,
  localStorePolicies: () => ["admin", "local-store-policies"] as const,
  purchaseDayLock: (dateIso: string) => ["admin", "purchase-day-lock", dateIso] as const,
  purchaseHistory: (fromDate: string, toDate: string) => ["admin", "purchase-history", fromDate, toDate] as const,
  purchaseStockHistory: (fromDate: string, toDate: string) => ["admin", "purchase-stock-history", fromDate, toDate] as const,
  purchaseStockDetails: (dateIso: string) => ["admin", "purchase-stock-details", dateIso] as const,
};
