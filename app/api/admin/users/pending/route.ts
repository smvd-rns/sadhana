import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // Auth check
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check Permissions
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role, hierarchy, current_temple, current_center, center_id')
            .eq('id', adminUser.id)
            .single();

        if (!adminProfile) {
            return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 });
        }

        const roles = Array.isArray(adminProfile.role) ? adminProfile.role : [adminProfile?.role];
        const roleNums = roles.map((r: any) => Number(r));

        // Roles
        const isSuperAdmin = roleNums.includes(8);
        const isTempleAdmin = roleNums.some((r: number) => [11, 12, 13].includes(r));
        const isCenterAdmin = roleNums.some((r: number) => [14, 15, 16, 17].includes(r));
        const isCounselor = roleNums.some((r: number) => [2, 20].includes(r));

        if (!isSuperAdmin && !isTempleAdmin && !isCenterAdmin && !isCounselor) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch user's allocated centers if they are a center admin
        let allocatedCenterIds: string[] = [];
        let allocatedCenterNames: string[] = [];

        if (isCenterAdmin) {
            const { data: userCenters } = await supabase
                .from('user_centers')
                .select('center_id, centers(name, id)')
                .eq('user_id', adminUser.id);

            if (userCenters) {
                userCenters.forEach((uc: any) => {
                    if (uc.center_id) allocatedCenterIds.push(uc.center_id);
                    if (uc.centers?.name) allocatedCenterNames.push(uc.centers.name);
                });
            }
        }

        console.log(`PendingUsers Debug: Admin=${adminUser.email} Roles=${roleNums} Temple=${adminProfile.current_temple} AllocatedCenters=${allocatedCenterNames.length}`);

        // 4. Fetch Pending Users
        // We fetch ALL pending users first, then filter in memory based on admin rights
        // This allows complex matching (fuzzy hierarchy, etc.) that is hard to do in SQL policies alone
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select('id, email, name, role, hierarchy, current_temple, current_center, center, center_id, verification_status')
            .eq('verification_status', 'pending');

        if (fetchError) {
            console.error('Error fetching users:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
        }
        // Helper to safely extract name from hierarchy field (string | object)
        const extractName = (val: any) => {
            if (!val) return '';
            if (typeof val === 'string') return val;
            return val.name || '';
        };

        // Normalize string for comparison
        const normalize = (str: string) => (str || '').trim().toLowerCase();

        // NEW: Fetch Counselor Name for the current admin
        const { data: adminCounselor } = await supabase
            .from('counselors')
            .select('name')
            .eq('email', normalize(adminUser.email || ''))
            .maybeSingle();

        const counselorName = adminCounselor?.name ? normalize(adminCounselor.name) : null;

        // NEW: Fetch all pending profile update requests to check for counselor changes
        const { data: profileRequests } = await supabase
            .from('profile_update_requests')
            .select('user_id, requested_changes')
            .eq('status', 'pending');

        const userToRequestedCounselor = new Map<string, { emails: string[], names: string[] }>();
        if (profileRequests) {
            profileRequests.forEach((req: any) => {
                const rC = req.requested_changes || {};
                const emails: string[] = [];
                const names: string[] = [];
                if (rC.brahmachariCounselorEmail) emails.push(normalize(rC.brahmachariCounselorEmail));
                if (rC.grihasthaCounselorEmail) emails.push(normalize(rC.grihasthaCounselorEmail));
                if (rC.brahmachariCounselor) names.push(normalize(rC.brahmachariCounselor));
                if (rC.grihasthaCounselor) names.push(normalize(rC.grihasthaCounselor));

                if (emails.length > 0 || names.length > 0) {
                    userToRequestedCounselor.set(req.user_id, { emails, names });
                }
            });
        }

        // ------------------------------------------------------------------
        // Filter Logic
        // ------------------------------------------------------------------
        const filteredUsers = (users || []).filter((user: any) => {
            // 1. Super Admin sees all
            if (isSuperAdmin) return true;

            const matches = [];

            // 2. Temple Admin: Check Temple Match ONLY (Strict)
            if (isTempleAdmin) {
                // Admin's Temple
                const adminTemple = normalize(adminProfile.current_temple || extractName(adminProfile.hierarchy?.currentTemple));

                // User's Temple
                const userTemple = normalize(user.current_temple || extractName(user.hierarchy?.currentTemple));

                if (adminTemple && userTemple && adminTemple === userTemple) {
                    matches.push(true);
                }
            }

            // 4. Counselor Admin: Check Counselor Email/Name Match (Dual Visibility)
            if (isCounselor) {
                const adminEmail = normalize(adminUser.email || '');
                if (adminEmail) {
                    const uH = user.hierarchy || {};
                    const bE = normalize(uH.brahmachariCounselorEmail || '');
                    const gE = normalize(uH.grihasthaCounselorEmail || '');
                    const bN = normalize(uH.brahmachariCounselor || '');
                    const gN = normalize(uH.grihasthaCounselor || '');

                    // Check Current Counselor (Email or Name)
                    const matchesCurrent = (bE === adminEmail || gE === adminEmail) ||
                        (counselorName && (bN === counselorName || gN === counselorName));

                    if (matchesCurrent) {
                        matches.push(true);
                    } else {
                        // Check if admin is the newly REQUESTED counselor (Email or Name)
                        const reqObj = userToRequestedCounselor.get(user.id);
                        if (reqObj) {
                            const matchesRequested = reqObj.emails.includes(adminEmail) ||
                                (counselorName && reqObj.names.includes(counselorName));
                            if (matchesRequested) {
                                matches.push(true);
                            }
                        }
                    }
                }
            }

            return matches.length > 0;
        });

        console.log(`PendingUsers Final Count: ${filteredUsers.length}`);

        return NextResponse.json({ success: true, data: filteredUsers });

    } catch (error: any) {
        console.error('Error fetching pending users:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
