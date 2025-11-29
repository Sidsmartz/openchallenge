'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DomainProtection({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Skip check for landing, login, restricted, onboarding, and pending pages
    if (pathname === '/landing' || pathname === '/login' || pathname === '/restricted' || pathname === '/onboarding' || pathname === '/pending') {
      setChecking(false);
      return;
    }

    checkAccess();
  }, [pathname]);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/onboarding');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/onboarding');
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
      setChecking(false);
    }
  };

  if (checking && pathname !== '/landing' && pathname !== '/login' && pathname !== '/restricted' && pathname !== '/onboarding' && pathname !== '/pending') {
    return (
      <div className="flex min-h-screen bg-[#F5F1E8] items-center justify-center">
        <p className="text-gray-700">Verifying access...</p>
      </div>
    );
  }

  return <>{children}</>;
}
