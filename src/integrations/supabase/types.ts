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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assortment_gaps: {
        Row: {
          competitors: Json
          created_at: string
          demand: string
          id: string
          missed: string
          position: number
          price: number
          product: string
          searches: string
          updated_at: string
          user_id: string
        }
        Insert: {
          competitors?: Json
          created_at?: string
          demand: string
          id?: string
          missed: string
          position?: number
          price: number
          product: string
          searches: string
          updated_at?: string
          user_id: string
        }
        Update: {
          competitors?: Json
          created_at?: string
          demand?: string
          id?: string
          missed?: string
          position?: number
          price?: number
          product?: string
          searches?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      behavior_patterns: {
        Row: {
          category: string
          channel: string
          competitor: string
          confidence: number
          created_at: string
          depth: string | null
          detection_period: string
          evidence: Json
          id: string
          impact: string
          pattern: string
          position: number
          recommendation: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          channel: string
          competitor: string
          confidence: number
          created_at?: string
          depth?: string | null
          detection_period: string
          evidence?: Json
          id?: string
          impact: string
          pattern: string
          position?: number
          recommendation: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          channel?: string
          competitor?: string
          confidence?: number
          created_at?: string
          depth?: string | null
          detection_period?: string
          evidence?: Json
          id?: string
          impact?: string
          pattern?: string
          position?: number
          recommendation?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      category_performance: {
        Row: {
          avg_discount: number
          category: string
          created_at: string
          direction: string
          growth: number
          id: string
          market_position: string
          position: number
          top_mover: string
          updated_at: string
          user_id: string
          volatility: string
          volatility_pct: number
        }
        Insert: {
          avg_discount: number
          category: string
          created_at?: string
          direction: string
          growth: number
          id?: string
          market_position: string
          position?: number
          top_mover: string
          updated_at?: string
          user_id: string
          volatility: string
          volatility_pct: number
        }
        Update: {
          avg_discount?: number
          category?: string
          created_at?: string
          direction?: string
          growth?: number
          id?: string
          market_position?: string
          position?: number
          top_mover?: string
          updated_at?: string
          user_id?: string
          volatility?: string
          volatility_pct?: number
        }
        Relationships: []
      }
      competitor_metrics: {
        Row: {
          created_at: string
          footer_color: string | null
          footer_text: string | null
          id: string
          label: string
          position: number
          slug: string
          updated_at: string
          user_id: string
          value: string
          value_color: string | null
        }
        Insert: {
          created_at?: string
          footer_color?: string | null
          footer_text?: string | null
          id?: string
          label: string
          position?: number
          slug: string
          updated_at?: string
          user_id: string
          value: string
          value_color?: string | null
        }
        Update: {
          created_at?: string
          footer_color?: string | null
          footer_text?: string | null
          id?: string
          label?: string
          position?: number
          slug?: string
          updated_at?: string
          user_id?: string
          value?: string
          value_color?: string | null
        }
        Relationships: []
      }
      competitor_price_history: {
        Row: {
          amazon: number | null
          carrefour: number | null
          created_at: string
          id: string
          month_label: string
          position: number
          product: string
          talabat: number | null
          updated_at: string
          user_id: string
          you: number | null
        }
        Insert: {
          amazon?: number | null
          carrefour?: number | null
          created_at?: string
          id?: string
          month_label: string
          position?: number
          product: string
          talabat?: number | null
          updated_at?: string
          user_id: string
          you?: number | null
        }
        Update: {
          amazon?: number | null
          carrefour?: number | null
          created_at?: string
          id?: string
          month_label?: string
          position?: number
          product?: string
          talabat?: number | null
          updated_at?: string
          user_id?: string
          you?: number | null
        }
        Relationships: []
      }
      competitor_prices: {
        Row: {
          amazon: Json | null
          carrefour: Json | null
          category: string
          channel: string
          created_at: string
          id: string
          lulu: Json | null
          noon: Json | null
          position: number
          product: string
          signal: string
          talabat: Json | null
          updated_at: string
          user_id: string
          your_price: number
        }
        Insert: {
          amazon?: Json | null
          carrefour?: Json | null
          category: string
          channel: string
          created_at?: string
          id?: string
          lulu?: Json | null
          noon?: Json | null
          position?: number
          product: string
          signal: string
          talabat?: Json | null
          updated_at?: string
          user_id: string
          your_price: number
        }
        Update: {
          amazon?: Json | null
          carrefour?: Json | null
          category?: string
          channel?: string
          created_at?: string
          id?: string
          lulu?: Json | null
          noon?: Json | null
          position?: number
          product?: string
          signal?: string
          talabat?: Json | null
          updated_at?: string
          user_id?: string
          your_price?: number
        }
        Relationships: []
      }
      cross_border_radar: {
        Row: {
          created_at: string
          delivery: string
          gap: string
          id: string
          intl_price: number
          platform: string
          position: number
          product: string
          risk: string
          updated_at: string
          user_id: string
          your_price: number
        }
        Insert: {
          created_at?: string
          delivery: string
          gap: string
          id?: string
          intl_price: number
          platform: string
          position?: number
          product: string
          risk: string
          updated_at?: string
          user_id: string
          your_price: number
        }
        Update: {
          created_at?: string
          delivery?: string
          gap?: string
          id?: string
          intl_price?: number
          platform?: string
          position?: number
          product?: string
          risk?: string
          updated_at?: string
          user_id?: string
          your_price?: number
        }
        Relationships: []
      }
      field_intel_metrics: {
        Row: {
          created_at: string
          footer_color: string | null
          footer_text: string | null
          id: string
          label: string
          position: number
          slug: string
          updated_at: string
          user_id: string
          value: string
          value_color: string | null
        }
        Insert: {
          created_at?: string
          footer_color?: string | null
          footer_text?: string | null
          id?: string
          label: string
          position?: number
          slug: string
          updated_at?: string
          user_id: string
          value: string
          value_color?: string | null
        }
        Update: {
          created_at?: string
          footer_color?: string | null
          footer_text?: string | null
          id?: string
          label?: string
          position?: number
          slug?: string
          updated_at?: string
          user_id?: string
          value?: string
          value_color?: string | null
        }
        Relationships: []
      }
      field_team_activity: {
        Row: {
          agent_name: string
          created_at: string
          id: string
          observation_count: number
          position: number
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_name: string
          created_at?: string
          id?: string
          observation_count: number
          position?: number
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          id?: string
          observation_count?: number
          position?: number
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_metrics: {
        Row: {
          created_at: string
          footer_color: string | null
          footer_text: string | null
          id: string
          label: string
          position: number
          slug: string
          updated_at: string
          user_id: string
          value: string
          value_color: string | null
        }
        Insert: {
          created_at?: string
          footer_color?: string | null
          footer_text?: string | null
          id?: string
          label: string
          position?: number
          slug: string
          updated_at?: string
          user_id: string
          value: string
          value_color?: string | null
        }
        Update: {
          created_at?: string
          footer_color?: string | null
          footer_text?: string | null
          id?: string
          label?: string
          position?: number
          slug?: string
          updated_at?: string
          user_id?: string
          value?: string
          value_color?: string | null
        }
        Relationships: []
      }
      overview_alerts: {
        Row: {
          alert_type: string
          channel: string
          created_at: string
          id: string
          message: string
          occurred_at: string
          severity: string
          user_id: string
        }
        Insert: {
          alert_type: string
          channel: string
          created_at?: string
          id?: string
          message: string
          occurred_at?: string
          severity: string
          user_id: string
        }
        Update: {
          alert_type?: string
          channel?: string
          created_at?: string
          id?: string
          message?: string
          occurred_at?: string
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      overview_channels: {
        Row: {
          amount: string
          color: string
          created_at: string
          id: string
          label: string
          percent: number
          position: number
          share_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: string
          color: string
          created_at?: string
          id?: string
          label: string
          percent: number
          position?: number
          share_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: string
          color?: string
          created_at?: string
          id?: string
          label?: string
          percent?: number
          position?: number
          share_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      overview_metrics: {
        Row: {
          created_at: string
          footer_color: string | null
          footer_text: string | null
          id: string
          label: string
          position: number
          slug: string
          updated_at: string
          user_id: string
          value: string
          value_color: string | null
        }
        Insert: {
          created_at?: string
          footer_color?: string | null
          footer_text?: string | null
          id?: string
          label: string
          position?: number
          slug: string
          updated_at?: string
          user_id: string
          value: string
          value_color?: string | null
        }
        Update: {
          created_at?: string
          footer_color?: string | null
          footer_text?: string | null
          id?: string
          label?: string
          position?: number
          slug?: string
          updated_at?: string
          user_id?: string
          value?: string
          value_color?: string | null
        }
        Relationships: []
      }
      overview_quick_actions: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          link_href: string | null
          link_text: string
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          link_href?: string | null
          link_text: string
          position?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          link_href?: string | null
          link_text?: string
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_gaps: {
        Row: {
          competitor: string
          created_at: string
          direction: string
          gap: string
          id: string
          in_store_price: number
          observed: string
          online_price: number
          position: number
          product: string
          updated_at: string
          user_id: string
        }
        Insert: {
          competitor: string
          created_at?: string
          direction: string
          gap: string
          id?: string
          in_store_price: number
          observed: string
          online_price: number
          position?: number
          product: string
          updated_at?: string
          user_id: string
        }
        Update: {
          competitor?: string
          created_at?: string
          direction?: string
          gap?: string
          id?: string
          in_store_price?: number
          observed?: string
          online_price?: number
          position?: number
          product?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pricing_metrics: {
        Row: {
          created_at: string
          footer_color: string | null
          footer_text: string | null
          id: string
          label: string
          position: number
          slug: string
          updated_at: string
          user_id: string
          value: string
          value_color: string | null
        }
        Insert: {
          created_at?: string
          footer_color?: string | null
          footer_text?: string | null
          id?: string
          label: string
          position?: number
          slug: string
          updated_at?: string
          user_id: string
          value: string
          value_color?: string | null
        }
        Update: {
          created_at?: string
          footer_color?: string | null
          footer_text?: string | null
          id?: string
          label?: string
          position?: number
          slug?: string
          updated_at?: string
          user_id?: string
          value?: string
          value_color?: string | null
        }
        Relationships: []
      }
      pricing_recommendations: {
        Row: {
          category: string
          channel: string
          confidence: number
          created_at: string
          current_price: number
          id: string
          margin_impact: string
          net_monthly: string
          position: number
          product: string
          reason: string
          recommended_price: number
          unit_impact: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          channel: string
          confidence: number
          created_at?: string
          current_price: number
          id?: string
          margin_impact: string
          net_monthly: string
          position?: number
          product: string
          reason: string
          recommended_price: number
          unit_impact: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          channel?: string
          confidence?: number
          created_at?: string
          current_price?: number
          id?: string
          margin_impact?: string
          net_monthly?: string
          position?: number
          product?: string
          reason?: string
          recommended_price?: number
          unit_impact?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          position: number
          rule_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          rule_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          rule_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recent_observations: {
        Row: {
          agent: string
          condition: string
          created_at: string
          id: string
          position: number
          price: number
          product: string
          promo_detail: string | null
          status: string
          store: string
          time_label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent: string
          condition: string
          created_at?: string
          id?: string
          position?: number
          price: number
          product: string
          promo_detail?: string | null
          status: string
          store: string
          time_label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent?: string
          condition?: string
          created_at?: string
          id?: string
          position?: number
          price?: number
          product?: string
          promo_detail?: string | null
          status?: string
          store?: string
          time_label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trending_products: {
        Row: {
          category: string
          created_at: string
          growth: string
          id: string
          name: string
          position: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          growth: string
          id?: string
          name: string
          position?: number
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          growth?: string
          id?: string
          name?: string
          position?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      seed_field_intel_for_user: { Args: { uid: string }; Returns: undefined }
      seed_market_for_user: { Args: { uid: string }; Returns: undefined }
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
