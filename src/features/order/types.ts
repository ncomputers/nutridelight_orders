import type { ItemCategory } from "@/data/items";

export interface SelectedItems {
  [key: string]: number;
}

export interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean | null;
}

export interface ItemAvailabilityRow {
  item_code: string | null;
  item_en: string;
  is_in_stock: boolean;
  icon_url: string | null;
}

export interface CreateOrderItem {
  code: string;
  en: string;
  hi: string;
  qty: number;
  category: ItemCategory;
}

export interface CreateOrderInput {
  orderRef: string;
  restaurant: Pick<RestaurantRow, "id" | "name" | "slug">;
  orderDateIso: string;
  deliveryDateIso: string;
  contactName: string;
  contactPhone: string;
  notes: string;
  status: string;
  items: CreateOrderItem[];
}
