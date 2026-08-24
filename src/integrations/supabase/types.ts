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
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          status: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          status?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          order_id: string | null
          receiver_id: string
          request_id: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          order_id?: string | null
          receiver_id: string
          request_id?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          order_id?: string | null
          receiver_id?: string
          request_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          offer_id: string | null
          quantity: number
          request_id: string | null
          status: string
          supplier_id: string
          total_amount: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          offer_id?: string | null
          quantity?: number
          request_id?: string | null
          status?: string
          supplier_id: string
          total_amount?: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          offer_id?: string | null
          quantity?: number
          request_id?: string | null
          status?: string
          supplier_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "supplier_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          id: string
          max_quantity: number | null
          min_quantity: number
          product_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          max_quantity?: number | null
          min_quantity: number
          product_id: string
          unit_price: number
        }
        Update: {
          id?: string
          max_quantity?: number | null
          min_quantity?: number
          product_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_partial_package: boolean
          base_price: number
          brand: string | null
          category_id: string | null
          city: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_demo: boolean
          is_featured: boolean
          minimum_order: number
          name: string
          preparation_time: string | null
          shipping_method: string | null
          slug: string
          specs: Json
          status: string
          stock: number
          supplier_id: string
          tags: string[]
          unit: string
          units_per_package: number | null
        }
        Insert: {
          allow_partial_package?: boolean
          base_price?: number
          brand?: string | null
          category_id?: string | null
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_demo?: boolean
          is_featured?: boolean
          minimum_order?: number
          name: string
          preparation_time?: string | null
          shipping_method?: string | null
          slug: string
          specs?: Json
          status?: string
          stock?: number
          supplier_id: string
          tags?: string[]
          unit?: string
          units_per_package?: number | null
        }
        Update: {
          allow_partial_package?: boolean
          base_price?: number
          brand?: string | null
          category_id?: string | null
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_demo?: boolean
          is_featured?: boolean
          minimum_order?: number
          name?: string
          preparation_time?: string | null
          shipping_method?: string | null
          slug?: string
          specs?: Json
          status?: string
          stock?: number
          supplier_id?: string
          tags?: string[]
          unit?: string
          units_per_package?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          business_description: string | null
          business_name: string | null
          business_type: string | null
          city: string | null
          created_at: string
          full_name: string
          id: string
          mobile: string | null
          status: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          business_description?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id: string
          mobile?: string | null
          status?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          business_description?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          mobile?: string | null
          status?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          discount_percent: number
          ends_at: string
          id: string
          is_active: boolean
          is_demo: boolean
          product_id: string | null
          starts_at: string
          supplier_id: string | null
          title: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          ends_at?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          product_id?: string | null
          starts_at?: string
          supplier_id?: string | null
          title: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          ends_at?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          product_id?: string | null
          starts_at?: string
          supplier_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          product_name: string
          quantity: number
          request_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          product_name: string
          quantity: number
          request_id: string
          unit: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          product_name?: string
          quantity?: number
          request_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          buyer_id: string | null
          category_id: string | null
          created_at: string
          delivery_city: string
          description: string | null
          expires_at: string
          id: string
          image_url: string | null
          is_demo: boolean
          max_price: number | null
          min_price: number | null
          offers_count: number
          product_id: string | null
          product_name: string
          quality: string
          quantity: number
          required_date: string
          status: string
          unit: string
        }
        Insert: {
          buyer_id?: string | null
          category_id?: string | null
          created_at?: string
          delivery_city?: string
          description?: string | null
          expires_at?: string
          id?: string
          image_url?: string | null
          is_demo?: boolean
          max_price?: number | null
          min_price?: number | null
          offers_count?: number
          product_id?: string | null
          product_name: string
          quality?: string
          quantity: number
          required_date?: string
          status?: string
          unit?: string
        }
        Update: {
          buyer_id?: string | null
          category_id?: string | null
          created_at?: string
          delivery_city?: string
          description?: string | null
          expires_at?: string
          id?: string
          image_url?: string | null
          is_demo?: boolean
          max_price?: number | null
          min_price?: number | null
          offers_count?: number
          product_id?: string | null
          product_name?: string
          quality?: string
          quantity?: number
          required_date?: string
          status?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          accuracy_score: number
          buyer_id: string
          comment: string | null
          communication_score: number
          created_at: string
          delivery_score: number
          id: string
          order_id: string | null
          overall_score: number
          price_score: number
          quality_score: number
          supplier_id: string
        }
        Insert: {
          accuracy_score?: number
          buyer_id: string
          comment?: string | null
          communication_score?: number
          created_at?: string
          delivery_score?: number
          id?: string
          order_id?: string | null
          overall_score?: number
          price_score?: number
          quality_score?: number
          supplier_id: string
        }
        Update: {
          accuracy_score?: number
          buyer_id?: string
          comment?: string | null
          communication_score?: number
          created_at?: string
          delivery_score?: number
          id?: string
          order_id?: string | null
          overall_score?: number
          price_score?: number
          quality_score?: number
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_plans: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_ordered_at: string | null
          period_days: number
          product_name: string
          quantity: number
          unit: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_ordered_at?: string | null
          period_days?: number
          product_name: string
          quantity: number
          unit?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_ordered_at?: string | null
          period_days?: number
          product_name?: string
          quantity?: number
          unit?: string
        }
        Relationships: []
      }
      supplier_offers: {
        Row: {
          available_quantity: number
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          min_supply_quantity: number | null
          payment_terms: string | null
          preparation_time: string | null
          request_id: string
          shipping_cost: number
          shipping_time: string | null
          status: string
          supplier_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          available_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          min_supply_quantity?: number | null
          payment_terms?: string | null
          preparation_time?: string | null
          request_id: string
          shipping_cost?: number
          shipping_time?: string | null
          status?: string
          supplier_id: string
          total_price?: number
          unit_price: number
        }
        Update: {
          available_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          min_supply_quantity?: number | null
          payment_terms?: string | null
          preparation_time?: string | null
          request_id?: string
          shipping_cost?: number
          shipping_time?: string | null
          status?: string
          supplier_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          avg_response_hours: number
          business_type: string
          city: string
          company_name: string
          created_at: string
          deals_count: number
          description: string | null
          founded_year: number | null
          id: string
          is_demo: boolean
          last_seen_at: string | null
          logo_url: string | null
          official_invoice: boolean
          phone: string | null
          rating: number
          response_rate: number
          reviews_count: number
          slug: string | null
          supplier_score: number
          user_id: string | null
          verification_status: string
        }
        Insert: {
          address?: string | null
          avg_response_hours?: number
          business_type?: string
          city?: string
          company_name: string
          created_at?: string
          deals_count?: number
          description?: string | null
          founded_year?: number | null
          id?: string
          is_demo?: boolean
          last_seen_at?: string | null
          logo_url?: string | null
          official_invoice?: boolean
          phone?: string | null
          rating?: number
          response_rate?: number
          reviews_count?: number
          slug?: string | null
          supplier_score?: number
          user_id?: string | null
          verification_status?: string
        }
        Update: {
          address?: string | null
          avg_response_hours?: number
          business_type?: string
          city?: string
          company_name?: string
          created_at?: string
          deals_count?: number
          description?: string | null
          founded_year?: number | null
          id?: string
          is_demo?: boolean
          last_seen_at?: string | null
          logo_url?: string | null
          official_invoice?: boolean
          phone?: string | null
          rating?: number
          response_rate?: number
          reviews_count?: number
          slug?: string | null
          supplier_score?: number
          user_id?: string | null
          verification_status?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "buyer" | "supplier"
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
      app_role: ["admin", "buyer", "supplier"],
    },
  },
} as const
