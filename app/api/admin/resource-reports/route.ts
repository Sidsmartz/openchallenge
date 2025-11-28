import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
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

    // Get all resource flags with resource and user details
    const { data: flags, error } = await supabaseWithAuth
      .from('resource_flags')
      .select(`
        *,
        resource:resource_id(
          id,
          title,
          description,
          file_url,
          file_name,
          user:user_id(id, full_name, email)
        ),
        flagger:flagger_id(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching resource flags:', error);
      return NextResponse.json({ error: 'Failed to fetch resource flags' }, { status: 500 });
    }

    return NextResponse.json({ flags: flags || [] });
  } catch (error) {
    console.error('Error in resource reports API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
