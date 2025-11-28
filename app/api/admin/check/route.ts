import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('No auth header provided');
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log('Auth error or no user:', error);
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    // Check if user email is in admin list
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    const isAdmin = adminEmails.includes(user.email || '');

    console.log('User email:', user.email);
    console.log('Admin emails:', adminEmails);
    console.log('Is admin:', isAdmin);

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Error checking admin access:', error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
