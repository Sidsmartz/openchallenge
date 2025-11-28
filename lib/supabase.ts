import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type UserRole = "student" | "faculty" | "alumni";

export interface UserProfile {
  id?: string;
  email: string;
  role: UserRole;
  full_name?: string;
  // Student fields
  program_branch?: string;
  year_of_study?: string;
  interests?: string;
  courses_enrolled?: string;
  // Faculty fields
  department?: string;
  subjects_taught?: string;
  research_interests?: string;
  office_hours?: string;
  // Alumni fields
  graduating_batch?: string;
  current_company?: string;
  current_job_title?: string;
  available_for_mentorship?: boolean;
  // Preferences
  theme?: string;
  smart_search?: boolean;
  ai_summary?: string;
  gamification?: boolean;
}

export async function createUser(userData: UserProfile) {
  const { data, error } = await supabase
    .from("users")
    .insert([userData])
    .select();

  if (error) {
    console.error("Error creating user:", error);
    throw error;
  }

  return data;
}

export async function updateUser(id: string, userData: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from("users")
    .update(userData)
    .eq("id", id)
    .select();

  if (error) {
    console.error("Error updating user:", error);
    throw error;
  }

  return data;
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "not found" error
    console.error("Error fetching user:", error);
    throw error;
  }

  return data;
}
