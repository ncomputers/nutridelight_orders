import { supabase } from "@/integrations/supabase/client";
import type { CreateOrderInput, ItemAvailabilityRow, RestaurantRow } from "@/features/order/types";

export const orderRepository = {
  async getActiveRestaurantBySlug(slug: string) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id,name,slug,is_active")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as RestaurantRow | null;
  },

  async listItemAvailability() {
    const { data, error } = await supabase
      .from("item_availability")
      .select("item_code,item_en,is_in_stock,icon_url");
    if (error) throw error;
    return (data ?? []) as ItemAvailabilityRow[];
  },

  async insertOrder(input: CreateOrderInput) {
    const { error } = await supabase.from("orders").insert({
      order_ref: input.orderRef,
      restaurant_id: input.restaurant.id,
      restaurant_name: input.restaurant.name,
      restaurant_slug: input.restaurant.slug,
      contact_name: input.contactName.trim(),
      contact_phone: input.contactPhone.trim(),
      order_date: input.orderDateIso,
      delivery_date: input.deliveryDateIso,
      items: input.items,
      notes: input.notes.trim() || null,
      status: input.status,
    });
    if (error) throw error;
  },
};
