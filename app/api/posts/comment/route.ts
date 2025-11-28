import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeContent } from '@/lib/moderation';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is banned
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_banned')
      .eq('id', user.id)
      .single();

    if (userError || userData?.is_banned) {
      return NextResponse.json(
        { error: 'You have been banned from commenting' },
        { status: 403 }
      );
    }

    const { postId, content } = await request.json();

    if (!postId || !content?.trim()) {
      return NextResponse.json({ error: 'Post ID and content are required' }, { status: 400 });
    }

    // Analyze content
    const baseUrl = request.url.includes('localhost') ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '');
    const moderation = await analyzeContent(content, baseUrl);
    
    const commentStatus = moderation.shouldFlag ? 'flagged' : 'published';
    
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Create comment
    const { data: comment, error: commentError } = await adminClient
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        status: commentStatus,
        toxicity_scores: moderation.isAvailable ? moderation.scores : null,
        flagged_reason: moderation.shouldFlag ? moderation.flaggedReason : null,
      })
      .select()
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Update comment count only for published comments
    if (commentStatus === 'published') {
      const { data: post } = await adminClient
        .from('posts')
        .select('comments_count, user_id')
        .eq('id', postId)
        .single();

      if (post) {
        await adminClient
          .from('posts')
          .update({ comments_count: post.comments_count + 1 })
          .eq('id', postId);

        // Notify post owner (if not commenting on own post)
        if (post.user_id !== user.id) {
          await adminClient.from('notifications').insert({
            user_id: post.user_id,
            type: 'new_comment',
            title: 'New Comment on Your Post',
            message: `Someone commented on your post: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            related_post_id: postId,
          });
        }
      }
    }

    // If flagged, add to moderation queue
    if (moderation.shouldFlag) {
      await adminClient.from('moderation_queue').insert({
        comment_id: comment.id,
        content_type: 'comment',
        content,
        user_id: user.id,
        toxicity_scores: moderation.scores,
        review_status: 'pending',
      });

      // Create notification for flagged comment
      await adminClient.from('notifications').insert({
        user_id: user.id,
        type: 'comment_flagged',
        title: 'Comment Flagged for Review',
        message: 'Your comment has been flagged for review due to potentially offensive content. It will be reviewed by our moderation team.',
        related_post_id: postId,
      });
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        status: commentStatus,
      },
      message: moderation.shouldFlag ? 'Comment flagged for review' : 'Comment posted',
    });
  } catch (error) {
    console.error('Error in comment creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
