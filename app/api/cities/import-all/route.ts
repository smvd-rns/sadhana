import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { addCitiesBulkToSupabase } from '@/lib/supabase/cities';

const ALL_CITIES_TXT = path.join(process.cwd(), 'all city.txt');

export async function POST(request: Request) {
  try {
    // Read all city.txt file
    if (!fs.existsSync(ALL_CITIES_TXT)) {
      return NextResponse.json({ error: 'all city.txt file not found' }, { status: 404 });
    }
    
    const allCitiesContent = fs.readFileSync(ALL_CITIES_TXT, 'utf-8');
    const allCitiesData: { [state: string]: string[] } = JSON.parse(allCitiesContent);
    
    // Convert to array format for bulk insert
    const citiesToImport: Array<{ state: string; name: string }> = [];
    
    Object.keys(allCitiesData).forEach(state => {
      if (allCitiesData[state] && Array.isArray(allCitiesData[state])) {
        allCitiesData[state].forEach(cityName => {
          citiesToImport.push({ state, name: cityName });
        });
      }
    });
    
    // Bulk import to Supabase
    const result = await addCitiesBulkToSupabase(citiesToImport);
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully imported cities from all city.txt`,
      stats: {
        totalCitiesAdded: result.success,
        errors: result.errors,
        errorsList: result.errorsList,
        totalProcessed: citiesToImport.length
      }
    });
  } catch (error: any) {
    console.error('Error importing cities from all city.txt:', error);
    return NextResponse.json({ 
      error: 'Failed to import cities', 
      details: error.message 
    }, { status: 500 });
  }
}
