import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();
  
  // Get the auth token from cookies
  const authToken = cookieStore.get('sb-fqsqytljezwtfpmegktr-auth-token');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // If we have an auth token, set it
  if (authToken?.value) {
    try {
      const tokenData = JSON.parse(authToken.value);
      if (tokenData.access_token) {
        supabase.auth.setSession({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
        });
      }
    } catch (e) {
      console.error('Error parsing auth token:', e);
    }
  }
  
  return supabase;
}
