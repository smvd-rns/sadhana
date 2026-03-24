import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { getAdminSadhanaSupabase } from '@/lib/supabase/sadhana';
// import { getAccessToken, findOrCreateFolder } from '@/lib/utils/drive'; // DELETED
import { getUserData } from '@/lib/supabase/auth';

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUserFromRequest(request as any);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, parentId } = body;

        if (!name) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        const sadhanaDbAdmin = getAdminSadhanaSupabase();
        if (!sadhanaDbAdmin) {
            console.error('[Folder Create API] Failed to initialize Sadhana DB client');
            return NextResponse.json({ error: 'Database initialization error' }, { status: 500 });
        }

        // --- Google Drive Sync Section ---
        const profile = await getUserData(user.id);
        const RENDER_SERVICE_URL = process.env.NEXT_PUBLIC_RENDER_INDEXER_URL || 'https://sadhana-ndn8.onrender.com';
        
        // Call Render Backend to handle Google Drive folder creation
        const renderRes = await fetch(`${RENDER_SERVICE_URL}/folders/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                parentId: parentId === 'root' ? null : (parentId || null),
                userId: user.id,
                userName: profile?.name || profile?.email?.split('@')[0] || user.id.substring(0, 8)
            })
        });

        if (!renderRes.ok) {
            const errorData = await renderRes.json();
            throw new Error(errorData.error || 'Failed to sync folder with Google Drive via Render');
        }

        const { googleDriveId } = await renderRes.json();
        // --- End Drive Sync ---

        const { data, error } = await sadhanaDbAdmin
            .from('folders')
            .insert({
                name,
                parent_id: parentId === 'root' ? null : (parentId || null),
                user_id: user.id,
                google_drive_folder_id: googleDriveId
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating folder:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ folder: data });
    } catch (error: any) {
        console.error('Folder Create Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
