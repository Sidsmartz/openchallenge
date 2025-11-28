'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from "@/components/Sidebar";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/check-domain', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      
      if (!data.hasAccess) {
        router.push('/restricted');
        return;
      }

      setChecking(false);
    } catch (error) {
      console.error('Error checking access:', error);
      router.push('/login');
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen bg-[#9DC4AA] items-center justify-center">
        <p className="text-gray-700">Checking access...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#9DC4AA]">
      <Sidebar />
      <main className="flex-1 ml-48 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full bg-[#F5F1E8] rounded-lg p-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Welcome to the Learning Platform
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            Navigate using the sidebar to access different features:
          </p>
          <div className="space-y-4 text-left max-w-2xl mx-auto">
            <div className="bg-white border-2 border-black rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">🏠 Home</h3>
              <p className="text-gray-700">Your dashboard and overview</p>
            </div>
            <div className="bg-white border-2 border-black rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">📚 Lecture Hub</h3>
              <p className="text-gray-700">Access video lectures, transcripts, and mindmaps</p>
            </div>
            <div className="bg-white border-2 border-black rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">👥 Community</h3>
              <p className="text-gray-700">Connect with peers, share posts, and engage in discussions</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
