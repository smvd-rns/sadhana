import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { getAccessToken, findOrCreateFolder } from '@/lib/utils/drive';
import { getUserData } from '@/lib/supabase/auth';

// Connect to Secondary (Sadhana) Database
const sadhanaDbUrl = process.env.NEXT_PUBLIC_SADHANA_DB_URL!;
const sadhanaDbServiceKey = process.env.SADHANA_DB_SERVICE_ROLE_KEY!;
const sadhanaDbAdmin = createClient(sadhanaDbUrl, sadhanaDbServiceKey);

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

        // --- Google Drive Sync Section ---
        const profile = await getUserData(user.id);
        const accessToken = await getAccessToken();
        const mainFolderId = '1KhZ2l4wk3HXwBhX18JFb10zNvWJNMjHi';
        let driveParentId = '';

        if (!parentId || parentId === 'root') {
            const userName = profile?.name || profile?.email?.split('@')[0] || user.id.substring(0, 8);
            driveParentId = await findOrCreateFolder(accessToken, userName, mainFolderId);
        } else {
            const { data: parentFolder } = await sadhanaDbAdmin
                .from('folders')
                .select('google_drive_folder_id')
                .eq('id', parentId)
                .single();

            if (parentFolder?.google_drive_folder_id) {
                driveParentId = parentFolder.google_drive_folder_id;
            } else {
                const userName = profile?.name || profile?.email?.split('@')[0] || user.id.substring(0, 8);
                driveParentId = await findOrCreateFolder(accessToken, userName, mainFolderId);
            }
        }

        const googleDriveId = await findOrCreateFolder(accessToken, name, driveParentId);
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
