export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      orders: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          delivery_date: string | null
          id: string
          items: Json | null
          notes: string | null
          order_date: string | null
          order_ref: string | null
          restaurant_id: string | null
          restaurant_name: string | null
          restaurant_slug: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          delivery_date?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_date?: string | null
          order_ref?: string | null
          restaurant_id?: string | null
          restaurant_name?: string | null
          restaurant_slug?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          delivery_date?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_date?: string | null
          order_ref?: string | null
          restaurant_id?: string | null
          restaurant_name?: string | null
          restaurant_slug?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          password: string
          role: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          password: string
          role: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          password?: string
          role?: string
          username?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value_json: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value_json?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value_json?: Json
        }
        Relationships: []
      }
      item_availability: {
        Row: {
          id: string
          icon_url: string | null
          is_in_stock: boolean
          item_code: string | null
          item_en: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          icon_url?: string | null
          is_in_stock?: boolean
          item_code?: string | null
          item_en: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          icon_url?: string | null
          is_in_stock?: boolean
          item_code?: string | null
          item_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_code: string | null
          item_en: string
          item_hi: string | null
          order_id: string
          qty: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_code?: string | null
          item_en: string
          item_hi?: string | null
          order_id: string
          qty?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_code?: string | null
          item_en?: string
          item_hi?: string | null
          order_id?: string
          qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_plans: {
        Row: {
          adjustment_qty: number
          category: string | null
          created_at: string | null
          final_qty: number
          finalized_at: string | null
          finalized_by: string | null
          id: string
          item_code: string | null
          item_en: string
          item_hi: string | null
          line_total: number
          notes: string | null
          ordered_qty: number
          pack_count: number
          pack_size: number
          purchase_status: string
          purchased_qty: number
          purchase_date: string
          source_orders: Json | null
          unit_price: number
          updated_at: string | null
          variance_qty: number
          vendor_name: string | null
        }
        Insert: {
          adjustment_qty?: number
          category?: string | null
          created_at?: string | null
          final_qty?: number
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          item_code?: string | null
          item_en: string
          item_hi?: string | null
          line_total?: number
          notes?: string | null
          ordered_qty?: number
          pack_count?: number
          pack_size?: number
          purchase_status?: string
          purchased_qty?: number
          purchase_date: string
          source_orders?: Json | null
          unit_price?: number
          updated_at?: string | null
          variance_qty?: number
          vendor_name?: string | null
        }
        Update: {
          adjustment_qty?: number
          category?: string | null
          created_at?: string | null
          final_qty?: number
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          item_code?: string | null
          item_en?: string
          item_hi?: string | null
          line_total?: number
          notes?: string | null
          ordered_qty?: number
          pack_count?: number
          pack_size?: number
          purchase_status?: string
          purchased_qty?: number
          purchase_date?: string
          source_orders?: Json | null
          unit_price?: number
          updated_at?: string | null
          variance_qty?: number
          vendor_name?: string | null
        }
        Relationships: []
      }
      purchase_day_locks: {
        Row: {
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          purchase_date: string
          reopened_at: string | null
          reopened_by: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          purchase_date: string
          reopened_at?: string | null
          reopened_by?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          purchase_date?: string
          reopened_at?: string | null
          reopened_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_day_settings: {
        Row: {
          is_locked: boolean
          locked_at: string | null
          need_mode: string
          purchase_date: string
          reopened_at: string | null
          updated_at: string
        }
        Insert: {
          is_locked?: boolean
          locked_at?: string | null
          need_mode?: string
          purchase_date: string
          reopened_at?: string | null
          updated_at?: string
        }
        Update: {
          is_locked?: boolean
          locked_at?: string | null
          need_mode?: string
          purchase_date?: string
          reopened_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_carry_forwards: {
        Row: {
          carry_date: string
          id: string
          item_code: string
          item_en: string
          qty_remaining: number
          source_purchase_date: string
          updated_at: string
        }
        Insert: {
          carry_date: string
          id?: string
          item_code: string
          item_en: string
          qty_remaining: number
          source_purchase_date: string
          updated_at?: string
        }
        Update: {
          carry_date?: string
          id?: string
          item_code?: string
          item_en?: string
          qty_remaining?: number
          source_purchase_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_locations: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          location_type: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string
        }
        Relationships: []
      }
      stock_balances: {
        Row: {
          id: string
          item_code: string
          item_en: string
          location_id: string
          qty: number
          updated_at: string
        }
        Insert: {
          id?: string
          item_code: string
          item_en: string
          location_id: string
          qty?: number
          updated_at?: string
        }
        Update: {
          id?: string
          item_code?: string
          item_en?: string
          location_id?: string
          qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      local_store_inventory_policy: {
        Row: {
          id: string
          is_active: boolean
          item_code: string
          item_en: string
          min_qty: number
          target_qty: number
          updated_at: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          item_code: string
          item_en: string
          min_qty?: number
          target_qty?: number
          updated_at?: string
        }
        Update: {
          id?: string
          is_active?: boolean
          item_code?: string
          item_en?: string
          min_qty?: number
          target_qty?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string
          from_location_id: string
          id: string
          notes: string | null
          status: string
          to_location_id: string
          transfer_date: string
          transfer_no: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          from_location_id: string
          id?: string
          notes?: string | null
          status?: string
          to_location_id: string
          transfer_date?: string
          transfer_no: string
        }
        Update: {
          created_at?: string
          created_by?: string
          from_location_id?: string
          id?: string
          notes?: string | null
          status?: string
          to_location_id?: string
          transfer_date?: string
          transfer_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_lines: {
        Row: {
          created_at: string
          id: string
          item_code: string
          item_en: string
          qty: number
          transfer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_code: string
          item_en: string
          qty: number
          transfer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_code?: string
          item_en?: string
          qty?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_lines_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          created_at: string
          delivery_date: string
          discount_amount: number
          due_amount: number
          finalized_at: string | null
          finalized_by: string | null
          grand_total: number
          id: string
          invoice_date: string
          invoice_no: string
          notes: string | null
          other_charges: number
          paid_amount: number
          payment_status: string
          restaurant_id: string
          restaurant_name: string
          restaurant_slug: string
          status: string
          subtotal: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_date: string
          discount_amount?: number
          due_amount?: number
          finalized_at?: string | null
          finalized_by?: string | null
          grand_total?: number
          id?: string
          invoice_date: string
          invoice_no: string
          notes?: string | null
          other_charges?: number
          paid_amount?: number
          payment_status?: string
          restaurant_id: string
          restaurant_name: string
          restaurant_slug: string
          status?: string
          subtotal?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_date?: string
          discount_amount?: number
          due_amount?: number
          finalized_at?: string | null
          finalized_by?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_no?: string
          notes?: string | null
          other_charges?: number
          paid_amount?: number
          payment_status?: string
          restaurant_id?: string
          restaurant_name?: string
          restaurant_slug?: string
          status?: string
          subtotal?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_orders: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_lines: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          item_code: string | null
          item_en: string
          item_hi: string | null
          line_note: string | null
          line_total: number
          qty: number
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          item_code?: string | null
          item_en: string
          item_hi?: string | null
          line_note?: string | null
          line_total?: number
          qty?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          item_code?: string | null
          item_en?: string
          item_hi?: string | null
          line_note?: string | null
          line_total?: number
          qty?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string | null
          notes: string | null
          payment_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string | null
          notes?: string | null
          payment_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_qty: {
        Row: {
          available_qty: number
          id: string
          item_code: string
          item_en: string
          updated_at: string | null
        }
        Insert: {
          available_qty?: number
          id?: string
          item_code: string
          item_en: string
          updated_at?: string | null
        }
        Update: {
          available_qty?: number
          id?: string
          item_code?: string
          item_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_payment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_method: string
          p_notes?: string
          p_payment_date?: string
        }
        Returns: Json
      }
      create_invoice_from_order: {
        Args: { p_order_id: string }
        Returns: string
      }
      create_invoice_from_orders: {
        Args: { p_order_ids: string[] }
        Returns: string
      }
      finalize_invoice: {
        Args: { p_actor?: string; p_invoice_id: string }
        Returns: undefined
      }
      finalize_purchase: {
        Args: { p_purchase_day_id: string }
        Returns: Json
      }
      create_stock_transfer: {
        Args: {
          p_actor?: string
          p_from_location_code: string
          p_lines: Json
          p_notes?: string
          p_to_location_code: string
        }
        Returns: string
      }
      generate_carry_forward_for_day: {
        Args: { p_purchase_date: string }
        Returns: number
      }
      get_purchase_demand: {
        Args: { p_need_mode?: string; p_purchase_date: string }
        Returns: {
          carry_forward_qty: number
          gross_required_qty: number
          item_code: string
          item_en: string
          local_policy_qty: number
          main_available_qty: number
          need_mode: string
          required_qty: number
          restaurant_qty: number
        }[]
      }
      get_purchase_stock_details: {
        Args: { p_purchase_date: string }
        Returns: {
          final_qty: number
          item_code: string | null
          item_en: string
          item_hi: string | null
          line_total: number
          purchase_date: string
          purchase_status: string
          purchased_qty: number
          unit_price: number
          variance_qty: number
          vendor_name: string | null
        }[]
      }
      get_purchase_stock_history: {
        Args: { p_from_date: string; p_to_date: string }
        Returns: {
          date: string
          item_count: number
          total_amount: number
          total_purchased_qty: number
          total_required_qty: number
          total_variance_qty: number
        }[]
      }
      post_order_dispatch_out: {
        Args: { p_actor?: string; p_order_id: string }
        Returns: Json
      }
      post_warehouse_transaction: {
        Args: {
          p_created_by?: string
          p_item_code: string
          p_item_en: string
          p_notes?: string
          p_qty: number
          p_ref_id?: string
          p_ref_type?: string
          p_txn_date?: string
          p_txn_type: string
          p_unit_price?: number
        }
        Returns: Json
      }
      post_warehouse_transactions_bulk: {
        Args: {
          p_created_by?: string
          p_lines: Json
          p_notes?: string
          p_ref_id?: string
          p_ref_type?: string
          p_txn_date?: string
          p_txn_type: string
          p_unit_price?: number
        }
        Returns: Json
      }
      upsert_purchase_day_setting: {
        Args: { p_need_mode?: string; p_purchase_date: string }
        Returns: undefined
      }
      update_invoice_totals: {
        Args: { p_invoice_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
