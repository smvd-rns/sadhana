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
        const roles = Array.isArray(userData.role) ? userData.role : [userData.role];
        if (!roles.includes(8)) {
            return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
        }

        // Perform Action
        const tableMap: Record<string, string> = {
            'center': 'centers',
            'city': 'cities',
            'counselor': 'counselors'
        };
        const tableName = tableMap[type];

        if (!tableName) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

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

        return NextResponse.json({ success: true, count: targetIds.length });
    } catch (error: any) {
        console.error('Admin verify error:', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
