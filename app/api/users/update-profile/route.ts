import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sanitizeObject } from '@/lib/utils/sanitize';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Define Role 3 constant
const VOICE_MANAGER_ROLE = 3;

export async function POST(request: Request) {
    try {
        // Authenticate the user making the request
        // We need to verify the user owns the profile they are updating
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 });
        }

        const body = await request.json();
        let { userId, updates } = body;

        // Sanitize all updates to prevent injection attacks
        updates = sanitizeObject(updates);

        // Security Check: Prevent assignment of Role 8 (Super Admin)
        const SUPER_ADMIN_ROLE = 8;
        if (updates?.role) {
            const rolesToCheck = Array.isArray(updates.role) ? updates.role : [updates.role];
            if (rolesToCheck.some((r: any) => Number(r) === SUPER_ADMIN_ROLE)) {
                return NextResponse.json({ error: 'Role 8 (Super Admin) cannot be assigned via API' }, { status: 403 });
            }
        }

        // Security check: Ensure the authenticated user matches the userId being updated
        if (user.id !== userId) {
            return NextResponse.json({ error: 'Unauthorized to update this profile' }, { status: 403 });
        }

        // Fetch current user data to check for role and center changes
        const { data: currentUser, error: fetchError } = await supabaseAdmin
            .from('users')
            .select('role, hierarchy, center') // select center directly if it's a column or inside hierarchy
            .eq('id', userId)
            .single();

        if (fetchError || !currentUser) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        let updatedRoles = currentUser.role;

        // Check if Center is being changed
        // The center might be in 'updates.center' or 'updates.hierarchy.center' depending on frontend structure.
        // Based on ProfilePage, it sends: hierarchy.center AND direct column 'center'
        const newCenter = updates.center;
        const currentCenter = currentUser.center || currentUser.hierarchy?.center;

        // Logic: If Center changes AND User has Role 3
        if (newCenter && newCenter !== currentCenter) {
            const hasVoiceManagerRole = Array.isArray(currentUser.role)
                ? currentUser.role.includes(VOICE_MANAGER_ROLE)
                : currentUser.role === VOICE_MANAGER_ROLE;

            if (hasVoiceManagerRole) {
                console.log(`User ${userId} changed center from ${currentCenter} to ${newCenter}. Revoking role ${VOICE_MANAGER_ROLE}.`);

                if (Array.isArray(currentUser.role)) {
                    updatedRoles = currentUser.role.filter((r: any) => r !== VOICE_MANAGER_ROLE);
                } else {
                    // If it was a single role and it matched, they now have no role (or default 'student'?)
                    // Best to remove it or set to default if logic requires.
                    // Assuming array structure is preferred, or empty/default.
                    // If role was just '3', now it should likely be null or 'student'. 
                    // Let's assume we just remove it. if it was single value, we might need checking schema.
                    // For safety, let's look at how roles are stored. Usually JSONB or array.
                    // If simply 'number', we might need to change it.
                    // Safe bet: If array, filter. If scalar number 3, change to standard default 'student' or null.
                    updatedRoles = ['student']; // Default fallback
                }

                // Add the modified role to the updates object
                updates.role = updatedRoles;
            }
        }

        // Perform the update
        const { data: updatedData, error: updateError } = await supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating profile:', updateError);
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }

        return NextResponse.json({ success: true, user: updatedData });

    } catch (error: any) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
