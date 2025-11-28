import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkDomainAccess } from '@/lib/domain-check';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ hasAccess: false }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ hasAccess: false }, { status: 401 });
    }

    const hasAccess = checkDomainAccess(user.email || '');

    return NextResponse.json({ 
      hasAccess,
      email: user.email,
      allowedDomains: process.env.ALLOWED_DOMAINS?.split(',').map(d => d.trim()) || []
    });
  } catch (error) {
    console.error('Error checking domain access:', error);
    return NextResponse.json({ hasAccess: false }, { status: 500 });
  }
}
