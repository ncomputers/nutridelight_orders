const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const APP_CONFIG = {
  brand: {
    name: "NUTRIDELIGHT",
    icon: "🥬",
  },
  admin: {
    sessionKey: "fs_admin",
    sessionValue: "1",
    password: import.meta.env.VITE_ADMIN_PASSWORD || "admin123",
    pollIntervalMs: toNumber(import.meta.env.VITE_ADMIN_POLL_INTERVAL_MS, 15000),
  },
  purchase: {
    sessionKey: "fs_purchase",
    sessionValue: "1",
    userKey: "fs_purchase_user",
  },
  restaurantPortal: {
    sessionTokenKey: "fs_restaurant_portal_token",
    sessionMetaKey: "fs_restaurant_portal_meta",
    sessionDays: 30,
  },
  order: {
    defaultStatus: "pending",
    quantityIncreaseStepKg: 1,
    quantityDecreaseStepKg: 0.5,
    quantityInputStepKg: 0.5,
    quantityPrecision: 10,
    maxNotesLength: 300,
    orderRefPrefix: "ORD-",
    orderRefDigits: 6,
    warningBannerText: "⏰ Orders close at 11:00 PM · Next-day delivery only",
    disclaimerText:
      "⚠️ This is an order request, not a confirmed order. Final supply is subject to availability and same-day mandi rates. No payment is collected here. Our team will confirm by 7:00 AM.",
    successTitle: "Order Received!",
    successDescription: "We will confirm availability and rates by 7:00 AM.",
    successWarningText: "⚠️ This is NOT a confirmed order. Subject to availability.",
    outOfStockDisplay: "disable" as "disable" | "hide",
  },
} as const;

export const ORDER_STATUS = {
  pending: "pending",
  confirmed: "confirmed",
  purchaseDone: "purchase_done",
  outForDelivery: "out_for_delivery",
  delivered: "delivered",
  invoiced: "invoiced",
  failed: "failed",
  rejected: "rejected",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
