import { APP_CONFIG } from "@/config/app";
import { CATALOG } from "@/data/items";
import type { CreateOrderItem, SelectedItems } from "@/features/order/types";

const roundQty = (value: number) =>
  Math.round(value * APP_CONFIG.order.quantityPrecision) / APP_CONFIG.order.quantityPrecision;

export const nextQuantity = (current: number, delta: number) => Math.max(0, roundQty(current + delta));

export const parseQuantityInput = (value: string) => {
  const num = parseFloat(value);
  if (Number.isNaN(num) || num < 0) return 0;
  return roundQty(num);
};

export const selectedCountFromQuantities = (quantities: SelectedItems) =>
  Object.values(quantities).filter((q) => q > 0).length;

export const buildSelectedOrderItems = (quantities: SelectedItems): CreateOrderItem[] =>
  CATALOG.filter((item) => (quantities[item.code] || 0) > 0).map((item) => ({
    code: item.code,
    en: item.en,
    hi: item.hi,
    qty: quantities[item.code],
    category: item.category,
  }));

export const makeOrderRef = (dateIso: string) =>
  `${APP_CONFIG.order.orderRefPrefix}${dateIso.replaceAll("-", "").slice(2)}-${Math.floor(10000 + Math.random() * 90000)}`;
