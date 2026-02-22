import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, id, ids, action } = body; // Support both single 'id' and bulk 'ids'

        if (!type || (!id && (!ids || ids.length === 0)) || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const targetIds = ids || [id];

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Use Service Role Key to bypass RLS for admin actions
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // Verify the requester is an admin (Role 8)
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check role in users table
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 401 });
        }

        // Check if role 8 (Super Admin) is present
        // Role can be number or array
        // Check if role 8 (Super Admin) or MD/Extended Roles are present
        const roles = Array.isArray(userData.role) ? userData.role : [userData.role];
        const allowedRoles = [8, 11, 12, 13, 14, 15, 16, 17];

        const hasPermission = roles.some((r: any) => allowedRoles.includes(Number(r)));

        if (!hasPermission) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Perform Action
        const tableMap: Record<string, string> = {
            'center': 'centers',
            'city': 'cities',
            'counselor': 'counselors',
            'user': 'users'
        };
        const tableName = tableMap[type];

        if (!tableName) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        if (tableName === 'users') {
            const { reason } = body;
            const updateData: any = {
                reviewed_at: new Date().toISOString(),
                reviewed_by: user.id
            };

            if (action === 'approve') {
                updateData.verification_status = 'approved';
                updateData.rejection_reason = null; // Clear any previous reason
            } else if (action === 'reject') {
                updateData.verification_status = 'rejected';
                updateData.rejection_reason = reason || null;
            } else {
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
            }

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .in('id', targetIds);

            if (error) throw error;

        } else {
            if (action === 'approve') {
                const { error } = await supabase
                    .from(tableName)
                    .update({ is_verified: true })
                    .in('id', targetIds);

                if (error) throw error;
            } else if (action === 'reject') {
                const { error } = await supabase
                    .from(tableName)
                    .delete()
                    .in('id', targetIds);

                if (error) throw error;
            } else {
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
            }
        }

        return NextResponse.json({ success: true, count: targetIds.length });
    } catch (error: any) {
        console.error('Admin verify error:', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
