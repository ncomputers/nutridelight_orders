import { APP_CONFIG } from "@/config/app";

export interface RestaurantPortalSessionMeta {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  username: string;
  expiresAt: string;
}

export const getRestaurantPortalToken = () => localStorage.getItem(APP_CONFIG.restaurantPortal.sessionTokenKey) || "";

export const getRestaurantPortalSessionMeta = (): RestaurantPortalSessionMeta | null => {
  const raw = localStorage.getItem(APP_CONFIG.restaurantPortal.sessionMetaKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RestaurantPortalSessionMeta;
  } catch {
    return null;
  }
};

export const setRestaurantPortalSession = (token: string, meta: RestaurantPortalSessionMeta) => {
  localStorage.setItem(APP_CONFIG.restaurantPortal.sessionTokenKey, token);
  localStorage.setItem(APP_CONFIG.restaurantPortal.sessionMetaKey, JSON.stringify(meta));
};

export const clearRestaurantPortalSession = () => {
  localStorage.removeItem(APP_CONFIG.restaurantPortal.sessionTokenKey);
  localStorage.removeItem(APP_CONFIG.restaurantPortal.sessionMetaKey);
};
