import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
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
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 });
        }

        // Fetch user data needed for ID generation
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('introduced_to_kc_in, parent_temple, other_parent_temple, other_temple, hierarchy')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        if (!userData.introduced_to_kc_in || !userData.parent_temple) {
            return NextResponse.json({ 
                error: 'Missing required profile information. Please ensure "Introduced to KC on" and "Parent Temple" are filled in your profile.' 
            }, { status: 400 });
        }

        // 1. Extract year (expecting YYYY-MM-DD or similar)
        let year;
        try {
            // introduced_to_kc_in might be a year string or a full date
            const dateVal = userData.introduced_to_kc_in;
            if (/^\d{4}$/.test(dateVal)) {
                year = parseInt(dateVal);
            } else {
                year = new Date(dateVal).getFullYear();
            }
            if (isNaN(year)) throw new Error('Invalid date');
        } catch (e) {
            return NextResponse.json({ error: 'Invalid "Introduced to KC" date format' }, { status: 400 });
        }
        
        // 2. Extract temple code (3 letters)
        let templeName = userData.parent_temple;
        if (templeName === 'Other') {
            templeName = userData.other_parent_temple || userData.other_temple || userData.hierarchy?.otherParentTemple || 'OTH';
        }

        if (!templeName || templeName.trim().length < 1) {
             return NextResponse.json({ error: 'Invalid Parent Temple name' }, { status: 400 });
        }

        // Clean name (remove special characters, take first 3)
        const templeCode = templeName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');

        // 3. Call the atomic RPC function
        const { data: membershipId, error: rpcError } = await supabaseAdmin.rpc('generate_membership_id', {
            p_user_id: user.id,
            p_year: year,
            p_temple_code: templeCode
        });

        if (rpcError) {
            console.error('RPC Error:', rpcError);
            return NextResponse.json({ error: `Internal database error: ${rpcError.message}` }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            membershipId,
            message: 'Membership ID generated successfully!' 
        });

    } catch (error: any) {
        console.error('Membership generation error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
