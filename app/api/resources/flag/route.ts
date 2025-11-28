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

    const { resourceId } = await request.json();

    if (!resourceId) {
      return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 });
    }

    // Create resource flag
    const { data: flag, error: flagError } = await supabase
      .from('resource_flags')
      .insert({
        resource_id: resourceId,
        flagger_id: user.id,
        reason: 'Inappropriate content',
        status: 'pending',
      })
      .select()
      .single();

    if (flagError) {
      console.error('Error creating resource flag:', flagError);
      return NextResponse.json({ error: 'Failed to flag resource' }, { status: 500 });
    }

    // Update resource status to flagged
    await supabase
      .from('resources')
      .update({ status: 'flagged' })
      .eq('id', resourceId);

    return NextResponse.json({ success: true, flag });
  } catch (error) {
    console.error('Error flagging resource:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
