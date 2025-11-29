import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create supabase client with service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all chat reports
    const { data: reports, error: reportsError } = await supabase
      .from('chat_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (reportsError) {
      console.error('Error fetching chat reports:', reportsError);
      return NextResponse.json({ error: 'Failed to fetch reports', details: reportsError.message }, { status: 500 });
    }

    // Get user details separately
    const reporterIds = [...new Set(reports?.map(r => r.reporter_id) || [])];
    const reportedUserIds = [...new Set(reports?.map(r => r.reported_user_id) || [])];
    const allUserIds = [...new Set([...reporterIds, ...reportedUserIds])];

    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url, is_banned, is_chat_banned')
      .in('id', allUserIds);

    // Merge user data with reports
    const reportsWithUsers = reports?.map(report => ({
      ...report,
      reporter: users?.find(u => u.id === report.reporter_id),
      reported_user: users?.find(u => u.id === report.reported_user_id),
    })) || [];

    return NextResponse.json({ reports: reportsWithUsers });
  } catch (error) {
    console.error('Error in chat reports API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
