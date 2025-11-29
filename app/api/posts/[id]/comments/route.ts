import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { id: postId } = await params;

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .eq('status', 'published')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    const formattedComments = comments?.map(comment => ({
      id: comment.id,
      user: {
        id: comment.users.id,
        full_name: comment.users.full_name || comment.users.email,
        avatar_url: comment.users.avatar_url,
      },
      content: comment.content,
      created_at: comment.created_at,
    })) || [];

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error('Error in comments fetch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
