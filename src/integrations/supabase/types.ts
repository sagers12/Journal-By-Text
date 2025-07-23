export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
      phone_verifications: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          phone_number: string
          verification_code: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          phone_number: string
          verification_code: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number?: string
          verification_code?: string
          verified?: boolean | null
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
          trial_started_at: string | null
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
          trial_started_at?: string | null
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
          trial_started_at?: string | null
          updated_at?: string | null
          weekly_recap_enabled?: boolean | null
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
          entry_date: string
          entry_id: string | null
          error_message: string | null
          id: string
          message_content: string
          phone_number: string
          processed: boolean | null
          received_at: string | null
          surge_message_id: string | null
          user_id: string
        }
        Insert: {
          entry_date: string
          entry_id?: string | null
          error_message?: string | null
          id?: string
          message_content: string
          phone_number: string
          processed?: boolean | null
          received_at?: string | null
          surge_message_id?: string | null
          user_id: string
        }
        Update: {
          entry_date?: string
          entry_id?: string | null
          error_message?: string | null
          id?: string
          message_content?: string
          phone_number?: string
          processed?: boolean | null
          received_at?: string | null
          surge_message_id?: string | null
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
      user_last_prompt_category: {
        Row: {
          last_category: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_category: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_category?: string
          updated_at?: string
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
      get_next_prompt_for_user: {
        Args: { user_uuid: string }
        Returns: {
          prompt_id: string
          prompt_text: string
          category: string
        }[]
      }
      send_test_reminder: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
