import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // 1. Get top post IDs and their weekly like counts via RPC
        const { data: weeklyStats, error: rpcError } = await supabase
            .rpc('get_weekly_top_posts', { limit_count: 5 });

        if (rpcError) {
            console.error('Error fetching weekly top posts RPC:', rpcError);
            return NextResponse.json({ error: 'Failed to fetch top posts' }, { status: 500 });
        }

        if (!weeklyStats || weeklyStats.length === 0) {
            return NextResponse.json({ posts: [] });
        }

        const postIds = weeklyStats.map((stat: any) => stat.post_id);

        // 2. Fetch full post details for these IDs
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select(`
        *,
        users:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
            .in('id', postIds);

        if (postsError) {
            console.error('Error fetching post details:', postsError);
            return NextResponse.json({ error: 'Failed to fetch post details' }, { status: 500 });
        }

        // 3. Sort posts to match the RPC order (since .in() doesn't preserve order)
        const postsMap = new Map(posts?.map(p => [p.id, p]));
        const sortedPosts = weeklyStats
            .map((stat: any) => postsMap.get(stat.post_id))
            .filter(Boolean); // Filter out any missing posts (shouldn't happen usually)

        // 4. Format for frontend
        const formattedPosts = sortedPosts.map((post: any) => ({
            id: post.id,
            user: {
                id: post.users.id,
                full_name: post.users.full_name || post.users.email,
                avatar_url: post.users.avatar_url,
            },
            content: post.content,
            image_urls: post.image_urls || [],
            tags: post.tags || [],
            likes_count: post.likes_count, // Keeping total likes for display, or we could inject weekly_likes
            comments_count: post.comments_count,
            created_at: post.created_at,
        }));

        return NextResponse.json({ posts: formattedPosts });

    } catch (error) {
        console.error('Error in top-weekly route:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
