import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeContent } from '@/lib/moderation';

export async function POST(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - No auth header' },
        { status: 401 }
      );
    }

    // Create supabase client
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    console.log('Authenticated user:', user.id);

    // Check if user is banned
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_banned')
      .eq('id', user.id)
      .single();

    if (userError || userData?.is_banned) {
      return NextResponse.json(
        { error: 'You have been banned from posting' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const content = formData.get('content') as string;
    const images = formData.getAll('images') as File[];
    const tagsString = formData.get('tags') as string;
    const tags = tagsString ? JSON.parse(tagsString) : [];

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Content must be less than 5000 characters' },
        { status: 400 }
      );
    }

    // Create authenticated client for storage operations
    const authClient = createClient(
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

    // Upload images to Supabase Storage
    const imageUrls: string[] = [];
    
    for (const image of images) {
      if (image.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Image size must be less than 5MB' },
          { status: 400 }
        );
      }

      const fileExt = image.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await authClient.storage
        .from('post-images')
        .upload(fileName, image, {
          contentType: image.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload image', details: uploadError.message },
          { status: 500 }
        );
      }

      const { data: { publicUrl } } = authClient.storage
        .from('post-images')
        .getPublicUrl(uploadData.path);

      imageUrls.push(publicUrl);
    }

    // Create an admin client for database operations (bypasses RLS)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Analyze content with Perspective API
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || 'http://localhost:3000';
    const moderation = await analyzeContent(content, request.url.includes('localhost') ? 'http://localhost:3000' : baseUrl);
    
    const postStatus = moderation.shouldFlag ? 'flagged' : 'published';
    
    // Create post using admin client (bypasses RLS)
    console.log('Attempting to create post with user_id:', user.id);
    const { data: post, error: postError } = await adminClient
      .from('posts')
      .insert({
        user_id: user.id,
        content,
        image_urls: imageUrls,
        tags: tags,
        status: postStatus,
        toxicity_scores: moderation.isAvailable ? moderation.scores : null,
        flagged_reason: moderation.shouldFlag ? moderation.flaggedReason : null,
      })
      .select()
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      console.error('User ID:', user.id);
      console.error('Post data:', { user_id: user.id, content, status: postStatus });
      return NextResponse.json(
        { error: 'Failed to create post', details: postError.message },
        { status: 500 }
      );
    }

    // If flagged, add to moderation queue
    if (moderation.shouldFlag) {
      await adminClient.from('moderation_queue').insert({
        post_id: post.id,
        content_type: 'post',
        content,
        user_id: user.id,
        toxicity_scores: moderation.scores,
        review_status: 'pending',
      });
    }

    // Create notification
    const notificationType = moderation.shouldFlag ? 'post_flagged' : 'post_published';
    const notificationTitle = moderation.shouldFlag 
      ? 'Post Flagged for Review' 
      : 'Post Published Successfully';
    const notificationMessage = moderation.shouldFlag
      ? 'Your post has been flagged for review due to potentially offensive content. It will be reviewed by our moderation team.'
      : 'Your post has been published and is now visible to the community.';

    await adminClient.from('notifications').insert({
      user_id: user.id,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      related_post_id: post.id,
    });

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        status: postStatus,
      },
      message: moderation.shouldFlag 
        ? 'Post created but flagged for review' 
        : 'Post created successfully',
    });
  } catch (error) {
    console.error('Error in post creation:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
