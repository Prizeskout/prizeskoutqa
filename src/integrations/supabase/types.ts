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
      accounts: {
        Row: {
          billing_email: string | null
          company_domain: string | null
          company_name: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          expected_volume: string | null
          live_status: string
          requested_at: string | null
          updated_at: string
          use_case: string | null
          user_id: string
        }
        Insert: {
          billing_email?: string | null
          company_domain?: string | null
          company_name?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          expected_volume?: string | null
          live_status?: string
          requested_at?: string | null
          updated_at?: string
          use_case?: string | null
          user_id: string
        }
        Update: {
          billing_email?: string | null
          company_domain?: string | null
          company_name?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          expected_volume?: string | null
          live_status?: string
          requested_at?: string | null
          updated_at?: string
          use_case?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          actions: Json
          bullets: Json
          citations: Json
          created_at: string
          generated_at: string
          headline: string
          id: string
          model: string | null
          page: string
          time_window: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          bullets?: Json
          citations?: Json
          created_at?: string
          generated_at?: string
          headline: string
          id?: string
          model?: string | null
          page: string
          time_window?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json
          bullets?: Json
          citations?: Json
          created_at?: string
          generated_at?: string
          headline?: string
          id?: string
          model?: string | null
          page?: string
          time_window?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_four: string
          last_used_at: string | null
          mode: string
          name: string
          revoked_at: string | null
          scopes: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_four: string
          last_used_at?: string | null
          mode: string
          name: string
          revoked_at?: string | null
          scopes?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_four?: string
          last_used_at?: string | null
          mode?: string
          name?: string
          revoked_at?: string | null
          scopes?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          ip: string | null
          method: string
          occurred_at: string
          path: string
          request_id: string | null
          status_code: number
          user_agent: string | null
          user_id: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          ip?: string | null
          method: string
          occurred_at?: string
          path: string
          request_id?: string | null
          status_code: number
          user_agent?: string | null
          user_id: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          ip?: string | null
          method?: string
          occurred_at?: string
          path?: string
          request_id?: string | null
          status_code?: number
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
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
      benchmarks_metrics: {
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
      competitor_product_urls: {
        Row: {
          category: string | null
          competitor: string
          created_at: string
          id: string
          product: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          category?: string | null
          competitor?: string
          created_at?: string
          id?: string
          product: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          category?: string | null
          competitor?: string
          created_at?: string
          id?: string
          product?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      competitor_scrapes: {
        Row: {
          competitor: string | null
          created_at: string
          currency: string | null
          error: string | null
          id: string
          markdown: string | null
          metadata: Json | null
          price: number | null
          product: string | null
          scraped_at: string
          status: string
          url: string
          user_id: string
        }
        Insert: {
          competitor?: string | null
          created_at?: string
          currency?: string | null
          error?: string | null
          id?: string
          markdown?: string | null
          metadata?: Json | null
          price?: number | null
          product?: string | null
          scraped_at?: string
          status?: string
          url: string
          user_id: string
        }
        Update: {
          competitor?: string | null
          created_at?: string
          currency?: string | null
          error?: string | null
          id?: string
          markdown?: string | null
          metadata?: Json | null
          price?: number | null
          product?: string | null
          scraped_at?: string
          status?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          user_agent: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          user_agent?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          user_agent?: string | null
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
      market_benchmarks: {
        Row: {
          created_at: string
          id: string
          market_avg: number
          market_avg_display: string
          metric: string
          position: number
          top: number
          top_display: string
          updated_at: string
          user_id: string
          you: number
          you_display: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_avg: number
          market_avg_display: string
          metric: string
          position?: number
          top: number
          top_display: string
          updated_at?: string
          user_id: string
          you: number
          you_display: string
        }
        Update: {
          created_at?: string
          id?: string
          market_avg?: number
          market_avg_display?: string
          metric?: string
          position?: number
          top?: number
          top_display?: string
          updated_at?: string
          user_id?: string
          you?: number
          you_display?: string
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
      model_knowledge: {
        Row: {
          body: string
          created_at: string
          id: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      model_maturity: {
        Row: {
          accuracy: number | null
          created_at: string
          id: string
          kind: string
          month_label: string | null
          position: number
          stat_color: string | null
          stat_label: string | null
          stat_sub: string | null
          stat_value: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          id?: string
          kind: string
          month_label?: string | null
          position?: number
          stat_color?: string | null
          stat_label?: string | null
          stat_sub?: string | null
          stat_value?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          id?: string
          kind?: string
          month_label?: string | null
          position?: number
          stat_color?: string | null
          stat_label?: string | null
          stat_sub?: string | null
          stat_value?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      network_value: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
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
      past_campaigns: {
        Row: {
          cannibalized: string
          created_at: string
          discount: string
          id: string
          incremental_gmv: string
          name: string
          position: number
          roi: number
          total_gmv: string
          updated_at: string
          user_id: string
          verdict: string
        }
        Insert: {
          cannibalized: string
          created_at?: string
          discount: string
          id?: string
          incremental_gmv: string
          name: string
          position?: number
          roi: number
          total_gmv: string
          updated_at?: string
          user_id: string
          verdict: string
        }
        Update: {
          cannibalized?: string
          created_at?: string
          discount?: string
          id?: string
          incremental_gmv?: string
          name?: string
          position?: number
          roi?: number
          total_gmv?: string
          updated_at?: string
          user_id?: string
          verdict?: string
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
      pricing_decisions: {
        Row: {
          category: string
          channel: string
          created_at: string
          current_price: number
          decision: string
          expected_net_monthly: string | null
          id: string
          note: string | null
          product: string
          recommendation_id: string
          recommended_price: number
          snooze_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          channel: string
          created_at?: string
          current_price: number
          decision: string
          expected_net_monthly?: string | null
          id?: string
          note?: string | null
          product: string
          recommendation_id: string
          recommended_price: number
          snooze_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          channel?: string
          created_at?: string
          current_price?: number
          decision?: string
          expected_net_monthly?: string | null
          id?: string
          note?: string | null
          product?: string
          recommendation_id?: string
          recommended_price?: number
          snooze_until?: string | null
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
          source: string
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
          source?: string
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
          source?: string
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
      promotion_calendar: {
        Row: {
          campaign: string
          categories: string
          channel: string
          competitor: string
          created_at: string
          dates: string
          depth: string
          duration: string
          id: string
          position: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign: string
          categories: string
          channel: string
          competitor: string
          created_at?: string
          dates: string
          depth: string
          duration: string
          id?: string
          position?: number
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign?: string
          categories?: string
          channel?: string
          competitor?: string
          created_at?: string
          dates?: string
          depth?: string
          duration?: string
          id?: string
          position?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotions_metrics: {
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
      promotions_scenarios: {
        Row: {
          cannibalization_pct: number
          category: string
          channel: string
          created_at: string
          depth: string
          duration: string
          gmv_uplift: number
          healthy: boolean
          id: string
          incremental_orders: number
          is_baseline: boolean
          net_roi: number
          simulated_at: string
          user_id: string
        }
        Insert: {
          cannibalization_pct: number
          category: string
          channel: string
          created_at?: string
          depth: string
          duration: string
          gmv_uplift: number
          healthy: boolean
          id?: string
          incremental_orders: number
          is_baseline?: boolean
          net_roi: number
          simulated_at?: string
          user_id: string
        }
        Update: {
          cannibalization_pct?: number
          category?: string
          channel?: string
          created_at?: string
          depth?: string
          duration?: string
          gmv_uplift?: number
          healthy?: boolean
          id?: string
          incremental_orders?: number
          is_baseline?: boolean
          net_roi?: number
          simulated_at?: string
          user_id?: string
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
      roi_model_categories: {
        Row: {
          avg_order_value: number
          base_margin: number
          baseline_daily_orders: number
          cannibalization_base: number
          category: string
          created_at: string
          elasticity: number
          id: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_order_value: number
          base_margin: number
          baseline_daily_orders: number
          cannibalization_base: number
          category: string
          created_at?: string
          elasticity: number
          id?: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_order_value?: number
          base_margin?: number
          baseline_daily_orders?: number
          cannibalization_base?: number
          category?: string
          created_at?: string
          elasticity?: number
          id?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      switching_cost: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      timing_insights: {
        Row: {
          body: string
          created_at: string
          id: string
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          position?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
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
      usage_events: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          id: string
          occurred_at: string
          units: number
          user_id: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          occurred_at?: string
          units?: number
          user_id: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          occurred_at?: string
          units?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      user_account_settings: {
        Row: {
          company_name: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          industry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          industry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          industry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_settings: {
        Row: {
          enabled: boolean
          pref_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          pref_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          pref_key?: string
          updated_at?: string
          user_id?: string
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
      webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          delivered_at: string
          duration_ms: number | null
          endpoint_id: string
          error: string | null
          event_type: string
          id: string
          max_attempts: number
          next_retry_at: string | null
          payload: Json | null
          payload_preview: string | null
          response_body: string | null
          status_code: number | null
          success: boolean
          user_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          delivered_at?: string
          duration_ms?: number | null
          endpoint_id: string
          error?: string | null
          event_type: string
          id?: string
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json | null
          payload_preview?: string | null
          response_body?: string | null
          status_code?: number | null
          success?: boolean
          user_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          delivered_at?: string
          duration_ms?: number | null
          endpoint_id?: string
          error?: string | null
          event_type?: string
          id?: string
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json | null
          payload_preview?: string | null
          response_body?: string | null
          status_code?: number | null
          success?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          backoff_seconds: number
          created_at: string
          description: string | null
          enabled: boolean
          events: Json
          id: string
          last_delivery_at: string | null
          last_delivery_success: boolean | null
          max_attempts: number
          signing_secret: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          backoff_seconds?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          events?: Json
          id?: string
          last_delivery_at?: string | null
          last_delivery_success?: boolean | null
          max_attempts?: number
          signing_secret: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          backoff_seconds?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          events?: Json
          id?: string
          last_delivery_at?: string | null
          last_delivery_success?: boolean | null
          max_attempts?: number
          signing_secret?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_account_for_user: { Args: { uid: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      seed_benchmarks_for_user: { Args: { uid: string }; Returns: undefined }
      seed_competitor_urls_for_user: {
        Args: { uid: string }
        Returns: undefined
      }
      seed_field_intel_for_user: { Args: { uid: string }; Returns: undefined }
      seed_market_for_user: { Args: { uid: string }; Returns: undefined }
      seed_promotions_for_user: { Args: { uid: string }; Returns: undefined }
      seed_roi_model_for_user: { Args: { uid: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
