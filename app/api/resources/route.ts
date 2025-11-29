import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');

    let query = supabase
      .from('resources')
      .select(`
        *,
        user:user_id(id, full_name, email, avatar_url)
      `)
      .eq('status', 'approved');

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply category/tag filter
    if (tags) {
      const tagArray = tags.split(',');
      query = query.in('category', tagArray);
    }

    const { data: resources, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching resources:', error);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    return NextResponse.json({ resources: resources || [] });
  } catch (error) {
    console.error('Error in resources API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const { title, description, category, file_url, file_name, file_type } = await request.json();

    if (!title || !file_url) {
      return NextResponse.json({ error: 'Title and file are required' }, { status: 400 });
    }

    // Create resource with user's auth context
    const supabaseWithAuth = createClient(
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

    const { data: resource, error } = await supabaseWithAuth
      .from('resources')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        category: category || null,
        file_url,
        file_name,
        file_type,
        status: 'approved', // Auto-approve for now, can add moderation later
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating resource:', error);
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }

    return NextResponse.json({ resource });
  } catch (error) {
    console.error('Error in resources POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
