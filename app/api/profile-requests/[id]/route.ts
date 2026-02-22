import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const debugLogs: string[] = [];
    const log = (msg: string) => {
        console.log(msg); // Forced console log for debugging
        debugLogs.push(msg);
    };

    try {
        const { id } = params;
        log(`Processing PATCH for ID: ${id}`);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            log('Server configuration error');
            return NextResponse.json({ error: 'Server configuration error', debug: debugLogs }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            log('Missing authorization header');
            return NextResponse.json({ error: 'Missing authorization header', debug: debugLogs }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !adminUser) {
            log(`Auth error: ${authError?.message}`);
            return NextResponse.json({ error: 'Invalid token', debug: debugLogs }, { status: 401 });
        }

        // Verify admin role (Role 8 or 11)
        const { data: adminData } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', adminUser.id)
            .single();

        log(`Admin loaded: ${adminUser.id}, Role Data: ${JSON.stringify(adminData)}`);

        const roles = Array.isArray(adminData?.role) ? adminData.role : [adminData?.role];
        const isSuperAdmin = roles.some((r: any) => r === 8 || r === 'super_admin' || r === 'admin');

        const isGlobalAdmin = roles.some((r: any) =>
            [12, 13].includes(Number(r)) ||
            ['director', 'central_voice_manager'].includes(String(r))
        );

        const isTempleAdmin = roles.some((r: any) =>
            [11, 14, 15, 16, 17, 21].includes(Number(r)) ||
            ['managing_director', 'project_advisor', 'project_manager', 'acting_manager', 'oc', 'youth_preacher'].includes(String(r))
        );

        log(`Roles check: Super=${isSuperAdmin}, Global=${isGlobalAdmin}, Temple=${isTempleAdmin}`);

        if (!isSuperAdmin && !isGlobalAdmin && !isTempleAdmin) {
            return NextResponse.json({ error: 'Unauthorized', debug: debugLogs }, { status: 403 });
        }

        const body = await request.json();
        const { status, feedback, approvedFields } = body;
        log(`Status: ${status}, ApprovedFields: ${JSON.stringify(approvedFields)}`);

        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status', debug: debugLogs }, { status: 400 });
        }

        // Fetch the request
        const { data: profileRequest, error: fetchError } = await supabaseAdmin
            .from('profile_update_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !profileRequest) {
            log(`Fetch error: ${fetchError?.message}`);
            return NextResponse.json({ error: 'Request not found', debug: debugLogs }, { status: 404 });
        }

        // Temple Scoped Security for Temple Admins (MDs, OCs, etc.)
        if (isTempleAdmin && !isSuperAdmin && !isGlobalAdmin) {
            log('Applying temple scoped security');
            const { data: targetUser } = await supabaseAdmin
                .from('users')
                .select('hierarchy')
                .eq('id', profileRequest.user_id)
                .single();

            const { data: adminFullData } = await supabaseAdmin
                .from('users')
                .select('hierarchy')
                .eq('id', adminUser.id)
                .single();

            const adminTemple = adminFullData?.hierarchy?.currentTemple?.name || adminFullData?.hierarchy?.currentTemple;
            const userTemple = targetUser?.hierarchy?.currentTemple?.name || targetUser?.hierarchy?.currentTemple;

            const adminT = (typeof adminTemple === 'string' ? adminTemple : adminTemple?.name || '').trim().toLowerCase();
            const userT = (typeof userTemple === 'string' ? userTemple : userTemple?.name || '').trim().toLowerCase();

            log(`Temple Check: AdminTemple=${adminT}, UserTemple=${userT}`);

            if (!adminT || adminT !== userT) {
                return NextResponse.json({ error: 'Unauthorized: Temple mismatch', debug: debugLogs }, { status: 403 });
            }
        }

        if (profileRequest.status !== 'pending') {
            return NextResponse.json({ error: 'Request already processed', debug: debugLogs }, { status: 400 });
        }

        if (status === 'approved') {
            let requestedChanges = profileRequest.requested_changes || {}; // Safety default
            const userId = profileRequest.user_id;

            // If selective approval is requested, filter the changes
            if (approvedFields && Array.isArray(approvedFields)) {
                const filteredChanges: any = {};
                approvedFields.forEach((field: string) => {
                    if (requestedChanges[field] !== undefined) {
                        filteredChanges[field] = requestedChanges[field];
                    }
                });
                requestedChanges = filteredChanges;
            }

            // Prepare database column updates
            const dbUpdates: any = {
                updated_at: new Date().toISOString()
            };

            // Map frontend fields (camelCase usually in requested_changes) to snake_case DB columns
            if (requestedChanges.initiationStatus !== undefined) dbUpdates.initiation_status = requestedChanges.initiationStatus;
            if (requestedChanges.initiatedName !== undefined) dbUpdates.initiated_name = requestedChanges.initiatedName;
            if (requestedChanges.spiritualMasterName !== undefined) dbUpdates.spiritual_master_name = requestedChanges.spiritualMasterName;
            if (requestedChanges.aspiringSpiritualMasterName !== undefined) dbUpdates.aspiring_spiritual_master_name = requestedChanges.aspiringSpiritualMasterName;

            // Safe integer parsing for rounds
            if (requestedChanges.rounds !== undefined) {
                const roundsVal = parseInt(String(requestedChanges.rounds));
                dbUpdates.rounds = isNaN(roundsVal) ? null : roundsVal;
            }

            if (requestedChanges.introducedToKcIn !== undefined) dbUpdates.introduced_to_kc_in = requestedChanges.introducedToKcIn;
            if (requestedChanges.ashram !== undefined) dbUpdates.ashram = requestedChanges.ashram;
            if (requestedChanges.parentTemple !== undefined) dbUpdates.parent_temple = requestedChanges.parentTemple;
            if (requestedChanges.parentCenter !== undefined) dbUpdates.parent_center = requestedChanges.parentCenter;
            if (requestedChanges.currentTemple !== undefined) dbUpdates.current_temple = requestedChanges.currentTemple;
            if (requestedChanges.currentCenter !== undefined) dbUpdates.current_center = requestedChanges.currentCenter;
            if (requestedChanges.counselor !== undefined) dbUpdates.counselor = requestedChanges.counselor;
            if (requestedChanges.otherCounselor !== undefined) dbUpdates.other_counselor = requestedChanges.otherCounselor;
            if (requestedChanges.otherCenter !== undefined) dbUpdates.other_center = requestedChanges.otherCenter;
            if (requestedChanges.otherParentCenter !== undefined) dbUpdates.other_parent_center = requestedChanges.otherParentCenter;

            // Fetch current user to get existing hierarchy for merger
            const { data: currentUser } = await supabaseAdmin
                .from('users')
                .select('hierarchy')
                .eq('id', userId)
                .single();

            const updatedHierarchy = {
                ...(currentUser?.hierarchy || {}),
                ...requestedChanges
            };
            dbUpdates.hierarchy = updatedHierarchy;

            log(`Applying updates to user ${userId}`);

            // Apply updates to the user
            const { error: updateUserError } = await supabaseAdmin
                .from('users')
                .update(dbUpdates)
                .eq('id', userId);

            if (updateUserError) {
                log(`User update error: ${updateUserError.message}`);
                return NextResponse.json({ error: 'Failed to apply changes to user profile', debug: debugLogs }, { status: 500 });
            }
        }

        // Update the request status
        const { error: updateRequestError } = await supabaseAdmin
            .from('profile_update_requests')
            .update({
                status,
                admin_feedback: feedback || null, // Save feedback even if approved
                reviewed_by: adminUser.id,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateRequestError) {
            log(`Request update error: ${updateRequestError.message}`);
            return NextResponse.json({ error: 'Failed to update request status', debug: debugLogs }, { status: 500 });
        }

        return NextResponse.json({ success: true, debug: debugLogs });

    } catch (error: any) {
        console.error('API Error:', error);
        log(`CRITICAL EXCEPTION: ${error.message}\nStack: ${error.stack}`);
        return NextResponse.json({ error: 'Internal server error', details: error.message, debug: debugLogs }, { status: 500 });
    }
}
