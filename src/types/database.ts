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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      circle_events: {
        Row: {
          circle_id: string
          created_at: string
          description: string | null
          ends_at: string | null
          going_count: number
          id: string
          interested_count: number
          location: string | null
          starts_at: string
          title: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          going_count?: number
          id?: string
          interested_count?: number
          location?: string | null
          starts_at: string
          title: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          going_count?: number
          id?: string
          interested_count?: number
          location?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_events_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          circle_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          circle_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          circle_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          member_count: number
          name: string
          slug: string
          state: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          member_count?: number
          name: string
          slug: string
          state?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          member_count?: number
          name?: string
          slug?: string
          state?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          field_key: string
          granted: boolean
          granted_at: string
          id: string
          purpose: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          field_key: string
          granted: boolean
          granted_at?: string
          id?: string
          purpose: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          field_key?: string
          granted?: boolean
          granted_at?: string
          id?: string
          purpose?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          event_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "circle_events"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          circle_id: string | null
          connection_type: string | null
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          circle_id?: string | null
          connection_type?: string | null
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          circle_id?: string | null
          connection_type?: string | null
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      matching_preferences: {
        Row: {
          age_max: number | null
          age_min: number | null
          languages: string[]
          max_distance_miles: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          languages?: string[]
          max_distance_miles?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          languages?: string[]
          max_distance_miles?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          delivered_at: string | null
          id: string
          match_id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          match_id: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          match_id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_photos: {
        Row: {
          created_at: string
          id: string
          position: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_sensitive: {
        Row: {
          citizenship_status_detail: string | null
          created_at: string
          origin_countries: string[]
          religious_affiliation: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          citizenship_status_detail?: string | null
          created_at?: string
          origin_countries?: string[]
          religious_affiliation?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          citizenship_status_detail?: string | null
          created_at?: string
          origin_countries?: string[]
          religious_affiliation?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          app_locale: string
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          city: string | null
          country: string | null
          created_at: string
          deletion_requested_at: string | null
          discoverable: boolean
          display_name: string
          email_notifications_enabled: boolean
          european_citizenship: boolean
          hobbies: string[]
          id: string
          interests: string[]
          languages: string[]
          occupation: string | null
          onboarding_completed_at: string | null
          onboarding_step: number
          profile_visibility: string
          push_notifications_enabled: boolean
          state: string | null
          text_size: string
          theme_preference: string
          travel_frequency: string | null
          travel_style: string[]
          updated_at: string
          us_citizenship: boolean
          us_residency: boolean
        }
        Insert: {
          app_locale?: string
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          discoverable?: boolean
          display_name?: string
          email_notifications_enabled?: boolean
          european_citizenship?: boolean
          hobbies?: string[]
          id: string
          interests?: string[]
          languages?: string[]
          occupation?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: number
          profile_visibility?: string
          push_notifications_enabled?: boolean
          state?: string | null
          text_size?: string
          theme_preference?: string
          travel_frequency?: string | null
          travel_style?: string[]
          updated_at?: string
          us_citizenship?: boolean
          us_residency?: boolean
        }
        Update: {
          app_locale?: string
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          discoverable?: boolean
          display_name?: string
          email_notifications_enabled?: boolean
          european_citizenship?: boolean
          hobbies?: string[]
          id?: string
          interests?: string[]
          languages?: string[]
          occupation?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: number
          profile_visibility?: string
          push_notifications_enabled?: boolean
          state?: string | null
          text_size?: string
          theme_preference?: string
          travel_frequency?: string | null
          travel_style?: string[]
          updated_at?: string
          us_citizenship?: boolean
          us_residency?: boolean
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      questionnaire_responses: {
        Row: {
          answers: Json
          core: Json
          created_at: string
          schema_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          core?: Json
          created_at?: string
          schema_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          core?: Json
          created_at?: string
          schema_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      safety_plans: {
        Row: {
          auto_checkin_minutes: number
          checked_in_at: string | null
          created_at: string
          id: string
          location: string | null
          meeting_at: string
          meeting_with: string
          status: string
          trusted_contacts: Json
          user_id: string
        }
        Insert: {
          auto_checkin_minutes?: number
          checked_in_at?: string | null
          created_at?: string
          id?: string
          location?: string | null
          meeting_at: string
          meeting_with: string
          status?: string
          trusted_contacts?: Json
          user_id: string
        }
        Update: {
          auto_checkin_minutes?: number
          checked_in_at?: string | null
          created_at?: string
          id?: string
          location?: string | null
          meeting_at?: string
          meeting_with?: string
          status?: string
          trusted_contacts?: Json
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          current_period_end: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_period_end?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_period_end?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      swipes: {
        Row: {
          action: string
          actor_id: string
          circle_id: string | null
          created_at: string
          target_id: string
          updated_at: string
        }
        Insert: {
          action: string
          actor_id: string
          circle_id?: string | null
          created_at?: string
          target_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string
          circle_id?: string | null
          created_at?: string
          target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_connection_types: {
        Row: {
          connection_type: string
          created_at: string
          user_id: string
        }
        Insert: {
          connection_type: string
          created_at?: string
          user_id: string
        }
        Update: {
          connection_type?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_status: {
        Row: {
          status: string
          stripe_identity_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          status?: string
          stripe_identity_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          status?: string
          stripe_identity_session_id?: string | null
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
      get_origin_countries_with_consent: {
        Args: { target_ids: string[] }
        Returns: {
          origin_countries: string[]
          user_id: string
        }[]
      }
      can_view_profile: { Args: { target: string }; Returns: boolean }
      is_blocked: { Args: { a: string; b: string }; Returns: boolean }
      list_global_discover_candidates: {
        Args: { max_count?: number }
        Returns: {
          user_id: string
        }[]
      }
      process_overdue_safety_checkins: { Args: never; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
