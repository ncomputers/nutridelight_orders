import { supabase } from "@/integrations/supabase/client";
import type {
  CreateSupportIssueInput,
  RestaurantPortalDashboard,
  RestaurantPortalLoginResult,
  RestaurantPortalMe,
  RestaurantPortalOrder,
  RestaurantSupportIssue,
} from "@/features/restaurantPortal/types";

export const restaurantPortalRepository = {
  async login(username: string, pin: string) {
    const rpcClient = supabase as unknown as {
      rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
    const { data, error } = await rpcClient.rpc("restaurant_portal_login", {
      p_username: username,
      p_pin: pin,
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (error) throw new Error(error.message || "Invalid credentials.");
    return data as RestaurantPortalLoginResult;
  },

  async logout(sessionToken: string) {
    const rpcClient = supabase as unknown as {
      rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
    };
    const { error } = await rpcClient.rpc("restaurant_portal_logout", { p_session_token: sessionToken });
    if (error) throw new Error(error.message || "Could not logout.");
  },

  async me(sessionToken: string) {
    const rpcClient = supabase as unknown as {
      rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown[] | null; error: { message?: string } | null }>;
    };
    const { data, error } = await rpcClient.rpc("restaurant_portal_me", { p_session_token: sessionToken });
    if (error) throw new Error(error.message || "Session is invalid.");
    const row = (data ?? [])[0] as RestaurantPortalMe | undefined;
    if (!row) throw new Error("Session is invalid.");
    return row;
  },

  async getDashboard(sessionToken: string) {
    const rpcClient = supabase as unknown as {
      rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
    const { data, error } = await rpcClient.rpc("restaurant_portal_dashboard", { p_session_token: sessionToken });
    if (error) throw new Error(error.message || "Could not load dashboard.");
    return data as RestaurantPortalDashboard;
  },

  async listOrders(sessionToken: string) {
    const rpcClient = supabase as unknown as {
      rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown[] | null; error: { message?: string } | null }>;
    };
    const { data, error } = await rpcClient.rpc("restaurant_portal_list_orders", {
      p_session_token: sessionToken,
      p_limit: 10,
    });
    if (error) throw new Error(error.message || "Could not load orders.");
    return (data ?? []) as RestaurantPortalOrder[];
  },

  async listIssues(sessionToken: string) {
    const rpcClient = supabase as unknown as {
      rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown[] | null; error: { message?: string } | null }>;
    };
    const { data, error } = await rpcClient.rpc("restaurant_portal_list_support_issues", {
      p_session_token: sessionToken,
      p_limit: 20,
    });
    if (error) throw new Error(error.message || "Could not load support issues.");
    return (data ?? []) as RestaurantSupportIssue[];
  },

  async createIssue(sessionToken: string, input: CreateSupportIssueInput) {
    const rpcClient = supabase as unknown as {
      rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
    };
    const { error } = await rpcClient.rpc("restaurant_portal_create_support_issue", {
      p_session_token: sessionToken,
      p_order_id: input.orderId || null,
      p_issue_type: input.issueType,
      p_note: input.note,
      p_photo_data_urls: input.photoDataUrls,
    });
    if (error) throw new Error(error.message || "Could not create support issue.");
  },
};
