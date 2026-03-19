import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = getAdminClient();
        
        // Auth check (must be super admin)
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Check Permissions (only Super Admin role 8)
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role')
            .eq('id', adminUser.id)
            .single();
            
        if (!adminProfile) {
            return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
        }
        
        const roles = Array.isArray(adminProfile.role) ? adminProfile.role : [adminProfile.role];
        const roleNums = roles.map((r: any) => Number(r));
        const isSuperAdmin = roleNums.includes(8) || roles.includes('super_admin');
        
        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden. Only Super Admins can delete users.' }, { status: 403 });
        }

        const userIdToDelete = params.id;
        if (!userIdToDelete) {
             return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // 1. Delete from public.users table
        const { error: dbError } = await supabase
            .from('users')
            .delete()
            .eq('id', userIdToDelete);

        if (dbError) {
             console.error('Error deleting from public.users:', dbError);
             return NextResponse.json({ error: 'Failed to delete user profile data' }, { status: 500 });
        }

        // 2. Delete from Supabase Auth
        // If they don't exist in auth, this might just fail, but that's fine.
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userIdToDelete);
        
        if (authDeleteError) {
             console.error('Error deleting from auth.users (may not exist):', authDeleteError);
        }

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Error in delete user API:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
