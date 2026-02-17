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
      account_ledgers: {
        Row: {
          account_type: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_system: boolean
          ledger_group: string
          name: string
          updated_at: string
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          ledger_group: string
          name: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          ledger_group?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_user_ledger_map: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          ledger_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          ledger_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          ledger_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_user_ledger_map_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "account_ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_user_ledger_map_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_opening_balances: {
        Row: {
          created_at: string
          created_by: string
          id: string
          ledger_id: string
          note: string | null
          opening_cr: number
          opening_date: string
          opening_dr: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          ledger_id: string
          note?: string | null
          opening_cr?: number
          opening_date: string
          opening_dr?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          ledger_id?: string
          note?: string | null
          opening_cr?: number
          opening_date?: string
          opening_dr?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_opening_balances_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "account_ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      item_availability: {
        Row: {
          id: string
          is_in_stock: boolean
          item_code: string | null
          item_en: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          is_in_stock?: boolean
          item_code?: string | null
          item_en: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          is_in_stock?: boolean
          item_code?: string | null
          item_en?: string
          updated_at?: string | null
        }
        Relationships: []
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
      daily_settlements: {
        Row: {
          cash_extra_used: number
          cash_given_morning: number
          cash_returned_evening: number
          created_at: string
          id: string
          notes: string | null
          settlement_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cash_extra_used?: number
          cash_given_morning?: number
          cash_returned_evening?: number
          created_at?: string
          id?: string
          notes?: string | null
          settlement_date: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cash_extra_used?: number
          cash_given_morning?: number
          cash_returned_evening?: number
          created_at?: string
          id?: string
          notes?: string | null
          settlement_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          note: string | null
          person_name: string
          txn_date: string
          txn_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          person_name: string
          txn_date: string
          txn_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          person_name?: string
          txn_date?: string
          txn_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      accounts_day_closures: {
        Row: {
          close_note: string | null
          closed_at: string | null
          closed_by: string | null
          closure_date: string
          id: string
          is_closed: boolean
          reopened_at: string | null
          reopened_by: string | null
          updated_at: string
        }
        Insert: {
          close_note?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_date: string
          id?: string
          is_closed?: boolean
          reopened_at?: string | null
          reopened_by?: string | null
          updated_at?: string
        }
        Update: {
          close_note?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_date?: string
          id?: string
          is_closed?: boolean
          reopened_at?: string | null
          reopened_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      journal_vouchers: {
        Row: {
          actor_role: string | null
          created_by_user_id: string | null
          created_at: string
          id: string
          is_reversed: boolean
          narration: string | null
          posted_at: string
          posted_by: string
          reversal_of_voucher_id: string | null
          reversed_at: string | null
          reversed_by: string | null
          source_id: string | null
          source_type: string | null
          updated_at: string
          voucher_amount: number
          voucher_date: string
          voucher_no: string
          voucher_type: string
        }
        Insert: {
          actor_role?: string | null
          created_by_user_id?: string | null
          created_at?: string
          id?: string
          is_reversed?: boolean
          narration?: string | null
          posted_at?: string
          posted_by: string
          reversal_of_voucher_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          voucher_amount?: number
          voucher_date: string
          voucher_no: string
          voucher_type: string
        }
        Update: {
          actor_role?: string | null
          created_by_user_id?: string | null
          created_at?: string
          id?: string
          is_reversed?: boolean
          narration?: string | null
          posted_at?: string
          posted_by?: string
          reversal_of_voucher_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          voucher_amount?: number
          voucher_date?: string
          voucher_no?: string
          voucher_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_vouchers_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_vouchers_reversal_of_voucher_id_fkey"
            columns: ["reversal_of_voucher_id"]
            isOneToOne: false
            referencedRelation: "journal_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          cr_amount: number
          created_at: string
          dr_amount: number
          id: string
          ledger_id: string
          line_note: string | null
          voucher_id: string
        }
        Insert: {
          cr_amount?: number
          created_at?: string
          dr_amount?: number
          id?: string
          ledger_id: string
          line_note?: string | null
          voucher_id: string
        }
        Update: {
          cr_amount?: number
          created_at?: string
          dr_amount?: number
          id?: string
          ledger_id?: string
          line_note?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "account_ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "journal_vouchers"
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
          order_id: string
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
          order_id: string
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
          order_id?: string
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
            foreignKeyName: "sales_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
      [_ in never]: never
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
