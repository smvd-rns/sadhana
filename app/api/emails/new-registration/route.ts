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
            .select('id, name, email, hierarchy')
            .eq('id', userId)
            .single();

        if (userError || !newUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Determine recipients based on hierarchy
        const userCenterName = newUser.hierarchy?.currentCenter;
        const userTempleName = newUser.hierarchy?.currentTemple;
        
        let managerIdsToNotify: string[] = [];
        let notifyByRole8 = false;

        // 1. If Center is selected (and not None)
        if (userCenterName && userCenterName !== 'None' && userCenterName !== 'None/None') {
            const { data: center } = await supabase
                .from('centers')
                .select('project_manager_id, acting_manager_id')
                .eq('name', userCenterName)
                .single();

            if (center) {
                if (center.project_manager_id) managerIdsToNotify.push(center.project_manager_id);
                if (center.acting_manager_id) managerIdsToNotify.push(center.acting_manager_id);
            }
        }

        // 2. If no IDs yet (either Center was None or Center had no managers), check if Temple is selected
        if (managerIdsToNotify.length === 0 && userTempleName && userTempleName !== 'None' && userTempleName !== 'None/None') {
            const { data: temple } = await supabase
                .from('temples')
                .select('central_voice_manager_id')
                .eq('name', userTempleName)
                .single();

            if (temple && temple.central_voice_manager_id) {
                managerIdsToNotify.push(temple.central_voice_manager_id);
            }
        }

        // 3. If still no IDs, notify Super Admins (Role 8)
        if (managerIdsToNotify.length === 0) {
            notifyByRole8 = true;
        }

        let notifyManagers: { id: string, name: string, email: string }[] = [];

        if (notifyByRole8) {
            const { data: superAdmins, error: saError } = await supabase
                .from('users')
                .select('id, name, email')
                .contains('role', [8]); // Role 8 in array

            if (saError) {
                // Try literal 8 if array check fails (depends on how roles are stored)
                const { data: saLiteral } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .eq('role', 8);
                notifyManagers = saLiteral || [];
            } else {
                notifyManagers = superAdmins || [];
            }
        } else if (managerIdsToNotify.length > 0) {
            const { data: managers, error: managersError } = await supabase
                .from('users')
                .select('id, name, email')
                .in('id', managerIdsToNotify);
            
            if (!managersError && managers) {
                notifyManagers = managers;
            }
        }

        if (notifyManagers.length === 0) {
            return NextResponse.json({ success: true, emailsSent: 0, message: 'No recipients found for notification' });
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
