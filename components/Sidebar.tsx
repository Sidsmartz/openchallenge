'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, BookOpen, Users, LogOut, Shield, MessageCircle, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface SidebarProps {
  userRole?: 'student' | 'alumni' | 'faculty' | 'admin';
}

export default function Sidebar({ userRole = 'student' }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
    getUserId();
  }, []);

  const getUserId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (error) {
      console.error('Error getting user ID:', error);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/check', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      router.push('/onboarding');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // Define navigation items based on role
  const navItems = [
    { name: 'Home', icon: Home, path: '/', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { name: 'Learning Hub', icon: BookOpen, path: '/hub', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { name: 'Community', icon: Users, path: '/community', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { name: 'Chat', icon: MessageCircle, path: '/chat', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { name: 'Profile', icon: User, path: userId ? `/profile/${userId}` : '/profile', roles: ['student', 'alumni', 'faculty', 'admin'] },
  ];

  // Add admin link if user is admin
  if (isAdmin) {
    navItems.push({ name: 'Admin', icon: Shield, path: '/admin', roles: ['admin'] });
  }

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="fixed left-0 top-0 h-screen w-56 bg-[#9DC4AA] flex flex-col">
      {/* Navigation Items */}
      <nav className="flex-1 pt-8 px-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-5 py-3 mb-2 text-left transition-all rounded-full ${
                isActive
                  ? 'bg-black text-white'
                  : 'text-gray-800 bg-transparent hover:bg-white/50 hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="flex justify-center pb-6 px-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-gray-800 text-white hover:bg-black hover:shadow-[3px_3px_0px_rgba(0,0,0,0.6)] transition-all duration-200"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
}
