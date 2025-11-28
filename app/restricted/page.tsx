'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Shield, Mail, LogOut } from 'lucide-react';

export default function RestrictedPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || '');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white border-4 border-black rounded-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 border-4 border-black rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-red-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Restricted</h1>
          
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 mb-2">
              <strong>This platform is only available to MLRIT students and faculty.</strong>
            </p>
            <p className="text-xs text-red-700">
              Please log in using your college email address.
            </p>
          </div>

          {userEmail && (
            <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-3 mb-6">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                <Mail className="w-4 h-4" />
                <span className="font-medium">{userEmail}</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                This email domain is not authorized
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="text-left bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
              <h3 className="font-bold text-sm mb-2">Allowed Email Domains:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  @mlrit.ac.in
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  @mlrinstitutions.ac.in
                </li>
              </ul>
            </div>

            <button
              onClick={handleLogout}
              className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <LogOut className="w-5 h-5" />
              Sign Out & Try Different Account
            </button>

            <p className="text-xs text-gray-600 mt-4">
              If you believe this is an error, please contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
