export const orderQueryKeys = {
  restaurant: (slug: string | null) => ["order", "restaurant", slug] as const,
  itemAvailability: () => ["order", "item-availability"] as const,
};
