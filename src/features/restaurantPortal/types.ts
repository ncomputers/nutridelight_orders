export type RestaurantSupportIssueType = "missing_item" | "damaged" | "quality" | "billing" | "other";
export type RestaurantSupportIssueStatus = "open" | "in_review" | "resolved";

export interface RestaurantPortalMe {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  username: string;
  expires_at: string;
}

export interface RestaurantPortalDashboard {
  today_order_ref: string | null;
  today_status: string | null;
  delivery_date: string | null;
  last_order_ref: string | null;
  open_issue_count: number;
  recent_order_count_30d: number;
}

export interface RestaurantPortalOrder {
  id: string;
  order_ref: string | null;
  order_date: string | null;
  delivery_date: string | null;
  status: string | null;
  items: Array<{ en?: string; qty?: number }> | null;
  created_at: string;
}

export interface RestaurantSupportIssue {
  id: string;
  restaurant_id: string;
  order_id: string | null;
  issue_type: RestaurantSupportIssueType;
  note: string;
  photo_data_urls: string[];
  status: RestaurantSupportIssueStatus;
  resolution_note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface RestaurantPortalLoginResult {
  session_token: string;
  expires_at: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  username: string;
}

export interface CreateSupportIssueInput {
  orderId?: string | null;
  issueType: RestaurantSupportIssueType;
  note: string;
  photoDataUrls: string[];
}
