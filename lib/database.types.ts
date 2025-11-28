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
      comments: {
        Row: {
          content: string
          created_at: string | null
          flagged_reason: string | null
          id: string
          likes_count: number | null
          post_id: string
          status: string | null
          toxicity_scores: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          flagged_reason?: string | null
          id?: string
          likes_count?: number | null
          post_id: string
          status?: string | null
          toxicity_scores?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          flagged_reason?: string | null
          id?: string
          likes_count?: number | null
          post_id?: string
          status?: string | null
          toxicity_scores?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          participant1_id: string
          participant2_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          participant1_id: string
          participant2_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          participant1_id?: string
          participant2_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          comment_id: string | null
          content: string
          content_type: string
          created_at: string | null
          id: string
          post_id: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          toxicity_scores: Json
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          content: string
          content_type: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          toxicity_scores: Json
          user_id: string
        }
        Update: {
          comment_id?: string | null
          content?: string
          content_type?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          toxicity_scores?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          file_url: string
          filename: string
          id: string
          subject: string
          unit: number
          uploaded_at: string | null
        }
        Insert: {
          file_url: string
          filename: string
          id?: string
          subject: string
          unit: number
          uploaded_at?: string | null
        }
        Update: {
          file_url?: string
          filename?: string
          id?: string
          subject?: string
          unit?: number
          uploaded_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          related_post_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_post_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_post_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_post_id_fkey"
            columns: ["related_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          flagged_reason: string | null
          id: string
          image_urls: string[] | null
          likes_count: number | null
          status: string | null
          tags: string[] | null
          toxicity_scores: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          flagged_reason?: string | null
          id?: string
          image_urls?: string[] | null
          likes_count?: number | null
          status?: string | null
          tags?: string[] | null
          toxicity_scores?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          flagged_reason?: string | null
          id?: string
          image_urls?: string[] | null
          likes_count?: number | null
          status?: string | null
          tags?: string[] | null
          toxicity_scores?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      socials: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "socials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subtitles: {
        Row: {
          created_at: string | null
          end_time: number
          id: string
          language: string | null
          start_time: number
          text: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          end_time: number
          id?: string
          language?: string | null
          start_time: number
          text: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          end_time?: number
          id?: string
          language?: string | null
          start_time?: number
          text?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtitles_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ai_summary: string | null
          available_for_mentorship: boolean | null
          avatar_url: string | null
          bio: string | null
          courses_enrolled: string | null
          created_at: string | null
          current_company: string | null
          current_job_title: string | null
          department: string | null
          email: string
          full_name: string | null
          gamification: boolean | null
          graduating_batch: string | null
          id: string
          interests: string | null
          is_banned: boolean | null
          last_watched_video_id: string | null
          office_hours: string | null
          program_branch: string | null
          research_interests: string | null
          role: string
          skills: string[] | null
          smart_search: boolean | null
          subjects_taught: string | null
          theme: string | null
          updated_at: string | null
          year_of_study: string | null
        }
        Insert: {
          ai_summary?: string | null
          available_for_mentorship?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          courses_enrolled?: string | null
          created_at?: string | null
          current_company?: string | null
          current_job_title?: string | null
          department?: string | null
          email: string
          full_name?: string | null
          gamification?: boolean | null
          graduating_batch?: string | null
          id?: string
          interests?: string | null
          is_banned?: boolean | null
          last_watched_video_id?: string | null
          office_hours?: string | null
          program_branch?: string | null
          research_interests?: string | null
          role: string
          skills?: string[] | null
          smart_search?: boolean | null
          subjects_taught?: string | null
          theme?: string | null
          updated_at?: string | null
          year_of_study?: string | null
        }
        Update: {
          ai_summary?: string | null
          available_for_mentorship?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          courses_enrolled?: string | null
          created_at?: string | null
          current_company?: string | null
          current_job_title?: string | null
          department?: string | null
          email?: string
          full_name?: string | null
          gamification?: boolean | null
          graduating_batch?: string | null
          id?: string
          interests?: string | null
          is_banned?: boolean | null
          last_watched_video_id?: string | null
          office_hours?: string | null
          program_branch?: string | null
          research_interests?: string | null
          role?: string
          skills?: string[] | null
          smart_search?: boolean | null
          subjects_taught?: string | null
          theme?: string | null
          updated_at?: string | null
          year_of_study?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_last_watched_video_id_fkey"
            columns: ["last_watched_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string | null
          duration: number | null
          file_name: string
          file_path: string
          id: string
          subtitles: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          uploaded_by: string | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          file_name: string
          file_path: string
          id?: string
          subtitles?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          file_name?: string
          file_path?: string
          id?: string
          subtitles?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          video_url?: string
        }
        Relationships: []
      }
      work_experience: {
        Row: {
          company: string
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          start_date: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          start_date: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          start_date?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_experience_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
