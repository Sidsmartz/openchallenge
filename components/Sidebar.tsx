'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, BookOpen, Users, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SidebarProps {
  userRole?: 'student' | 'alumni' | 'faculty' | 'admin';
}

export default function Sidebar({ userRole = 'student' }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

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
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-6 py-4 text-gray-800 hover:bg-black/10 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium">Logout</span>
      </button>
    </div>
  );
}
