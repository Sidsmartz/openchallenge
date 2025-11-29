import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { alumniId, action } = await request.json();

    if (!alumniId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'approve') {
      // Approve the alumni account
      const { error: updateError } = await supabase
        .from('users')
        .update({ approval_status: 'approved' })
        .eq('id', alumniId)
        .eq('role', 'alumni');

      if (updateError) {
        console.error('Error approving alumni:', updateError);
        return NextResponse.json({ error: 'Failed to approve alumni' }, { status: 500 });
      }

      // Create notification for the alumni
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: alumniId,
          type: 'account_approved',
          title: 'Account Approved! 🎉',
          message: 'Your alumni account has been approved. You now have full access to the platform!',
          is_read: false,
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      }

      return NextResponse.json({ success: true, message: 'Alumni approved successfully' });
    } else if (action === 'reject') {
      // Reject the alumni account
      const { error: updateError } = await supabase
        .from('users')
        .update({ approval_status: 'rejected' })
        .eq('id', alumniId)
        .eq('role', 'alumni');

      if (updateError) {
        console.error('Error rejecting alumni:', updateError);
        return NextResponse.json({ error: 'Failed to reject alumni' }, { status: 500 });
      }

      // Create notification for the alumni
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: alumniId,
          type: 'account_rejected',
          title: 'Account Application Update',
          message: 'Your alumni account application has been reviewed. Please contact support for more information.',
          is_read: false,
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      }

      return NextResponse.json({ success: true, message: 'Alumni rejected' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in approve-alumni route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
