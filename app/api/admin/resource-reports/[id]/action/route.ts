import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const { action } = await request.json();

    // Create authenticated supabase client
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

    // Get the flag details
    const { data: flag, error: flagError } = await supabaseWithAuth
      .from('resource_flags')
      .select('resource_id')
      .eq('id', id)
      .single();

    if (flagError || !flag) {
      console.error('Error fetching flag:', flagError);
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    if (action === 'remove_resource') {
      // Delete the resource
      const { error: deleteError } = await supabaseWithAuth
        .from('resources')
        .delete()
        .eq('id', flag.resource_id);

      if (deleteError) {
        console.error('Error deleting resource:', deleteError);
        return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
      }

      // Update flag status
      await supabaseWithAuth
        .from('resource_flags')
        .update({ status: 'reviewed' })
        .eq('id', id);

    } else if (action === 'dismiss') {
      // Update flag status to dismissed
      await supabaseWithAuth
        .from('resource_flags')
        .update({ status: 'dismissed' })
        .eq('id', id);

      // Update resource status back to approved
      await supabaseWithAuth
        .from('resources')
        .update({ status: 'approved' })
        .eq('id', flag.resource_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in resource report action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
