import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, id, ids, action } = body;

        if (!type || (!id && (!ids || ids.length === 0)) || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Robust ID handling: flatten any arrays and filter out falsy values
        const targetIds = [
            ...(Array.isArray(ids) ? ids : (ids ? [ids] : [])),
            ...(Array.isArray(id) ? id : (id ? [id] : []))
        ].filter(Boolean);

        if (targetIds.length === 0) {
            return NextResponse.json({ error: 'No valid IDs provided' }, { status: 400 });
        }

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
        const allowedRoles = [8, 11, 12, 13, 14, 15, 16, 17, 2, 20];

        const isSuperAdmin = roles.some((r: any) => Number(r) === 8 || String(r) === 'super_admin');
        const isCounselor = roles.some((r: any) => [2, 20].includes(Number(r)) || ['counselor', 'care_giver'].includes(String(r)));
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

            // Counselor Scoping Check for Users
            if (isCounselor && !isSuperAdmin) {
                const adminEmail = user.email;
                if (!adminEmail) {
                    return NextResponse.json({ error: 'Unauthorized: Admin email missing' }, { status: 403 });
                }

                const normalizedAdminEmail = adminEmail.trim().toLowerCase();

                // Lookup Counselor ID and Name
                const { data: counselorData } = await supabase
                    .from('counselors')
                    .select('id, name')
                    .eq('email', normalizedAdminEmail)
                    .maybeSingle();

                const counselorName = counselorData?.name ? counselorData.name.trim().toLowerCase() : null;
                const adminCounselorId = counselorData?.id || null;

                // Fetch target users to verify counselor email/ID match
                const { data: targetUsers, error: targetError } = await supabase
                    .from('users')
                    .select('id, hierarchy, counselor_id, other_counselor')
                    .in('id', targetIds);

                if (targetError || !targetUsers) {
                    return NextResponse.json({ error: 'Failed to verify target users' }, { status: 500 });
                }

                // NEW: Fetch profile requests to check for requested counselors
                const { data: pReqs } = await supabase
                    .from('profile_update_requests')
                    .select('user_id, requested_changes')
                    .in('user_id', targetIds)
                    .eq('status', 'pending');

                const userToRequested = new Map<string, { emails: string[], names: string[] }>();
                if (pReqs) {
                    pReqs.forEach((r: any) => {
                        const rC = r.requested_changes || {};
                        const emails: string[] = [];
                        const names: string[] = [];
                        if (rC.brahmachariCounselorEmail) emails.push(rC.brahmachariCounselorEmail.trim().toLowerCase());
                        if (rC.grihasthaCounselorEmail) emails.push(rC.grihasthaCounselorEmail.trim().toLowerCase());
                        if (rC.brahmachariCounselor) names.push(rC.brahmachariCounselor.trim().toLowerCase());
                        if (rC.grihasthaCounselor) names.push(rC.grihasthaCounselor.trim().toLowerCase());
                        userToRequested.set(r.user_id, { emails, names });
                    });
                }

                const allMatch = targetUsers.every(u => {
                    const uH = u.hierarchy || {};
                    const bE = (uH.brahmachariCounselorEmail || '').trim().toLowerCase();
                    const gE = (uH.grihasthaCounselorEmail || '').trim().toLowerCase();
                    const bN = (uH.brahmachariCounselor || '').trim().toLowerCase();
                    const gN = (uH.grihasthaCounselor || '').trim().toLowerCase();
                    const uE = (uH.counselorEmail || '').trim().toLowerCase();
                    const uN = (uH.counselor || '').trim().toLowerCase();

                    // Authority via Stable ID (Preferred)
                    if (adminCounselorId && u.counselor_id === adminCounselorId) return true;

                    // Authority via Current Counselor (Email or Name - Legacy & Unified)
                    if (bE === normalizedAdminEmail || gE === normalizedAdminEmail || uE === normalizedAdminEmail) return true;
                    if (counselorName && (bN === counselorName || gN === counselorName || uN === counselorName)) return true;

                    // Authority via "Other" Counselor Name match
                    if (uN === 'other' && (u.other_counselor || uH.otherCounselor)) {
                        const otherN = (u.other_counselor || uH.otherCounselor || '').trim().toLowerCase();
                        if (counselorName && otherN === counselorName) return true;
                    }

                    // Authority via Requested Counselor
                    const reqObj = userToRequested.get(u.id);
                    if (reqObj) {
                        if (reqObj.emails.includes(normalizedAdminEmail)) return true;
                        if (counselorName && reqObj.names.includes(counselorName)) return true;
                    }
                    return false;
                });

                if (!allMatch) {
                    return NextResponse.json({ error: 'Unauthorized: Some users are not assigned to you' }, { status: 403 });
                }
            }

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

            // NEW: Processing Side Effects (Emails & Membership IDs) if Approved
            if (action === 'approve') {
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
                const { sendApprovalNotification } = await import('@/lib/utils/email');
                const { generateMembershipIdForUser } = await import('@/lib/utils/membership');

                for (const userId of targetIds) {
                    try {
                        const { data: userDetails } = await supabase
                            .from('users')
                            .select('email, name')
                            .eq('id', userId)
                            .single();

                        if (userDetails?.email) {
                            // Trigger welcome email
                            await sendApprovalNotification(userDetails.email, userDetails.name || 'Devotee', `${baseUrl}/dashboard`);
                            
                            // Generate Membership ID
                            try {
                                await generateMembershipIdForUser(supabase, userId);
                            } catch (genErr) {
                                console.error(`Failed to generate membership ID for ${userId} in verify-data:`, genErr);
                            }
                        }
                    } catch (sideEffectError) {
                        console.error(`Error in side effects for user ${userId}:`, sideEffectError);
                    }
                }
            }

        } else {
            // Non-user types (centers, cities, counselors) still require higher levels or super admin
            if (isCounselor && !isSuperAdmin) {
                return NextResponse.json({ error: 'Forbidden: Counselor can only verify students' }, { status: 403 });
            }

            if (action === 'approve') {
                const { error } = await supabase
                    .from(tableName)
                    .update({ is_verified: true })
                    .in('id', targetIds);

                if (error) throw error;
                
                if (tableName === 'centers') revalidateTag('centers');
                if (tableName === 'cities') revalidateTag('cities');
            } else if (action === 'reject') {
                const { error } = await supabase
                    .from(tableName)
                    .delete()
                    .in('id', targetIds);

                if (error) throw error;

                if (tableName === 'centers') revalidateTag('centers');
                if (tableName === 'cities') revalidateTag('cities');
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
