export const restaurantPortalQueryKeys = {
  me: () => ["restaurant-portal", "me"] as const,
  dashboard: () => ["restaurant-portal", "dashboard"] as const,
  orders: () => ["restaurant-portal", "orders"] as const,
  issues: () => ["restaurant-portal", "issues"] as const,
};
