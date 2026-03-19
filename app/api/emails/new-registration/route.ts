import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendRegistrationNotification } from '@/lib/utils/email';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const supabase = getAdminClient();
        
        // Fetch the new user
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !newUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 1. Find the center this user belongs to
        const userCenterName = newUser.hierarchy?.currentCenter;
        if (!userCenterName) {
            return NextResponse.json({ error: 'User has no center assigned' }, { status: 400 });
        }

        // 2. Fetch the specific center to find its PM and Acting Manager
        const { data: center, error: centerError } = await supabase
            .from('centers')
            .select('project_manager_id, acting_manager_id')
            .eq('name', userCenterName)
            .single();

        if (centerError || !center) {
            return NextResponse.json({ error: 'Center not found' }, { status: 404 });
        }

        const managerIdsToNotify = [];
        if (center.project_manager_id) managerIdsToNotify.push(center.project_manager_id);
        if (center.acting_manager_id) managerIdsToNotify.push(center.acting_manager_id);

        if (managerIdsToNotify.length === 0) {
            return NextResponse.json({ success: true, emailsSent: 0, message: 'No managers assigned to this center' });
        }

        // 3. Fetch ONLY those specific managers
        const { data: notifyManagers, error: managersError } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', managerIdsToNotify);
        
        if (managersError || !notifyManagers) {
             return NextResponse.json({ error: 'Failed to fetch managers' }, { status: 500 });
        }


        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        
        // Simple secure token for 1-click approve
        const secret = process.env.EMAIL_APPROVAL_SECRET || 'fallback_secret_123';
        const token = crypto.createHmac('sha256', secret).update(userId).digest('hex');
        const approveLink = `${baseUrl}/api/emails/approve?userId=${userId}&token=${token}`;

        let emailsSent = 0;
        for (const manager of notifyManagers) {
             if (manager.email) {
                 await sendRegistrationNotification(manager.email, manager.name || 'Manager', newUser, approveLink);
                 emailsSent++;
             }
        }

        return NextResponse.json({ success: true, emailsSent });
    } catch (error) {
        console.error('API /emails/new-registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
