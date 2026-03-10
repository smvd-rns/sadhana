import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

// Connect to Secondary (Sadhana) Database
const sadhanaDbUrl = process.env.NEXT_PUBLIC_SADHANA_DB_URL!;
const sadhanaDbServiceKey = process.env.SADHANA_DB_SERVICE_ROLE_KEY!;
const sadhanaDbAdmin = createClient(sadhanaDbUrl, sadhanaDbServiceKey);

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUserFromRequest(request as any);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const parentId = searchParams.get('parentId');
        const activeTab = searchParams.get('activeTab') || 'global';

        let query = sadhanaDbAdmin.from('folders').select('*');

        if (parentId && parentId !== 'root') {
            query = query.eq('parent_id', parentId);
        } else {
            query = query.is('parent_id', null);
        }

        if (activeTab === 'my') {
            query = query.eq('user_id', user.id);
        }

        const { data, error } = await query.order('name', { ascending: true });

        if (error) {
            console.error('Error listing folders:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ folders: data || [] });
    } catch (error: any) {
        console.error('Folder List Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
