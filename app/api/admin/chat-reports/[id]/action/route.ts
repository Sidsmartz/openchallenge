import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { action, notes } = await request.json();
    const { id: reportId } = await params;

    if (!action || !['ban_chat', 'ban_all', 'dismiss'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the report to find the reported user
    const { data: report, error: reportError } = await supabase
      .from('chat_reports')
      .select('reported_user_id')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Take action based on type
    if (action === 'ban_chat') {
      // Ban user from chat only
      await supabase
        .from('users')
        .update({
          is_chat_banned: true,
          chat_ban_reason: notes || 'Reported for inappropriate chat behavior',
          chat_banned_at: new Date().toISOString(),
          chat_banned_by: user.id,
        })
        .eq('id', report.reported_user_id);
    } else if (action === 'ban_all') {
      // Ban user from everything
      await supabase
        .from('users')
        .update({
          is_banned: true,
          is_chat_banned: true,
          chat_ban_reason: notes || 'Reported for inappropriate behavior',
          chat_banned_at: new Date().toISOString(),
          chat_banned_by: user.id,
        })
        .eq('id', report.reported_user_id);
    }

    // Update report status
    const { error: updateError } = await supabase
      .from('chat_reports')
      .update({
        status: action === 'dismiss' ? 'dismissed' : 'action_taken',
        admin_notes: notes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (updateError) {
      console.error('Error updating report:', updateError);
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing chat report action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
