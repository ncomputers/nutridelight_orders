export interface NavigationTabItem {
  key: string;
  label: string;
  path: string;
  show: boolean;
}

export interface NavigationModuleItem {
  key: string;
  label: string;
  path: string;
  show: boolean;
  tabs?: NavigationTabItem[];
}

export const navigation: NavigationModuleItem[] = [
  {
    key: "orders",
    label: "Orders",
    path: "/orders",
    show: true,
    tabs: [
      { key: "pending", label: "Pending", path: "/orders?tab=pending", show: true },
      { key: "confirmed", label: "Confirmed", path: "/orders?tab=confirmed", show: true },
      { key: "purchase_done", label: "Purchase Done", path: "/orders?tab=purchase_done", show: true },
      { key: "invoiced", label: "Invoiced", path: "/orders?tab=invoiced", show: true },
      { key: "rejected", label: "Rejected", path: "/orders?tab=rejected", show: true },
    ],
  },
  {
    key: "delivery",
    label: "Delivery",
    path: "/delivery",
    show: true,
    tabs: [],
  },
  {
    key: "sales",
    label: "Sales",
    path: "/sales",
    show: true,
    tabs: [
      { key: "invoices", label: "Invoices", path: "/sales", show: true },
      { key: "create", label: "Create", path: "/sales/create", show: true },
      { key: "payments", label: "Payments", path: "/sales/payments", show: true },
    ],
  },
  {
    key: "purchase",
    label: "Purchase",
    path: "/purchase",
    show: true,
    tabs: [
      { key: "plan", label: "Plan", path: "/purchase", show: true },
      { key: "buy", label: "Buy", path: "/purchase/buy", show: true },
      { key: "finalized", label: "Finalized", path: "/purchase/finalized", show: true },
      { key: "stock", label: "Stock Impact", path: "/purchase/stock", show: true },
    ],
  },
  {
    key: "restaurants",
    label: "Page Links / QR",
    path: "/restaurants",
    show: true,
    tabs: [],
  },
  {
    key: "stock",
    label: "Stock",
    path: "/stock",
    show: true,
    tabs: [],
  },
  {
    key: "users",
    label: "Users",
    path: "/users",
    show: true,
    tabs: [],
  },
];
