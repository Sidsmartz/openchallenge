import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get current user (optional for feed viewing)
    const authHeader = request.headers.get('authorization');
    let user = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }

    // Query published posts with user information
    const { data: posts, error: postsError, count } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // If user is logged in, check which posts they've liked
    let userLikes: string[] = [];
    if (user) {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);
      
      userLikes = likes?.map(like => like.post_id) || [];
    }

    // Format posts with user like status
    const formattedPosts = posts?.map(post => ({
      id: post.id,
      user: {
        id: post.users.id,
        full_name: post.users.full_name || post.users.email,
        avatar_url: post.users.avatar_url,
      },
      content: post.content,
      image_urls: post.image_urls || [],
      likes_count: post.likes_count,
      comments_count: post.comments_count,
      created_at: post.created_at,
      user_has_liked: userLikes.includes(post.id),
    })) || [];

    return NextResponse.json({
      posts: formattedPosts,
      total: count || 0,
      page,
      has_more: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error('Error in posts feed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
