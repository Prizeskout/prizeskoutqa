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
      accounts_v2: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_default: boolean
          licensee_id: string
          metadata: Json
          name: string
          region: string | null
          slug: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_default?: boolean
          licensee_id: string
          metadata?: Json
          name: string
          region?: string | null
          slug: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_default?: boolean
          licensee_id?: string
          metadata?: Json
          name?: string
          region?: string | null
          slug?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_v2_licensee_id_fkey"
            columns: ["licensee_id"]
            isOneToOne: false
            referencedRelation: "licensees"
            referencedColumns: ["id"]
          },
        ]
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
          licensee_id: string
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
          licensee_id: string
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
          licensee_id?: string
          mode?: string
          name?: string
          revoked_at?: string | null
          scopes?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_licensee_id_fkey"
            columns: ["licensee_id"]
            isOneToOne: false
            referencedRelation: "licensees"
            referencedColumns: ["id"]
          },
        ]
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
      catalog_prices: {
        Row: {
          account_id: string
          channel: string
          created_at: string
          currency: string
          effective_at: string
          id: string
          licensee_id: string
          list_price: number
          product_id: string
          sale_price: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          channel: string
          created_at?: string
          currency?: string
          effective_at?: string
          id?: string
          licensee_id: string
          list_price: number
          product_id: string
          sale_price?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          channel?: string
          created_at?: string
          currency?: string
          effective_at?: string
          id?: string
          licensee_id?: string
          list_price?: number
          product_id?: string
          sale_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_prices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_prices_licensee_id_fkey"
            columns: ["licensee_id"]
            isOneToOne: false
            referencedRelation: "licensees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_products: {
        Row: {
          account_id: string
          attributes: Json
          brand: string | null
          category: string | null
          created_at: string
          id: string
          licensee_id: string
          name: string
          sku: string
          updated_at: string
        }
        Insert: {
          account_id: string
          attributes?: Json
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          licensee_id: string
          name: string
          sku: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          attributes?: Json
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          licensee_id?: string
          name?: string
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_products_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_products_licensee_id_fkey"
            columns: ["licensee_id"]
            isOneToOne: false
            referencedRelation: "licensees"
            referencedColumns: ["id"]
          },
        ]
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
      competitor_url_cache: {
        Row: {
          normalized_url: string
          raw_url_sample: string
          last_price: number | null
          currency: string | null
          last_scraped_at: string | null
          last_status: string | null
          consecutive_unchanged: number
          needs_stealth: boolean
          watcher_count: number
          required_freshness_sec: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          normalized_url: string
          raw_url_sample: string
          last_price?: number | null
          currency?: string | null
          last_scraped_at?: string | null
          last_status?: string | null
          consecutive_unchanged?: number
          needs_stealth?: boolean
          watcher_count?: number
          required_freshness_sec?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          normalized_url?: string
          raw_url_sample?: string
          last_price?: number | null
          currency?: string | null
          last_scraped_at?: string | null
          last_status?: string | null
          consecutive_unchanged?: number
          needs_stealth?: boolean
          watcher_count?: number
          required_freshness_sec?: number | null
          created_at?: string
          updated_at?: string
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
      dynprice_decisions: {
        Row: {
          account_id: string
          api_key_id: string | null
          channel: string
          created_at: string
          decided_at: string
          id: string
          input_competitor_min: number | null
          input_current_price: number | null
          input_margin_floor: number | null
          licensee_id: string
          output_price: number
          product_id: string | null
          reason: string
          signals: Json
        }
        Insert: {
          account_id: string
          api_key_id?: string | null
          channel: string
          created_at?: string
          decided_at?: string
          id?: string
          input_competitor_min?: number | null
          input_current_price?: number | null
          input_margin_floor?: number | null
          licensee_id: string
          output_price: number
          product_id?: string | null
          reason: string
          signals?: Json
        }
        Update: {
          account_id?: string
          api_key_id?: string | null
          channel?: string
          created_at?: string
          decided_at?: string
          id?: string
          input_competitor_min?: number | null
          input_current_price?: number | null
          input_margin_floor?: number | null
          licensee_id?: string
          output_price?: number
          product_id?: string | null
          reason?: string
          signals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dynprice_decisions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynprice_decisions_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynprice_decisions_licensee_id_fkey"
            columns: ["licensee_id"]
            isOneToOne: false
            referencedRelation: "licensees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynprice_decisions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      embed_configs: {
        Row: {
          id: string
          licensee_id: string
          account_id: string
          brand_name: string
          primary_color: string
          logo_url: string | null
          powered_by_visible: boolean
          signing_key_hex: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          licensee_id: string
          account_id: string
          brand_name: string
          primary_color?: string
          logo_url?: string | null
          powered_by_visible?: boolean
          signing_key_hex?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          licensee_id?: string
          account_id?: string
          brand_name?: string
          primary_color?: string
          logo_url?: string | null
          powered_by_visible?: boolean
          signing_key_hex?: string
          created_at?: string
          updated_at?: string
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
      ingestion_batches: {
        Row: {
          account_id: string
          api_key_id: string | null
          created_at: string
          endpoint: string
          error_count: number
          id: string
          idempotency_key: string
          item_count: number
          licensee_id: string
          ok_count: number
          request_body: Json
          response_body: Json
          response_status: number
        }
        Insert: {
          account_id: string
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          error_count?: number
          id?: string
          idempotency_key: string
          item_count?: number
          licensee_id: string
          ok_count?: number
          request_body?: Json
          response_body?: Json
          response_status: number
        }
        Update: {
          account_id?: string
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          error_count?: number
          id?: string
          idempotency_key?: string
          item_count?: number
          licensee_id?: string
          ok_count?: number
          request_body?: Json
          response_body?: Json
          response_status?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_batches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_batches_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_batches_licensee_id_fkey"
            columns: ["licensee_id"]
            isOneToOne: false
            referencedRelation: "licensees"
            referencedColumns: ["id"]
          },
        ]
      }
      licensee_applications: {
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
      licensee_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          licensee_id: string
          role: Database["public"]["Enums"]["licensee_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          licensee_id: string
          role?: Database["public"]["Enums"]["licensee_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          licensee_id?: string
          role?: Database["public"]["Enums"]["licensee_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "licensee_members_licensee_id_fkey"
            columns: ["licensee_id"]
            isOneToOne: false
            referencedRelation: "licensees"
            referencedColumns: ["id"]
          },
        ]
      }
      licensees: {
        Row: {
          billing_email: string | null
          contact_email: string | null
          created_at: string
          id: string
          metadata: Json
          name: string
          slug: string
          status: string
          updated_at: string
          white_label: Json
        }
        Insert: {
          billing_email?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          slug: string
          status?: string
          updated_at?: string
          white_label?: Json
        }
        Update: {
          billing_email?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          slug?: string
          status?: string
          updated_at?: string
          white_label?: Json
        }
        Relationships: []
      }
      margin_inputs: {
        Row: {
          account_id: string
          created_at: string
          currency: string
          duty_pct: number
          effective_at: string
          fees_pct: number
          freight: number
          id: string
          licensee_id: string
          product_id: string
          supplier: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          currency?: string
          duty_pct?: number
          effective_at?: string
          fees_pct?: number
          freight?: number
          id?: string
          licensee_id: string
          product_id: string
          supplier?: string | null
          unit_cost: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          currency?: string
          duty_pct?: number
          effective_at?: string
          fees_pct?: number
          freight?: number
          id?: string
          licensee_id?: string
          product_id?: string
          supplier?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "margin_inputs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "margin_inputs_licensee_id_fkey"
            columns: ["licensee_id"]
            isOneToOne: false
            referencedRelation: "licensees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "margin_inputs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
        ]
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
      map_agreements: {
        Row: {
          id: string
          account_id: string
          licensee_id: string
          created_by_user_id: string
          sku: string
          map_price: number
          currency: string
          effective_from: string
          effective_to: string | null
          retailer_list: Json
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          licensee_id: string
          created_by_user_id: string
          sku: string
          map_price: number
          currency?: string
          effective_from?: string
          effective_to?: string | null
          retailer_list?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          licensee_id?: string
          created_by_user_id?: string
          sku?: string
          map_price?: number
          currency?: string
          effective_from?: string
          effective_to?: string | null
          retailer_list?: Json
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      map_violations: {
        Row: {
          id: string
          account_id: string
          agreement_id: string | null
          sku: string
          retailer: string
          retailer_url: string | null
          map_price: number
          detected_price: number
          currency: string
          violation_pct: number
          evidence_path: string | null
          evidence_url: string | null
          scrape_source: string
          scrape_markdown: string | null
          first_detected_at: string
        }
        Insert: {
          id?: string
          account_id: string
          agreement_id?: string | null
          sku: string
          retailer: string
          retailer_url?: string | null
          map_price: number
          detected_price: number
          currency?: string
          violation_pct: number
          evidence_path?: string | null
          evidence_url?: string | null
          scrape_source?: string
          scrape_markdown?: string | null
          first_detected_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          agreement_id?: string | null
          sku?: string
          retailer?: string
          retailer_url?: string | null
          map_price?: number
          detected_price?: number
          currency?: string
          violation_pct?: number
          evidence_path?: string | null
          evidence_url?: string | null
          scrape_source?: string
          scrape_markdown?: string | null
          first_detected_at?: string
        }
        Relationships: []
      }
      merchants: {
        Row: {
          account_id: string
          category: string | null
          channel: string | null
          country: string | null
          created_at: string
          external_id: string | null
          id: string
          licensee_id: string
          metadata: Json
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          category?: string | null
          channel?: string | null
          country?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          licensee_id: string
          metadata?: Json
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          category?: string | null
          channel?: string | null
          country?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          licensee_id?: string
          metadata?: Json
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchants_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchants_licensee_id_fkey"
            columns: ["licensee_id"]
            isOneToOne: false
            referencedRelation: "licensees"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          link_to: string | null
          metadata: Json
          read_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          id?: string
          link_to?: string | null
          metadata?: Json
          read_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link_to?: string | null
          metadata?: Json
          read_at?: string | null
          severity?: string
          title?: string
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
      scrape_cost_log: {
        Row: {
          id: string
          run_id: string
          run_at: string
          due_urls: number
          cache_hit_urls: number
          scrapes_performed: number
          scrapes_saved: number
          ok: number
          null_price: number
          failed: number
          watchers_notified: number
        }
        Insert: {
          id?: string
          run_id: string
          run_at?: string
          due_urls?: number
          cache_hit_urls?: number
          scrapes_performed?: number
          scrapes_saved?: number
          ok?: number
          null_price?: number
          failed?: number
          watchers_notified?: number
        }
        Update: {
          id?: string
          run_id?: string
          run_at?: string
          due_urls?: number
          cache_hit_urls?: number
          scrapes_performed?: number
          scrapes_saved?: number
          ok?: number
          null_price?: number
          failed?: number
          watchers_notified?: number
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
      channel_cost_structures: {
        Row: {
          id: string
          account_id: string
          licensee_id: string
          channel: string
          commission_pct: number
          delivery_cost: number
          payment_pct: number
          returns_provision: number
          currency: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          licensee_id: string
          channel: string
          commission_pct?: number
          delivery_cost?: number
          payment_pct?: number
          returns_provision?: number
          currency?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          licensee_id?: string
          channel?: string
          commission_pct?: number
          delivery_cost?: number
          payment_pct?: number
          returns_provision?: number
          currency?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      dynprice_configs: {
        Row: {
          id: string
          account_id: string
          licensee_id: string
          sku: string
          channel: string
          base_price: number
          min_margin_pct: number
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          licensee_id: string
          sku: string
          channel?: string
          base_price: number
          min_margin_pct?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          licensee_id?: string
          sku?: string
          channel?: string
          base_price?: number
          min_margin_pct?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      dynprice_floor_overrides: {
        Row: {
          id: string
          account_id: string
          licensee_id: string
          sku: string
          channel: string
          rule_id: string | null
          rule_name: string | null
          min_margin_pct: number
          proposed_price: number
          floor_price: number
          final_price: number
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          licensee_id: string
          sku: string
          channel: string
          rule_id?: string | null
          rule_name?: string | null
          min_margin_pct: number
          proposed_price: number
          floor_price: number
          final_price: number
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          licensee_id?: string
          sku?: string
          channel?: string
          rule_id?: string | null
          rule_name?: string | null
          min_margin_pct?: number
          proposed_price?: number
          floor_price?: number
          final_price?: number
          created_at?: string
        }
        Relationships: []
      }
      dynprice_rules: {
        Row: {
          id: string
          account_id: string
          licensee_id: string
          sku: string
          channel: string
          rule_type: string
          name: string
          priority: number
          adjustment_pct: number
          config: Json
          enabled: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          licensee_id: string
          sku: string
          channel?: string
          rule_type: string
          name: string
          priority?: number
          adjustment_pct: number
          config?: Json
          enabled?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          licensee_id?: string
          sku?: string
          channel?: string
          rule_type?: string
          name?: string
          priority?: number
          adjustment_pct?: number
          config?: Json
          enabled?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      flash_events: {
        Row: {
          id: string
          account_id: string
          licensee_id: string
          created_by_user_id: string
          name: string
          skus: string[]
          discount_config: Json
          channel_scope: string
          start_at: string
          end_at: string
          status: string
          inventory_reserve: number | null
          auto_restore: boolean
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          licensee_id: string
          created_by_user_id: string
          name: string
          skus: string[]
          discount_config: Json
          channel_scope?: string
          start_at: string
          end_at: string
          status?: string
          inventory_reserve?: number | null
          auto_restore?: boolean
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          licensee_id?: string
          created_by_user_id?: string
          name?: string
          skus?: string[]
          discount_config?: Json
          channel_scope?: string
          start_at?: string
          end_at?: string
          status?: string
          inventory_reserve?: number | null
          auto_restore?: boolean
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      flash_event_skus: {
        Row: {
          id: string
          flash_event_id: string
          sku: string
          product_id: string | null
          original_price: number | null
          flash_price: number | null
          floor_price: number | null
          channel: string
          channel_push_status: string
          units_sold: number | null
          created_at: string
        }
        Insert: {
          id?: string
          flash_event_id: string
          sku: string
          product_id?: string | null
          original_price?: number | null
          flash_price?: number | null
          floor_price?: number | null
          channel?: string
          channel_push_status?: string
          units_sold?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          flash_event_id?: string
          sku?: string
          product_id?: string | null
          original_price?: number | null
          flash_price?: number | null
          floor_price?: number | null
          channel?: string
          channel_push_status?: string
          units_sold?: number | null
          created_at?: string
        }
        Relationships: []
      }
      fx_rates_cache: {
        Row: {
          id: string
          base: string
          rates: Json
          source_url: string | null
          fetched_at: string
        }
        Insert: {
          id?: string
          base?: string
          rates: Json
          source_url?: string | null
          fetched_at?: string
        }
        Update: {
          id?: string
          base?: string
          rates?: Json
          source_url?: string | null
          fetched_at?: string
        }
        Relationships: []
      }
      gcc_country_configs: {
        Row: {
          id: string
          country_code: string
          country_name: string
          currency_code: string
          vat_pct: number
          default_import_duty_pct: number
          logistics_cost_qar: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          country_code: string
          country_name: string
          currency_code: string
          vat_pct?: number
          default_import_duty_pct?: number
          logistics_cost_qar?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          country_code?: string
          country_name?: string
          currency_code?: string
          vat_pct?: number
          default_import_duty_pct?: number
          logistics_cost_qar?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      gcc_event_calendar: {
        Row: {
          id: string
          event_type: string
          name: string
          region: string
          starts_at: string
          ends_at: string
          year: number
          is_approximate: boolean
          created_by_licensee_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          name: string
          region?: string
          starts_at: string
          ends_at: string
          year: number
          is_approximate?: boolean
          created_by_licensee_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          name?: string
          region?: string
          starts_at?: string
          ends_at?: string
          year?: number
          is_approximate?: boolean
          created_by_licensee_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      group_campaigns: {
        Row: {
          id: string
          account_id: string
          licensee_id: string
          sku: string
          channel: string
          base_price: number
          tiers: Json
          min_margin_pct: number
          expiry_at: string
          status: string
          invite_mechanic: string
          family_config: Json | null
          current_buyers: number
          current_tier_idx: number
          locked_price: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          licensee_id: string
          sku: string
          channel?: string
          base_price: number
          tiers: Json
          min_margin_pct?: number
          expiry_at: string
          status?: string
          invite_mechanic?: string
          family_config?: Json | null
          current_buyers?: number
          current_tier_idx?: number
          locked_price?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          licensee_id?: string
          sku?: string
          channel?: string
          base_price?: number
          tiers?: Json
          min_margin_pct?: number
          expiry_at?: string
          status?: string
          invite_mechanic?: string
          family_config?: Json | null
          current_buyers?: number
          current_tier_idx?: number
          locked_price?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_buyers: {
        Row: {
          id: string
          campaign_id: string
          account_id: string
          buyer_id: string
          buyer_name: string | null
          phone: string | null
          status: string
          locked_price: number | null
          joined_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          account_id: string
          buyer_id: string
          buyer_name?: string | null
          phone?: string | null
          status?: string
          locked_price?: number | null
          joined_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          account_id?: string
          buyer_id?: string
          buyer_name?: string | null
          phone?: string | null
          status?: string
          locked_price?: number | null
          joined_at?: string
        }
        Relationships: []
      }
      loyalty_ab_assignments: {
        Row: {
          id: string
          account_id: string
          customer_id: string
          sku: string
          channel: string
          segment_id: string | null
          variant: string
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          customer_id: string
          sku: string
          channel?: string
          segment_id?: string | null
          variant: string
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          customer_id?: string
          sku?: string
          channel?: string
          segment_id?: string | null
          variant?: string
          created_at?: string
        }
        Relationships: []
      }
      loyalty_outcomes: {
        Row: {
          id: string
          account_id: string
          assignment_id: string | null
          customer_id: string
          sku: string
          channel: string
          variant: string
          segment_id: string | null
          purchased: boolean
          price_paid: number | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          assignment_id?: string | null
          customer_id: string
          sku: string
          channel?: string
          variant: string
          segment_id?: string | null
          purchased?: boolean
          price_paid?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          assignment_id?: string | null
          customer_id?: string
          sku?: string
          channel?: string
          variant?: string
          segment_id?: string | null
          purchased?: boolean
          price_paid?: number | null
          created_at?: string
        }
        Relationships: []
      }
      loyalty_segments: {
        Row: {
          id: string
          account_id: string
          licensee_id: string
          name: string
          display_label: string
          pricing_rule_type: string
          rule_value: number
          gcc_program: string | null
          valid_from: string | null
          valid_to: string | null
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          licensee_id: string
          name: string
          display_label: string
          pricing_rule_type: string
          rule_value: number
          gcc_program?: string | null
          valid_from?: string | null
          valid_to?: string | null
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          licensee_id?: string
          name?: string
          display_label?: string
          pricing_rule_type?: string
          rule_value?: number
          gcc_program?: string | null
          valid_from?: string | null
          valid_to?: string | null
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      parity_rules: {
        Row: {
          id: string
          account_id: string
          licensee_id: string
          name: string
          source_country: string
          target_country: string
          sku: string | null
          min_ratio: number
          max_ratio: number
          grey_market_threshold_pct: number
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          licensee_id: string
          name: string
          source_country: string
          target_country: string
          sku?: string | null
          min_ratio?: number
          max_ratio?: number
          grey_market_threshold_pct?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          licensee_id?: string
          name?: string
          source_country?: string
          target_country?: string
          sku?: string | null
          min_ratio?: number
          max_ratio?: number
          grey_market_threshold_pct?: number
          enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      parity_violations: {
        Row: {
          id: string
          account_id: string
          sku: string
          rule_id: string | null
          rule_name: string | null
          source_country: string
          target_country: string
          source_price_qar: number | null
          target_price_qar: number | null
          actual_ratio: number | null
          min_ratio: number | null
          max_ratio: number | null
          violation_type: string
          evidence: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          sku: string
          rule_id?: string | null
          rule_name?: string | null
          source_country: string
          target_country: string
          source_price_qar?: number | null
          target_price_qar?: number | null
          actual_ratio?: number | null
          min_ratio?: number | null
          max_ratio?: number | null
          violation_type: string
          evidence?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          sku?: string
          rule_id?: string | null
          rule_name?: string | null
          source_country?: string
          target_country?: string
          source_price_qar?: number | null
          target_price_qar?: number | null
          actual_ratio?: number | null
          min_ratio?: number | null
          max_ratio?: number | null
          violation_type?: string
          evidence?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      webhook_intelligence_deliveries: {
        Row: {
          id: string
          subscription_id: string
          event_id: string
          event_type: string
          attempt: number
          status_code: number | null
          response_time_ms: number | null
          delivered_at: string | null
          next_retry_at: string | null
          success: boolean
          dead_lettered: boolean
          error_message: string | null
          payload: Json | null
          response_body: string | null
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          event_id: string
          event_type: string
          attempt?: number
          status_code?: number | null
          response_time_ms?: number | null
          delivered_at?: string | null
          next_retry_at?: string | null
          success?: boolean
          dead_lettered?: boolean
          error_message?: string | null
          payload?: Json | null
          response_body?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          event_id?: string
          event_type?: string
          attempt?: number
          status_code?: number | null
          response_time_ms?: number | null
          delivered_at?: string | null
          next_retry_at?: string | null
          success?: boolean
          dead_lettered?: boolean
          error_message?: string | null
          payload?: Json | null
          response_body?: string | null
          created_at?: string
        }
        Relationships: []
      }
      webhook_subscriptions: {
        Row: {
          id: string
          account_id: string
          licensee_id: string
          created_by_user_id: string
          endpoint_url: string
          events: string[]
          enrichment_config: Json
          secret: string
          status: string
          max_attempts: number
          channel_filter: string | null
          category_filter: string | null
          sku_prefix_filter: string | null
          min_price_change_pct: number | null
          description: string | null
          last_delivery_at: string | null
          last_delivery_success: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          licensee_id: string
          created_by_user_id: string
          endpoint_url: string
          events?: string[]
          enrichment_config?: Json
          secret: string
          status?: string
          max_attempts?: number
          channel_filter?: string | null
          category_filter?: string | null
          sku_prefix_filter?: string | null
          min_price_change_pct?: number | null
          description?: string | null
          last_delivery_at?: string | null
          last_delivery_success?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          licensee_id?: string
          created_by_user_id?: string
          endpoint_url?: string
          events?: string[]
          enrichment_config?: Json
          secret?: string
          status?: string
          max_attempts?: number
          channel_filter?: string | null
          category_filter?: string | null
          sku_prefix_filter?: string | null
          min_price_change_pct?: number | null
          description?: string | null
          last_delivery_at?: string | null
          last_delivery_success?: boolean | null
          created_at?: string
          updated_at?: string
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
          secret_last_rotated_at: string | null
          secret_revealed_at: string | null
          signing_secret: string
          signing_version: string
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
          secret_last_rotated_at?: string | null
          secret_revealed_at?: string | null
          signing_secret: string
          signing_version?: string
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
          secret_last_rotated_at?: string | null
          secret_revealed_at?: string | null
          signing_secret?: string
          signing_version?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      ps_ingest_events: {
        Row: {
          id: string
          account_id: string
          licensee_id: string
          api_key_id: string | null
          event_id: string
          idempotency_key: string
          region: string
          source_platform: string
          merchant_id: string
          location_id: string | null
          item_id: string | null
          sku: string
          item_name_en: string | null
          item_name_ar: string | null
          inventory_status: string
          base_cost: number
          current_retail_price: number
          currency: string
          vat_rate: number
          raw_payload: Json
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          licensee_id: string
          api_key_id?: string | null
          event_id: string
          idempotency_key: string
          region: string
          source_platform: string
          merchant_id: string
          location_id?: string | null
          item_id?: string | null
          sku: string
          item_name_en?: string | null
          item_name_ar?: string | null
          inventory_status?: string
          base_cost: number
          current_retail_price: number
          currency?: string
          vat_rate?: number
          raw_payload?: Json
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          licensee_id?: string
          api_key_id?: string | null
          event_id?: string
          idempotency_key?: string
          region?: string
          source_platform?: string
          merchant_id?: string
          location_id?: string | null
          item_id?: string | null
          sku?: string
          item_name_en?: string | null
          item_name_ar?: string | null
          inventory_status?: string
          base_cost?: number
          current_retail_price?: number
          currency?: string
          vat_rate?: number
          raw_payload?: Json
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      ps_decide_results: {
        Row: {
          id: string
          ingest_event_id: string
          account_id: string
          licensee_id: string
          region: string
          merchant_id: string
          sku: string
          base_cost: number
          current_retail_price: number
          commission_rate: number
          vat_rate: number
          logistics_subsidy: number
          margin_floor_pct: number
          net_margin: number
          net_margin_pct: number
          floor_breached: boolean
          recommended_price: number | null
          decision_action: string
          created_at: string
        }
        Insert: {
          id?: string
          ingest_event_id: string
          account_id: string
          licensee_id: string
          region: string
          merchant_id: string
          sku: string
          base_cost: number
          current_retail_price: number
          commission_rate: number
          vat_rate: number
          logistics_subsidy?: number
          margin_floor_pct: number
          net_margin: number
          net_margin_pct: number
          floor_breached: boolean
          recommended_price?: number | null
          decision_action: string
          created_at?: string
        }
        Update: {
          id?: string
          ingest_event_id?: string
          account_id?: string
          licensee_id?: string
          region?: string
          merchant_id?: string
          sku?: string
          base_cost?: number
          current_retail_price?: number
          commission_rate?: number
          vat_rate?: number
          logistics_subsidy?: number
          margin_floor_pct?: number
          net_margin?: number
          net_margin_pct?: number
          floor_breached?: boolean
          recommended_price?: number | null
          decision_action?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ps_decide_results_ingest_event_id_fkey"
            columns: ["ingest_event_id"]
            isOneToOne: false
            referencedRelation: "ps_ingest_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_merchant_channels: {
        Row: {
          id: string
          account_id: string
          licensee_id: string
          merchant_id: string
          platform: string
          bearer_token: string | null
          manager_token: string | null
          scopes: string[]
          status: string
          error_message: string | null
          connected_at: string | null
          last_verified_at: string | null
          metadata: Json
          webhook_secret: string | null
          webhook_registered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          licensee_id: string
          merchant_id: string
          platform: string
          bearer_token?: string | null
          manager_token?: string | null
          scopes?: string[]
          status?: string
          error_message?: string | null
          connected_at?: string | null
          last_verified_at?: string | null
          metadata?: Json
          webhook_secret?: string | null
          webhook_registered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          licensee_id?: string
          merchant_id?: string
          platform?: string
          bearer_token?: string | null
          manager_token?: string | null
          scopes?: string[]
          status?: string
          error_message?: string | null
          connected_at?: string | null
          last_verified_at?: string | null
          metadata?: Json
          webhook_secret?: string | null
          webhook_registered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ps_aggregator_dispatch_log: {
        Row: {
          id: string
          trace_id: string
          ingest_event_id: string | null
          decide_result_id: string | null
          account_id: string
          licensee_id: string
          merchant_id: string
          sku: string
          target_channel: string
          remote_branch_id: string | null
          menu_item_id: string | null
          action_type: string
          old_price: number | null
          new_price: number
          currency: string
          audit_snapshot: Json
          status: string
          http_status: number | null
          upstream_message: string | null
          retry_count: number
          max_retries: number
          next_retry_at: string | null
          duration_ms: number | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          trace_id?: string
          ingest_event_id?: string | null
          decide_result_id?: string | null
          account_id: string
          licensee_id: string
          merchant_id: string
          sku: string
          target_channel: string
          remote_branch_id?: string | null
          menu_item_id?: string | null
          action_type?: string
          old_price?: number | null
          new_price: number
          currency?: string
          audit_snapshot: Json
          status?: string
          http_status?: number | null
          upstream_message?: string | null
          retry_count?: number
          max_retries?: number
          next_retry_at?: string | null
          duration_ms?: number | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          trace_id?: string
          ingest_event_id?: string | null
          decide_result_id?: string | null
          account_id?: string
          licensee_id?: string
          merchant_id?: string
          sku?: string
          target_channel?: string
          remote_branch_id?: string | null
          menu_item_id?: string | null
          action_type?: string
          old_price?: number | null
          new_price?: number
          currency?: string
          audit_snapshot?: Json
          status?: string
          http_status?: number | null
          upstream_message?: string | null
          retry_count?: number
          max_retries?: number
          next_retry_at?: string | null
          duration_ms?: number | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ps_aggregator_dispatch_log_ingest_event_id_fkey"
            columns: ["ingest_event_id"]
            isOneToOne: false
            referencedRelation: "ps_ingest_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ps_aggregator_dispatch_log_decide_result_id_fkey"
            columns: ["decide_result_id"]
            isOneToOne: false
            referencedRelation: "ps_decide_results"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_circuit_breaker_state: {
        Row: {
          id: string
          account_id: string
          target_channel: string
          state: string
          error_count: number
          last_error_at: string | null
          opened_at: string | null
          next_probe_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          target_channel: string
          state?: string
          error_count?: number
          last_error_at?: string | null
          opened_at?: string | null
          next_probe_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          target_channel?: string
          state?: string
          error_count?: number
          last_error_at?: string | null
          opened_at?: string | null
          next_probe_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ps_govern_audit_log: {
        Row: {
          id: string
          trace_id: string
          account_id: string
          licensee_id: string
          ingest_event_id: string | null
          dispatch_id: string | null
          merchant_id: string
          sku: string
          region: string
          source_platform: string | null
          target_channel: string | null
          event_type: string
          summary_en: string
          summary_ar: string
          data_route: string | null
          pdpl_compliant: boolean
          payload_hash: string
          payload_snapshot: Json
          created_at: string
        }
        Insert: {
          id?: string
          trace_id: string
          account_id: string
          licensee_id: string
          ingest_event_id?: string | null
          dispatch_id?: string | null
          merchant_id: string
          sku: string
          region: string
          source_platform?: string | null
          target_channel?: string | null
          event_type: string
          summary_en: string
          summary_ar: string
          data_route?: string | null
          pdpl_compliant?: boolean
          payload_hash: string
          payload_snapshot: Json
          created_at?: string
        }
        Update: {
          id?: string
          trace_id?: string
          account_id?: string
          licensee_id?: string
          ingest_event_id?: string | null
          dispatch_id?: string | null
          merchant_id?: string
          sku?: string
          region?: string
          source_platform?: string | null
          target_channel?: string | null
          event_type?: string
          summary_en?: string
          summary_ar?: string
          data_route?: string | null
          pdpl_compliant?: boolean
          payload_hash?: string
          payload_snapshot?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ps_govern_audit_log_ingest_event_id_fkey"
            columns: ["ingest_event_id"]
            isOneToOne: false
            referencedRelation: "ps_ingest_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ps_govern_audit_log_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "ps_aggregator_dispatch_log"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_merchant_pricing_config: {
        Row: {
          account_id: string
          margin_floor_pct: number
          updated_at: string
        }
        Insert: {
          account_id: string
          margin_floor_pct?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          margin_floor_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      ps_access_codes: {
        Row: {
          code: string
          merchant_id: string
          created_at: string
          email: string | null
          store_name: string | null
        }
        Insert: {
          code: string
          merchant_id: string
          created_at?: string
          email?: string | null
          store_name?: string | null
        }
        Update: {
          code?: string
          merchant_id?: string
          created_at?: string
          email?: string | null
          store_name?: string | null
        }
        Relationships: []
      }
      ps_payout_checks: {
        Row: {
          id: string
          account_id: string
          source: string
          platform: string
          order_count: number
          sub_total_sum: number
          commission_rate_pct: number
          expected_payout: number
          period_start: string | null
          period_end: string | null
          rows_skipped: number | null
          rows_total: number | null
          commission_amount: number | null
          additional_charges: number | null
          additional_income: number | null
          effective_commission_pct: number | null
          brand: string | null
          cancelled_gmv: number | null
          cancelled_orders: number | null
          extra_line_items: Json | null
          unexplained_charge: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          source: string
          platform: string
          order_count: number
          sub_total_sum: number
          commission_rate_pct: number
          expected_payout: number
          period_start?: string | null
          period_end?: string | null
          rows_skipped?: number | null
          rows_total?: number | null
          commission_amount?: number | null
          additional_charges?: number | null
          additional_income?: number | null
          effective_commission_pct?: number | null
          brand?: string | null
          cancelled_gmv?: number | null
          cancelled_orders?: number | null
          extra_line_items?: Json | null
          unexplained_charge?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          source?: string
          platform?: string
          order_count?: number
          sub_total_sum?: number
          commission_rate_pct?: number
          expected_payout?: number
          period_start?: string | null
          period_end?: string | null
          rows_skipped?: number | null
          rows_total?: number | null
          commission_amount?: number | null
          additional_charges?: number | null
          additional_income?: number | null
          effective_commission_pct?: number | null
          brand?: string | null
          cancelled_gmv?: number | null
          cancelled_orders?: number | null
          extra_line_items?: Json | null
          unexplained_charge?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      ps_payout_audits: {
        Row: {
          id: string
          account_id: string
          commission_rate_pct: number
          document_count: number
          documents: Json
          findings: Json
          ledger: Json | null
          ledger_totals: Json | null
          period_start: string | null
          period_end: string | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          commission_rate_pct: number
          document_count: number
          documents: Json
          findings: Json
          ledger?: Json | null
          ledger_totals?: Json | null
          period_start?: string | null
          period_end?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          commission_rate_pct?: number
          document_count?: number
          documents?: Json
          findings?: Json
          ledger?: Json | null
          ledger_totals?: Json | null
          period_start?: string | null
          period_end?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_url_due_status: {
        Row: {
          normalized_url: string
          raw_url_sample: string
          last_price: number | null
          currency: string | null
          last_scraped_at: string | null
          last_status: string | null
          consecutive_unchanged: number
          watcher_count: number
          required_freshness_sec: number
          max_freshness_sec: number
          is_due: boolean
        }
        Relationships: []
      }
    }
    Functions: {
      current_account_for_user: {
        Args: { _user_id: string }
        Returns: {
          account_id: string
          licensee_id: string
        }[]
      }
      ensure_account_for_user: { Args: { uid: string }; Returns: undefined }
      ensure_licensee_for_user: { Args: { uid: string }; Returns: string }
      find_account_for_api_key: {
        Args: { _api_key_id: string }
        Returns: {
          account_id: string
          licensee_id: string
          user_id: string
        }[]
      }
      find_user_id_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_licensee_member: {
        Args: {
          _licensee_id: string
          _min_role?: Database["public"]["Enums"]["licensee_role"]
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
      licensee_role: "owner" | "admin" | "developer" | "viewer"
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
      licensee_role: ["owner", "admin", "developer", "viewer"],
    },
  },
} as const
