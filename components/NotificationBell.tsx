"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import NotificationModal from "./NotificationModal";
import { getUnreadCount, subscribeToNotifications } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadUnreadCount();
      
      // Subscribe to real-time updates
      const unsubscribe = subscribeToNotifications(userId, () => {
        loadUnreadCount();
      });

      return unsubscribe;
    }
  }, [userId]);

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const loadUnreadCount = async () => {
    if (userId) {
      const count = await getUnreadCount(userId);
      setUnreadCount(count);
    }
  };

  if (!userId) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-white border-2 border-black hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userId={userId}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
}
