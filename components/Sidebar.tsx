'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, BookOpen, Users, LogOut, Shield } from 'lucide-react';
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

  useEffect(() => {
    checkAdminStatus();
  }, []);

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
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // Define navigation items based on role
  const navItems = [
    { name: 'Home', icon: Home, path: '/', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { name: 'Lecture Hub', icon: BookOpen, path: '/video', roles: ['student', 'alumni', 'faculty', 'admin'] },
    { name: 'Community', icon: Users, path: '/community', roles: ['student', 'alumni', 'faculty', 'admin'] },
  ];

  // Add admin link if user is admin
  if (isAdmin) {
    navItems.push({ name: 'Admin', icon: Shield, path: '/admin', roles: ['admin'] });
  }

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="fixed left-0 top-0 h-screen w-48 bg-[#9DC4AA] flex flex-col">
      {/* Navigation Items */}
      <nav className="flex-1 pt-8">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                isActive
                  ? 'bg-black text-white'
                  : 'text-gray-800 hover:bg-black/10'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="flex justify-center pb-6">
        <button
          onClick={handleLogout}
          className="w-12 h-12 rounded-full bg-gray-800 text-white hover:bg-black hover:scale-110 transition-all duration-200 flex items-center justify-center shadow-lg"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
