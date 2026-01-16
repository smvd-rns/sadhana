import { NextResponse } from 'next/server';
import { deleteCenterFromSupabase } from '@/lib/supabase/centers';

export async function POST(request: Request) {
  try {
    const { centerId } = await request.json();
    
    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 });
    }
    
    await deleteCenterFromSupabase(centerId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting center from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete center' }, { status: 500 });
  }
}
