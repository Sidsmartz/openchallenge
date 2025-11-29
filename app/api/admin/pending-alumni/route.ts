import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get pending alumni accounts
    const { data: pendingAlumni, error: queryError } = await supabase
      .from('users')
      .select('id, email, full_name, graduating_batch, current_company, current_job_title, created_at, avatar_url')
      .eq('role', 'alumni')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('Error fetching pending alumni:', queryError);
      return NextResponse.json({ error: 'Failed to fetch pending alumni' }, { status: 500 });
    }

    return NextResponse.json({ alumni: pendingAlumni || [] });
  } catch (error) {
    console.error('Error in pending-alumni route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
