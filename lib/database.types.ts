export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
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
          role: string
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      posts: {
        Row: {
          content: string
          created_at: string | null
          flagged_reason: string | null
          id: string
          image_url: string | null
          likes_count: number | null
          status: string | null
          title: string
          toxicity_scores: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          flagged_reason?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          status?: string | null
          title: string
          toxicity_scores?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          flagged_reason?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          status?: string | null
          title?: string
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
          office_hours: string | null
          program_branch: string | null
          research_interests: string | null
          role: string
          smart_search: boolean | null
          subjects_taught: string | null
          theme: string | null
          updated_at: string | null
          year_of_study: string | null
        }
        Insert: {
          ai_summary?: string | null
          available_for_mentorship?: boolean | null
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
          office_hours?: string | null
          program_branch?: string | null
          research_interests?: string | null
          role: string
          smart_search?: boolean | null
          subjects_taught?: string | null
          theme?: string | null
          updated_at?: string | null
          year_of_study?: string | null
        }
        Update: {
          ai_summary?: string | null
          available_for_mentorship?: boolean | null
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
          office_hours?: string | null
          program_branch?: string | null
          research_interests?: string | null
          role?: string
          smart_search?: boolean | null
          subjects_taught?: string | null
          theme?: string | null
          updated_at?: string | null
          year_of_study?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string | null
          duration: number | null
          file_name: string
          file_path: string
          id: string
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
          updated_at?: string | null
          uploaded_by?: string | null
          video_url?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

type SchemaName = Exclude<keyof Database, "__InternalSupabase">

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: SchemaName },
  TableName extends PublicTableNameOrOptions extends { schema: SchemaName }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: SchemaName }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: SchemaName },
  TableName extends PublicTableNameOrOptions extends { schema: SchemaName }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: SchemaName }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: SchemaName },
  TableName extends PublicTableNameOrOptions extends { schema: SchemaName }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: SchemaName }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: SchemaName },
  EnumName extends PublicEnumNameOrOptions extends { schema: SchemaName }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: SchemaName }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: SchemaName },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: SchemaName
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: SchemaName }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
