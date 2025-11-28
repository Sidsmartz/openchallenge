"use client";

import { useEffect, useState } from "react";
import { X, MessageCircle, MessageSquare, Bell, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToNotifications,
  type Notification,
} from "@/lib/notifications";
import { useRouter } from "next/navigation";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationModal({
  isOpen,
  onClose,
  userId,
  onUnreadCountChange,
}: NotificationModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications();
    }
  }, [isOpen, userId]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToNotifications(userId, (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      if (onUnreadCountChange) {
        const unreadCount = [newNotification, ...notifications].filter(
          (n) => !n.is_read
        ).length;
        onUnreadCountChange(unreadCount);
      }
    });

    return unsubscribe;
  }, [userId, notifications, onUnreadCountChange]);

  const loadNotifications = async () => {
    setLoading(true);
    const { data } = await getNotifications(userId);
    setNotifications(data);
    setLoading(false);

    if (onUnreadCountChange) {
      const unreadCount = data.filter((n) => !n.is_read).length;
      onUnreadCountChange(unreadCount);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      if (onUnreadCountChange) {
        const unreadCount = notifications.filter(
          (n) => !n.is_read && n.id !== notification.id
        ).length;
        onUnreadCountChange(unreadCount);
      }
    }

    // Navigate based on type
    if (notification.type === "comment" && notification.related_post_id) {
      router.push(`/community?post=${notification.related_post_id}`);
      onClose();
    } else if (notification.type === "message") {
      router.push("/chat");
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (onUnreadCountChange) {
      onUnreadCountChange(0);
    }
  };

  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
    const deletedNotification = notifications.find((n) => n.id === notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    
    if (onUnreadCountChange && deletedNotification && !deletedNotification.is_read) {
      const unreadCount = notifications.filter(
        (n) => !n.is_read && n.id !== notificationId
      ).length;
      onUnreadCountChange(unreadCount);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "comment":
        return <MessageSquare className="w-5 h-5" />;
      case "message":
        return <MessageCircle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 right-4 w-96 max-h-[600px] bg-[#FFF7E4] border-2 border-black shadow-[8px_8px_0px_#000] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b-2 border-black bg-[#F4C430] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <h2 className="text-lg font-black uppercase tracking-tight">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-black/10 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions */}
            {unreadCount > 0 && (
              <div className="p-2 border-b-2 border-black bg-white">
                <button
                  onClick={handleMarkAllRead}
                  className="text-sm font-bold text-[#6B9BD1] hover:underline uppercase tracking-wider"
                >
                  Mark all as read
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto bg-white">
              {loading ? (
                <div className="p-8 text-center">
                  <p className="text-gray-600 font-medium">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600 font-bold mb-1">No notifications</p>
                  <p className="text-sm text-gray-500">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                <div className="divide-y-2 divide-gray-200">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors relative ${
                        !notification.is_read ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`w-10 h-10 flex items-center justify-center border-2 border-black ${
                            notification.type === "comment"
                              ? "bg-[#A8D7B7]"
                              : "bg-[#6B9BD1]"
                          }`}
                        >
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-sm">
                              {notification.title}
                            </h3>
                            <button
                              onClick={(e) => handleDelete(notification.id, e)}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 font-medium">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                      {!notification.is_read && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#6B9BD1] rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
