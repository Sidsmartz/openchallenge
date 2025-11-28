import { supabase } from "./supabase";

export type NotificationType = "comment" | "message" | "like" | "mention";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_post_id?: string | null;
  is_read: boolean;
  created_at: string;
}

// Create a notification
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedPostId?: string
) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        related_post_id: relatedPostId || null,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { data: null, error };
  }
}

// Get unread notifications count
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

// Get all notifications for a user
export async function getNotifications(userId: string, limit = 20) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: data as Notification[], error: null };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { data: [], error };
  }
}

// Mark notification as read
export async function markAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { error };
  }
}

// Mark all notifications as read
export async function markAllAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("Error marking all as read:", error);
    return { error };
  }
}

// Delete a notification
export async function deleteNotification(notificationId: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { error };
  }
}

// Subscribe to real-time notifications
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
