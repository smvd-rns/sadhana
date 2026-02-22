import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Authenticate Requester
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const { data: { user: requesterUser }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !requesterUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Requester Profile & Permissions
        const { data: requesterProfile, error: profileError } = await supabase
            .from('users')
            .select('role, hierarchy, current_center')
            .eq('id', requesterUser.id)
            .single();

        if (profileError || !requesterProfile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
        }

        const requesterRoles = Array.isArray(requesterProfile.role) ? requesterProfile.role : [requesterProfile.role];
        // Allow Roles: 14 (PA), 15 (PM), 16 (AM) or Super Admin (8)
        const isAuthorized = requesterRoles.some((r: any) => [8, 14, 15, 16].includes(Number(r)));

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }

        // 3. Parse Request
        const body = await request.json();
        const { centerId, roleValue, userId } = body;

        if (!centerId || !roleValue) {
            return NextResponse.json({ error: 'Missing required fields: centerId, roleValue' }, { status: 400 });
        }

        // 4. Verify Scope
        // If not super admin, ensure requester manages this center
        const isSuperAdmin = requesterRoles.some((r: any) => Number(r) === 8);
        if (!isSuperAdmin) {
            // Check fetching by ID directly
            const { data: centerData } = await supabase
                .from('centers')
                .select('project_manager_id, project_advisor_id, acting_manager_id')
                .eq('id', centerId)
                .single();

            if (!centerData) return NextResponse.json({ error: 'Center not found' }, { status: 404 });

            const managesCenter =
                centerData.project_manager_id === requesterUser.id ||
                centerData.project_advisor_id === requesterUser.id ||
                centerData.acting_manager_id === requesterUser.id;

            if (!managesCenter) {
                return NextResponse.json({ error: 'You do not manage this center.' }, { status: 403 });
            }
        }

        // 5. Map Role to Column
        const roleToColumnMap: Record<number, string> = {
            17: 'oc_id',
            22: 'internal_manager_id',
            23: 'preaching_coordinator_id',
            24: 'morning_program_in_charge_id',
            25: 'mentor_id',
            26: 'frontliner_id',
            27: 'accountant_id',
            28: 'kitchen_head_id',
            29: 'study_in_charge_id'
        };

        const targetCol = roleToColumnMap[Number(roleValue)];
        if (!targetCol) {
            return NextResponse.json({ error: 'Invalid role for structure assignment' }, { status: 400 });
        }

        const targetNameCol = targetCol.replace('_id', '_name');

        // 6. Execute Updates Transactionally (pseudo-transaction via sequential steps)

        // A. Helper: Fetch Center Info
        const { data: centerInfo } = await supabase.from('centers').select('*').eq('id', centerId).single();
        const currentHolderId = centerInfo?.[targetCol];

        console.log(`API: Structure Update - Role ${roleValue} at Center ${centerId}. Current: ${currentHolderId}, New: ${userId}`);

        // B. If there was an old holder, remove the role from them
        if (currentHolderId && currentHolderId !== userId) {
            const { data: oldUser } = await supabase.from('users').select('role').eq('id', currentHolderId).single();
            if (oldUser) {
                let oldRoles = oldUser.role || [];
                if (!Array.isArray(oldRoles)) oldRoles = [oldRoles];
                const oldRolesNum = oldRoles.map((r: any) => Number(r));

                // Remove the specific role
                const newOldRoles = oldRolesNum.filter((r: number) => r !== Number(roleValue));

                // If roles changed, update
                if (newOldRoles.length !== oldRolesNum.length) {
                    await supabase
                        .from('users')
                        .update({ role: newOldRoles, updated_at: new Date().toISOString() })
                        .eq('id', currentHolderId);
                }
            }
        }

        // C. If Assigning New User
        let newUserName = null;
        if (userId) {
            // 1. Update User's Role Array
            const { data: newUser } = await supabase.from('users').select('role, name').eq('id', userId).single();
            if (!newUser) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });

            newUserName = newUser.name;
            let newRoles = newUser.role || [];
            if (!Array.isArray(newRoles)) newRoles = [newRoles];
            const newRolesNum = newRoles.map((r: any) => Number(r));

            // Add role if not present
            if (!newRolesNum.includes(Number(roleValue))) {
                newRolesNum.push(Number(roleValue));
                await supabase
                    .from('users')
                    .update({ role: newRolesNum, updated_at: new Date().toISOString() })
                    .eq('id', userId);
            }
        }

        // D. Update Center Table
        const updates: any = {};
        updates[targetCol] = userId || null; // Set ID or null
        updates[targetNameCol] = newUserName || null; // Set Name or null

        const { error: centerUpdateError } = await supabase
            .from('centers')
            .update(updates)
            .eq('id', centerId);

        if (centerUpdateError) {
            throw new Error(`Failed to update center: ${centerUpdateError.message}`);
        }

        return NextResponse.json({
            success: true,
            message: 'Structure updated successfully',
            updated: {
                role: roleValue,
                userId: userId,
                userName: newUserName
            }
        });

    } catch (error: any) {
        console.error('Error in center structure update:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
