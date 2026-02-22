import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const debugLogs: string[] = [];
    const log = (msg: string) => {
        console.log(msg); // Forced console log for debugging
        debugLogs.push(msg);
    };

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !serviceRoleKey) {
            log('Server configuration error');
            return NextResponse.json({ error: 'Server configuration error', debug: debugLogs }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            log(`Auth error: ${authError?.message}`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const roles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
        const isSuperAdmin = roles.some((r: any) => r === 8 || r === 'super_admin' || r === 'admin');

        const isGlobalAdmin = roles.some((r: any) =>
            [12, 13].includes(Number(r)) ||
            ['director', 'central_voice_manager'].includes(String(r))
        );

        const isTempleAdmin = roles.some((r: any) =>
            [11, 14, 15, 16, 17, 21].includes(Number(r)) ||
            ['managing_director', 'project_advisor', 'project_manager', 'acting_manager', 'oc', 'youth_preacher'].includes(String(r))
        );

        log(`Batch Batch Roles check: Super=${isSuperAdmin}, Global=${isGlobalAdmin}, Temple=${isTempleAdmin}`);

        if (!isSuperAdmin && !isGlobalAdmin && !isTempleAdmin) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions', debug: debugLogs }, { status: 403 });
        }

        const { requestIds, status, feedback } = await request.json();

        if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
            return NextResponse.json({ error: 'Invalid request: No IDs provided' }, { status: 400 });
        }

        // Temple Scoped Security for Temple Admin (Batch)
        let adminTemple = '';
        if (isTempleAdmin && !isSuperAdmin && !isGlobalAdmin) {
            const { data: adminFullData } = await supabase
                .from('users')
                .select('hierarchy')
                .eq('id', user.id)
                .single();

            const adminT = adminFullData?.hierarchy?.currentTemple?.name || adminFullData?.hierarchy?.currentTemple;
            adminTemple = (typeof adminT === 'string' ? adminT : adminT?.name || '').trim().toLowerCase();

            if (!adminTemple) {
                return NextResponse.json({ error: 'Forbidden: No temple assigned to Admin', debug: debugLogs }, { status: 403 });
            }
        }

        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        log(`Batch processing ${requestIds.length} requests as ${status}`);

        const results = [];
        let successCount = 0;
        let failCount = 0;

        // Process each request
        for (const id of requestIds) {
            try {
                // 1. Fetch the request details
                const { data: requestData, error: fetchError } = await supabase
                    .from('profile_update_requests')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (fetchError || !requestData) {
                    results.push({ id, success: false, error: 'Request not found' });
                    failCount++;
                    continue;
                }

                if (requestData.status !== 'pending') {
                    results.push({ id, success: false, error: 'Request is not pending' });
                    failCount++;
                    continue;
                }

                // Temple Scoping check for MD
                if (isTempleAdmin && !isSuperAdmin && !isGlobalAdmin && adminTemple) {
                    const { data: userHierarchy } = await supabase
                        .from('users')
                        .select('hierarchy')
                        .eq('id', requestData.user_id)
                        .single();

                    const userT = userHierarchy?.hierarchy?.currentTemple?.name || userHierarchy?.hierarchy?.currentTemple;
                    const userTempleName = (typeof userT === 'string' ? userT : userT?.name || '').trim().toLowerCase();

                    if (adminTemple !== userTempleName) {
                        results.push({ id, success: false, error: 'Unauthorized: Temple mismatch' });
                        failCount++;
                        continue;
                    }
                }

                // 2. If approved, update the user profile
                if (status === 'approved') {
                    const requestedChanges = requestData.requested_changes || {};
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
                    const { data: currentUser } = await supabase
                        .from('users')
                        .select('hierarchy')
                        .eq('id', requestData.user_id)
                        .single();

                    const updatedHierarchy = {
                        ...(currentUser?.hierarchy || {}),
                        ...requestedChanges
                    };
                    dbUpdates.hierarchy = updatedHierarchy;

                    // Update user table
                    const { error: updateError } = await supabase
                        .from('users')
                        .update(dbUpdates)
                        .eq('id', requestData.user_id);

                    if (updateError) {
                        throw new Error(`Failed to update user profile: ${updateError.message}`);
                    }
                }

                // 3. Update request status
                const { error: statusError } = await supabase
                    .from('profile_update_requests')
                    .update({
                        status: status,
                        admin_feedback: feedback || null,
                        reviewed_by: user.id, // Correct column name
                        reviewed_at: new Date().toISOString() // Correct column name
                    })
                    .eq('id', id);

                if (statusError) {
                    throw new Error(`Failed to update request status: ${statusError.message}`);
                }

                results.push({ id, success: true });
                successCount++;

            } catch (err: any) {
                console.error(`Error processing request ${id}:`, err);
                results.push({ id, success: false, error: err.message });
                failCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${requestIds.length} requests: ${successCount} successful, ${failCount} failed`,
            results,
            debug: debugLogs
        });

    } catch (error: any) {
        log(`Batch processing error: ${error.message}`);
        return NextResponse.json({ error: 'Internal server error', details: error.message, debug: debugLogs }, { status: 500 });
    }
}
