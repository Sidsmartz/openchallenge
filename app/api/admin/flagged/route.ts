import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get flagged posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        status,
        flagged_reason,
        created_at,
        user:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('status', 'flagged')
      .order('created_at', { ascending: false });

    // Get flagged comments
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        status,
        flagged_reason,
        created_at,
        post_id,
        user:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('status', 'flagged')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      posts: posts || [],
      comments: comments || [],
    });
  } catch (error) {
    console.error('Error fetching flagged content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
