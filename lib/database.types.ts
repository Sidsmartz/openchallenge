export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      users: {
        Row: {
          ai_summary: string | null;
          available_for_mentorship: boolean | null;
          courses_enrolled: string | null;
          created_at: string | null;
          current_company: string | null;
          current_job_title: string | null;
          department: string | null;
          email: string;
          full_name: string | null;
          gamification: boolean | null;
          graduating_batch: string | null;
          id: string;
          interests: string | null;
          office_hours: string | null;
          program_branch: string | null;
          research_interests: string | null;
          role: string;
          smart_search: boolean | null;
          subjects_taught: string | null;
          theme: string | null;
          updated_at: string | null;
          year_of_study: string | null;
        };
        Insert: {
          ai_summary?: string | null;
          available_for_mentorship?: boolean | null;
          courses_enrolled?: string | null;
          created_at?: string | null;
          current_company?: string | null;
          current_job_title?: string | null;
          department?: string | null;
          email: string;
          full_name?: string | null;
          gamification?: boolean | null;
          graduating_batch?: string | null;
          id?: string;
          interests?: string | null;
          office_hours?: string | null;
          program_branch?: string | null;
          research_interests?: string | null;
          role: string;
          smart_search?: boolean | null;
          subjects_taught?: string | null;
          theme?: string | null;
          updated_at?: string | null;
          year_of_study?: string | null;
        };
        Update: {
          ai_summary?: string | null;
          available_for_mentorship?: boolean | null;
          courses_enrolled?: string | null;
          created_at?: string | null;
          current_company?: string | null;
          current_job_title?: string | null;
          department?: string | null;
          email?: string;
          full_name?: string | null;
          gamification?: boolean | null;
          graduating_batch?: string | null;
          id?: string;
          interests?: string | null;
          office_hours?: string | null;
          program_branch?: string | null;
          research_interests?: string | null;
          role?: string;
          smart_search?: boolean | null;
          subjects_taught?: string | null;
          theme?: string | null;
          updated_at?: string | null;
          year_of_study?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
