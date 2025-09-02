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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      account_lockouts: {
        Row: {
          created_at: string
          email: string
          failed_attempts: number
          id: string
          last_attempt: string
          locked_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          failed_attempts?: number
          id?: string
          last_attempt?: string
          locked_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          failed_attempts?: number
          id?: string
          last_attempt?: string
          locked_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_user_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          session_token: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown | null
          session_token: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          password_hash: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_hash?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_metrics_cache: {
        Row: {
          created_at: string
          id: string
          metric_name: string
          metric_value: Json
          period_end: string | null
          period_start: string | null
          period_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_name: string
          metric_value: Json
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_name?: string
          metric_value?: Json
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      health_check_logs: {
        Row: {
          checks_failed: number
          checks_passed: number
          checks_warned: number
          created_at: string
          details: Json | null
          id: string
          overall_status: string
        }
        Insert: {
          checks_failed?: number
          checks_passed?: number
          checks_warned?: number
          created_at?: string
          details?: Json | null
          id?: string
          overall_status: string
        }
        Update: {
          checks_failed?: number
          checks_passed?: number
          checks_warned?: number
          created_at?: string
          details?: Json | null
          id?: string
          overall_status?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string | null
          entry_date: string
          id: string
          source: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          entry_date: string
          id?: string
          source: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          entry_date?: string
          id?: string
          source?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      journal_photos: {
        Row: {
          entry_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          uploaded_at: string | null
        }
        Insert: {
          entry_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_at?: string | null
        }
        Update: {
          entry_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_photos_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_prompts: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          prompt_text: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          prompt_text: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          prompt_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      oversized_messages: {
        Row: {
          byte_count: number
          char_count: number
          created_at: string
          entry_date: string
          id: string
          original_content: string
          phone_number: string
          received_at: string | null
          surge_message_id: string | null
          user_id: string | null
        }
        Insert: {
          byte_count: number
          char_count: number
          created_at?: string
          entry_date: string
          id?: string
          original_content: string
          phone_number: string
          received_at?: string | null
          surge_message_id?: string | null
          user_id?: string | null
        }
        Update: {
          byte_count?: number
          char_count?: number
          created_at?: string
          entry_date?: string
          id?: string
          original_content?: string
          phone_number?: string
          received_at?: string | null
          surge_message_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          last_reminder_sent: string | null
          phone_number: string | null
          phone_verified: boolean | null
          reminder_enabled: boolean | null
          reminder_time: string | null
          reminder_timezone: string | null
          timezone: string | null
          updated_at: string | null
          weekly_recap_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          id: string
          last_reminder_sent?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          reminder_timezone?: string | null
          timezone?: string | null
          updated_at?: string | null
          weekly_recap_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_reminder_sent?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          reminder_timezone?: string | null
          timezone?: string | null
          updated_at?: string | null
          weekly_recap_enabled?: boolean | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          attempts: number
          blocked_until: string | null
          created_at: string
          endpoint: string
          id: string
          identifier: string
          updated_at: string
          window_start: string
        }
        Insert: {
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          identifier: string
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          identifier: string
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          identifier?: string
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sms_consents: {
        Row: {
          consent_text: string
          consented_at: string
          created_at: string
          id: string
          ip_address: unknown | null
          phone_number: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_text: string
          consented_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          phone_number: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_text?: string
          consented_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          phone_number?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          byte_count: number | null
          char_count: number | null
          entry_date: string
          entry_id: string | null
          error_message: string | null
          id: string
          message_content: string
          phone_number: string
          processed: boolean | null
          received_at: string | null
          surge_message_id: string | null
          truncated: boolean | null
          user_id: string
        }
        Insert: {
          byte_count?: number | null
          char_count?: number | null
          entry_date: string
          entry_id?: string | null
          error_message?: string | null
          id?: string
          message_content: string
          phone_number: string
          processed?: boolean | null
          received_at?: string | null
          surge_message_id?: string | null
          truncated?: boolean | null
          user_id: string
        }
        Update: {
          byte_count?: number | null
          char_count?: number | null
          entry_date?: string
          entry_id?: string | null
          error_message?: string | null
          id?: string
          message_content?: string
          phone_number?: string
          processed?: boolean | null
          received_at?: string | null
          surge_message_id?: string | null
          truncated?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_processing_events: {
        Row: {
          created_at: string
          details: Json | null
          entry_id: string | null
          event_type: string
          id: string
          phone_number: string
          processing_time_ms: number | null
          surge_message_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          entry_id?: string | null
          event_type: string
          id?: string
          phone_number: string
          processing_time_ms?: number | null
          surge_message_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          entry_id?: string | null
          event_type?: string
          id?: string
          phone_number?: string
          processing_time_ms?: number | null
          surge_message_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sms_test_logs: {
        Row: {
          byte_count: number
          character_count: number
          created_at: string
          id: string
          message_content: string
          payload: Json | null
          phone_number: string
          success: boolean | null
          test_type: string
          webhook_response: string | null
          webhook_status: number | null
        }
        Insert: {
          byte_count?: number
          character_count?: number
          created_at?: string
          id?: string
          message_content: string
          payload?: Json | null
          phone_number: string
          success?: boolean | null
          test_type: string
          webhook_response?: string | null
          webhook_status?: number | null
        }
        Update: {
          byte_count?: number
          character_count?: number
          created_at?: string
          id?: string
          message_content?: string
          payload?: Json | null
          phone_number?: string
          success?: boolean | null
          test_type?: string
          webhook_response?: string | null
          webhook_status?: number | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_trial: boolean
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          trial_end: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_trial?: boolean
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_trial?: boolean
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      trial_reminder_history: {
        Row: {
          created_at: string
          id: string
          sent_at: string
          trial_day: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sent_at?: string
          trial_day: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sent_at?: string
          trial_day?: number
          user_id?: string
        }
        Relationships: []
      }
      user_prompt_history: {
        Row: {
          id: string
          prompt_id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          prompt_id: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          prompt_id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_recap_history: {
        Row: {
          entry_count: number
          id: string
          sent_at: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          entry_count?: number
          id?: string
          sent_at?: string
          user_id: string
          week_start_date: string
        }
        Update: {
          entry_count?: number
          id?: string
          sent_at?: string
          user_id?: string
          week_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_next_prompt_for_user: {
        Args: { user_uuid: string }
        Returns: {
          category: string
          prompt_id: string
          prompt_text: string
        }[]
      }
      get_setting: {
        Args: { p_key: string }
        Returns: string
      }
      is_verified_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      reset_rate_limit_for_phone: {
        Args: { phone_number: string }
        Returns: Json
      }
      send_test_reminder: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      set_setting: {
        Args: { p_key: string; p_value: string }
        Returns: undefined
      }
      test_edge_function_call: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      test_reminder_system: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      trigger_reminder_system: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      trigger_trial_reminder_system: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      trigger_weekly_recap_system: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
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
