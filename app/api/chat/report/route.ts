import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create supabase client with user's auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, reportedUserId, reason } = await request.json();

    if (!conversationId || !reportedUserId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create chat report
    const { data: report, error: reportError } = await supabase
      .from('chat_reports')
      .insert({
        conversation_id: conversationId,
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason: reason,
        status: 'pending',
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating chat report:', reportError);
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    // Notify admins (you can implement email notification here)
    console.log('Chat reported:', report);

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Error reporting chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
