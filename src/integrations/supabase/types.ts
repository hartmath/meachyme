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
      calls: {
        Row: {
          call_type: string
          callee_id: string
          caller_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          call_type: string
          callee_id: string
          caller_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          call_type?: string
          callee_id?: string
          caller_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string | null
          deleted_by_recipient: boolean | null
          deleted_by_sender: boolean | null
          id: string
          message_type: string | null
          read: boolean | null
          recipient_id: string | null
          sender_id: string | null
          updated_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string | null
          deleted_by_recipient?: boolean | null
          deleted_by_sender?: boolean | null
          id?: string
          message_type?: string | null
          read?: boolean | null
          recipient_id?: string | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string | null
          deleted_by_recipient?: boolean | null
          deleted_by_sender?: boolean | null
          id?: string
          message_type?: string | null
          read?: boolean | null
          recipient_id?: string | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          purchase_date: string | null
          ticket_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          purchase_date?: string | null
          ticket_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          purchase_date?: string | null
          ticket_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tickets: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string | null
          id: string
          price: number | null
          quantity: number | null
          sales_end_date: string | null
          sales_start_date: string | null
          ticket_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          price?: number | null
          quantity?: number | null
          sales_end_date?: string | null
          sales_start_date?: string | null
          ticket_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          price?: number | null
          quantity?: number | null
          sales_end_date?: string | null
          sales_start_date?: string | null
          ticket_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          created_at: string | null
          date: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_type: string | null
          id: string
          image_url: string | null
          is_free: boolean | null
          is_vip_event: boolean | null
          location: string | null
          max_attendees: number | null
          metadata: Json | null
          online_link: string | null
          organizer_email: string | null
          organizer_name: string | null
          organizer_phone: string | null
          organizing_department: string | null
          price: number | null
          protocol_media_coverage: boolean | null
          published: boolean | null
          security_clearance_required: boolean | null
          summary: string | null
          tags: string[] | null
          target_audience: string | null
          time: string | null
          time_zone: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          venue_type: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          image_url?: string | null
          is_free?: boolean | null
          is_vip_event?: boolean | null
          location?: string | null
          max_attendees?: number | null
          metadata?: Json | null
          online_link?: string | null
          organizer_email?: string | null
          organizer_name?: string | null
          organizer_phone?: string | null
          organizing_department?: string | null
          price?: number | null
          protocol_media_coverage?: boolean | null
          published?: boolean | null
          security_clearance_required?: boolean | null
          summary?: string | null
          tags?: string[] | null
          target_audience?: string | null
          time?: string | null
          time_zone?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          venue_type?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          image_url?: string | null
          is_free?: boolean | null
          is_vip_event?: boolean | null
          location?: string | null
          max_attendees?: number | null
          metadata?: Json | null
          online_link?: string | null
          organizer_email?: string | null
          organizer_name?: string | null
          organizer_phone?: string | null
          organizing_department?: string | null
          price?: number | null
          protocol_media_coverage?: boolean | null
          published?: boolean | null
          security_clearance_required?: boolean | null
          summary?: string | null
          tags?: string[] | null
          target_audience?: string | null
          time?: string | null
          time_zone?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          venue_type?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          events_updates: boolean | null
          id: string
          messages: boolean | null
          payment_updates: boolean | null
          system_updates: boolean | null
          updated_at: string | null
          user_id: string | null
          vendor_requests: boolean | null
        }
        Insert: {
          created_at?: string | null
          events_updates?: boolean | null
          id?: string
          messages?: boolean | null
          payment_updates?: boolean | null
          system_updates?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          vendor_requests?: boolean | null
        }
        Update: {
          created_at?: string | null
          events_updates?: boolean | null
          id?: string
          messages?: boolean | null
          payment_updates?: boolean | null
          system_updates?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          vendor_requests?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          business_name: string | null
          category: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_online: boolean | null
          last_seen: string | null
          location: string | null
          member_since: string | null
          phone: string | null
          profile_views: number | null
          reviews: Json | null
          reviews_count: number | null
          services: Json | null
          settings: Json | null
          updated_at: string | null
          user_id: string | null
          user_type: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          business_name?: string | null
          category?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          last_seen?: string | null
          location?: string | null
          member_since?: string | null
          phone?: string | null
          profile_views?: number | null
          reviews?: Json | null
          reviews_count?: number | null
          services?: Json | null
          settings?: Json | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          business_name?: string | null
          category?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          last_seen?: string | null
          location?: string | null
          member_since?: string | null
          phone?: string | null
          profile_views?: number | null
          reviews?: Json | null
          reviews_count?: number | null
          services?: Json | null
          settings?: Json | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
          username?: string | null
        }
        Relationships: []
      }
      status_posts: {
        Row: {
          background_color: string | null
          content: string
          created_at: string
          expires_at: string | null
          id: string
          media_type: string | null
          media_url: string | null
          updated_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          background_color?: string | null
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          updated_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          background_color?: string | null
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      status_views: {
        Row: {
          id: string
          status_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          status_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          status_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_views_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "status_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      status_likes: {
        Row: {
          id: string
          status_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          status_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          status_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_likes_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "status_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      status_comments: {
        Row: {
          id: string
          status_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          status_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_comments_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "status_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      status_shares: {
        Row: {
          id: string
          status_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          status_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          status_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_shares_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "status_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          avatar_url: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          avatar_url?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          avatar_url?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          id: string
          group_id: string
          sender_id: string
          content: string
          message_type: string
          attachment_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          sender_id: string
          content: string
          message_type?: string
          attachment_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          sender_id?: string
          content?: string
          message_type?: string
          attachment_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_calls: {
        Row: {
          id: string
          group_id: string
          initiator_id: string
          call_type: string
          status: string
          started_at: string
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          initiator_id: string
          call_type: string
          status?: string
          started_at?: string
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          initiator_id?: string
          call_type?: string
          status?: string
          started_at?: string
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_calls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_call_participants: {
        Row: {
          id: string
          call_id: string
          user_id: string
          joined_at: string
          left_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          call_id: string
          user_id: string
          joined_at?: string
          left_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          call_id?: string
          user_id?: string
          joined_at?: string
          left_at?: string | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "group_call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "group_calls"
            referencedColumns: ["id"]
          },
        ]
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
