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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      anonymous_visitors: {
        Row: {
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          fingerprint: string | null
          id: string
          ip_address: string | null
          last_seen_at: string
          os: string | null
          screen_resolution: string | null
          timezone: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          os?: string | null
          screen_resolution?: string | null
          timezone?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          os?: string | null
          screen_resolution?: string | null
          timezone?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      kitchen_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      menu_cards: {
        Row: {
          description: string | null
          id: number
          image_url: string | null
          name: string | null
          price: string | null
        }
        Insert: {
          description?: string | null
          id: number
          image_url?: string | null
          name?: string | null
          price?: string | null
        }
        Update: {
          description?: string | null
          id?: number
          image_url?: string | null
          name?: string | null
          price?: string | null
        }
        Relationships: []
      }
      menu_item_views: {
        Row: {
          action: string
          category: string | null
          id: string
          item_name: string
          menu_item_id: string | null
          viewed_at: string
          visitor_id: string
        }
        Insert: {
          action: string
          category?: string | null
          id?: string
          item_name: string
          menu_item_id?: string | null
          viewed_at?: string
          visitor_id: string
        }
        Update: {
          action?: string
          category?: string | null
          id?: string
          item_name?: string
          menu_item_id?: string | null
          viewed_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_views_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          card_number: number | null
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          options: Json | null
          price: number
          published: boolean
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          card_number?: number | null
          category: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          options?: Json | null
          price: number
          published?: boolean
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          card_number?: number | null
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          options?: Json | null
          price?: number
          published?: boolean
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          extras: string | null
          id: string
          item_category: string | null
          item_name: string
          menu_item_id: string | null
          notes: string | null
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          extras?: string | null
          id?: string
          item_category?: string | null
          item_name: string
          menu_item_id?: string | null
          notes?: string | null
          order_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          extras?: string | null
          id?: string
          item_category?: string | null
          item_name?: string
          menu_item_id?: string | null
          notes?: string | null
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_location: string | null
          customer_name: string
          customer_phone: string
          extra_notes: string | null
          id: string
          ip_address: string | null
          notes: string | null
          order_number: string
          order_type: Database["public"]["Enums"]["order_type"]
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          subtotal: number
          total_amount: number
          updated_at: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_location?: string | null
          customer_name: string
          customer_phone: string
          extra_notes?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          order_number: string
          order_type?: Database["public"]["Enums"]["order_type"]
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_location?: string | null
          customer_name?: string
          customer_phone?: string
          extra_notes?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          order_number?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      page_interactions: {
        Row: {
          created_at: string
          element_selector: string | null
          element_text: string | null
          id: string
          interaction_type: string
          page_path: string
          scroll_depth: number | null
          session_id: string | null
          visitor_id: string
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          created_at?: string
          element_selector?: string | null
          element_text?: string | null
          id?: string
          interaction_type: string
          page_path: string
          scroll_depth?: number | null
          session_id?: string | null
          visitor_id: string
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          created_at?: string
          element_selector?: string | null
          element_text?: string | null
          id?: string
          interaction_type?: string
          page_path?: string
          scroll_depth?: number | null
          session_id?: string | null
          visitor_id?: string
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "page_interactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "visitor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          engagement_time: number | null
          id: string
          page_path: string
          page_title: string | null
          referrer: string | null
          scroll_depth: number | null
          session_id: string | null
          time_on_page: number | null
          viewed_at: string
          visitor_id: string
        }
        Insert: {
          engagement_time?: number | null
          id?: string
          page_path: string
          page_title?: string | null
          referrer?: string | null
          scroll_depth?: number | null
          session_id?: string | null
          time_on_page?: number | null
          viewed_at?: string
          visitor_id: string
        }
        Update: {
          engagement_time?: number | null
          id?: string
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          scroll_depth?: number | null
          session_id?: string | null
          time_on_page?: number | null
          viewed_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_views_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "visitor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          event_type: string
          id: string
          page_path: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          event_type: string
          id?: string
          page_path?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          event_type?: string
          id?: string
          page_path?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string | null
          id: string
          landing_page: string | null
          pages_viewed: number | null
          referrer: string | null
          session_end: string | null
          session_start: string
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          landing_page?: string | null
          pages_viewed?: number | null
          referrer?: string | null
          session_end?: string | null
          session_start?: string
          visitor_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          landing_page?: string | null
          pages_viewed?: number | null
          referrer?: string | null
          session_end?: string | null
          session_start?: string
          visitor_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      order_type: "dine_in" | "takeaway"
      payment_method: "card" | "cash" | "ziina" | "stripe"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
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
    Enums: {
      app_role: ["admin", "staff"],
      order_type: ["dine_in", "takeaway"],
      payment_method: ["card", "cash", "ziina", "stripe"],
      payment_status: ["pending", "paid", "failed", "refunded", "cancelled"],
    },
  },
} as const
