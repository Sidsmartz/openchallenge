'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Clock, Mail, CheckCircle, XCircle } from 'lucide-react';

export default function PendingApprovalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkApprovalStatus();
    
    // Poll for approval status every 10 seconds
    const interval = setInterval(checkApprovalStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkApprovalStatus = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/onboarding');
        return;
      }

      setUser(authUser);

      // Get user's approval status
      const { data: userData, error } = await supabase
        .from('users')
        .select('approval_status, role')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return;
      }

      if (userData) {
        setApprovalStatus(userData.approval_status || 'pending');
        
        // If approved, redirect to home
        if (userData.approval_status === 'approved') {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Error checking approval status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/onboarding');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#A8D7B7]">
        <div className="text-xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#A8D7B7] p-8">
      <div className="w-[90%] max-w-[600px] bg-[#FFF7E4] border-2 border-black p-12 shadow-[8px_8px_0px_#000]">
        <div className="flex flex-col items-center justify-center gap-6">
          {approvalStatus === 'pending' && (
            <>
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_#000]">
                <Clock className="w-12 h-12 text-gray-900" />
              </div>
              <h1 className="text-3xl font-bold text-center">Account Under Review</h1>
              <p className="text-center text-gray-700 text-lg">
                Your alumni account is currently being reviewed by our administrators.
              </p>
              <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-4 w-full">
                <p className="text-sm text-blue-900 text-center">
                  <strong>What happens next?</strong><br />
                  Our team will verify your alumni status and approve your account shortly. 
                  You'll receive a notification once your account is approved.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>Signed in as: {user?.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-6 py-3 bg-white border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
              >
                Sign Out
              </button>
            </>
          )}

          {approvalStatus === 'rejected' && (
            <>
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_#000]">
                <XCircle className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-center">Account Not Approved</h1>
              <p className="text-center text-gray-700 text-lg">
                Unfortunately, your alumni account application was not approved.
              </p>
              <div className="bg-red-50 border-2 border-red-600 rounded-lg p-4 w-full">
                <p className="text-sm text-red-900 text-center">
                  Please contact support if you believe this is an error or if you have questions about your application.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>Signed in as: {user?.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-6 py-3 bg-white border-2 border-black font-bold uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000] transition-all"
              >
                Sign Out
              </button>
            </>
          )}

          {approvalStatus === 'approved' && (
            <>
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_#000]">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-center">Account Approved!</h1>
              <p className="text-center text-gray-700 text-lg">
                Redirecting you to the platform...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
