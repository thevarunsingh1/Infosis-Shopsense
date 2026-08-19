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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          change: number
          created_at: string
          id: string
          is_demo: boolean
          note: string | null
          occurred_at: string
          product_id: string
          reason: string
          vendor_id: string
        }
        Insert: {
          change: number
          created_at?: string
          id?: string
          is_demo?: boolean
          note?: string | null
          occurred_at?: string
          product_id: string
          reason?: string
          vendor_id: string
        }
        Update: {
          change?: number
          created_at?: string
          id?: string
          is_demo?: boolean
          note?: string | null
          occurred_at?: string
          product_id?: string
          reason?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      product_embeddings: {
        Row: {
          content: string
          embedding: string | null
          product_id: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          content: string
          embedding?: string | null
          product_id: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          content?: string
          embedding?: string | null
          product_id?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_embeddings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_embeddings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          analyzed_at: string | null
          author_name: string | null
          body: string
          created_at: string
          customer_id: string | null
          id: string
          is_demo: boolean
          product_id: string
          rating: number
          sentiment_label: string | null
          sentiment_score: number | null
          title: string | null
          vendor_id: string
        }
        Insert: {
          analyzed_at?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          customer_id?: string | null
          id?: string
          is_demo?: boolean
          product_id: string
          rating?: number
          sentiment_label?: string | null
          sentiment_score?: number | null
          title?: string | null
          vendor_id: string
        }
        Update: {
          analyzed_at?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          is_demo?: boolean
          product_id?: string
          rating?: number
          sentiment_label?: string | null
          sentiment_score?: number | null
          title?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_demo: boolean
          keywords: string[]
          low_stock_threshold: number
          name: string
          price: number
          seo_description: string | null
          sku: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          tags: string[]
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_demo?: boolean
          keywords?: string[]
          low_stock_threshold?: number
          name: string
          price?: number
          seo_description?: string | null
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          tags?: string[]
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_demo?: boolean
          keywords?: string[]
          low_stock_threshold?: number
          name?: string
          price?: number
          seo_description?: string | null
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          tags?: string[]
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          is_demo: boolean
          occurred_at: string
          product_id: string | null
          quantity: number
          reference: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          total_amount: number
          unit_price: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          is_demo?: boolean
          occurred_at?: string
          product_id?: string | null
          quantity?: number
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          total_amount?: number
          unit_price?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          is_demo?: boolean
          occurred_at?: string
          product_id?: string | null
          quantity?: number
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          total_amount?: number
          unit_price?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          category: string
          city: string | null
          contact_email: string
          country: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          rating: number
          status: Database["public"]["Enums"]["vendor_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string
          city?: string | null
          contact_email: string
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          rating?: number
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string
          city?: string | null
          contact_email?: string
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          rating?: number
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: {
          _delta: number
          _note?: string
          _product_id: string
          _reason?: string
        }
        Returns: number
      }
      analytics_validation: { Args: never; Returns: Json }
      customer_overview: { Args: never; Returns: Json }
      customer_segments: {
        Args: never
        Returns: {
          avg_spend: number
          customers: number
          pct: number
          revenue: number
          segment: string
        }[]
      }
      dashboard_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inventory_overview: { Args: never; Returns: Json }
      inventory_rows: {
        Args: never
        Returns: {
          category: string
          last_updated: string
          low_stock_threshold: number
          name: string
          price: number
          product_id: string
          status: string
          stock: number
          units_30d: number
          units_sold: number
          velocity: number
          vendor_name: string
        }[]
      }
      match_products: {
        Args: { _embedding: string; _exclude?: string; _limit?: number }
        Returns: {
          category: string
          image_url: string
          name: string
          price: number
          product_id: string
          similarity: number
        }[]
      }
      owns_vendor: { Args: { _vendor_id: string }; Returns: boolean }
      product_sales_history: {
        Args: { _days?: number; _product_id: string }
        Returns: {
          day: string
          revenue: number
          units: number
        }[]
      }
      revenue_by_month: {
        Args: never
        Returns: {
          month: string
          orders: number
          revenue: number
        }[]
      }
      revenue_by_vendor: {
        Args: never
        Returns: {
          orders: number
          revenue: number
          vendor_id: string
          vendor_name: string
        }[]
      }
      sales_trends: {
        Args: { _days?: number }
        Returns: {
          day: string
          orders: number
          revenue: number
          units: number
        }[]
      }
      top_products: {
        Args: { _category?: string; _limit?: number }
        Returns: {
          category: string
          image_url: string
          name: string
          orders: number
          product_id: string
          revenue: number
          units_sold: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "vendor"
      product_status: "draft" | "active" | "archived"
      transaction_status: "pending" | "completed" | "refunded" | "cancelled"
      vendor_status: "pending" | "approved" | "rejected" | "suspended"
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
      app_role: ["admin", "vendor"],
      product_status: ["draft", "active", "archived"],
      transaction_status: ["pending", "completed", "refunded", "cancelled"],
      vendor_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
