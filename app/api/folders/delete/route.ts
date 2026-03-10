import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

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
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
        }

        // Check ownership of the target folder
        const { data: targetFolder, error: fetchError } = await sadhanaDbAdmin
            .from('folders')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError || !targetFolder) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        if (targetFolder.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden: You do not own this folder' }, { status: 403 });
        }

        // --- Recursive Deletion Logic ---

        // 1. Fetch all folders once to build a tree in-memory (more efficient than recursive DB calls)
        const { data: allFolders, error: allFoldersError } = await sadhanaDbAdmin
            .from('folders')
            .select('id, parent_id, user_id');

        if (allFoldersError) throw allFoldersError;

        // 2. Find all child folders recursively
        const idsToDelete: string[] = [id];
        const findChildren = (parentId: string) => {
            const children = allFolders.filter(f => f.parent_id === parentId);
            children.forEach(child => {
                idsToDelete.push(child.id);
                findChildren(child.id);
            });
        };
        findChildren(id);

        console.log(`[Folder Delete API] User ${user.id} deleting ${idsToDelete.length} folders recursively:`, idsToDelete);

        // 3. Delete all files linked to any of these folders
        const { error: filesDeleteError } = await sadhanaDbAdmin
            .from('files')
            .delete()
            .in('folder_id', idsToDelete);

        if (filesDeleteError) {
            console.error('Error deleting files linked to folders:', filesDeleteError);
            return NextResponse.json({ error: filesDeleteError.message }, { status: 500 });
        }

        // 4. Delete the folders themselves
        const { error: foldersDeleteError } = await sadhanaDbAdmin
            .from('folders')
            .delete()
            .in('id', idsToDelete);

        if (foldersDeleteError) {
            console.error('Error deleting folders:', foldersDeleteError);
            return NextResponse.json({ error: foldersDeleteError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            deletedFoldersCount: idsToDelete.length
        });
    } catch (error: any) {
        console.error('Folder Delete Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
