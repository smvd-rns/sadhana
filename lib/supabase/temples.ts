// Supabase functions for temples management
import { supabase } from './config';
import { TempleData } from '@/types';

// Get all temples from Supabase
export const getTemplesFromSupabase = async (): Promise<TempleData[]> => {
    if (!supabase) {
        throw new Error('Supabase is not initialized');
    }

    try {
        const { data, error } = await supabase
            .from('temples')
            .select('*')
            .order('state')
            .order('city')
            .order('name');

        if (error) {
            throw new Error(error.message);
        }

        return data || [];
    } catch (error: any) {
        console.error('Error getting temples from Supabase:', error);
        throw new Error(error.message || 'Failed to get temples');
    }
};

// Get temples by location from Supabase
export const getTemplesByLocationFromSupabase = async (
    state?: string,
    city?: string
): Promise<TempleData[]> => {
    if (!supabase) {
        throw new Error('Supabase is not initialized');
    }

    try {
        let query = supabase
            .from('temples')
            .select('*');

        if (state) {
            query = query.eq('state', state);
        }

        if (city) {
            query = query.eq('city', city);
        }

        const { data, error } = await query
            .order('state')
            .order('city')
            .order('name');

        if (error) {
            throw new Error(error.message);
        }

        return data || [];
    } catch (error: any) {
        console.error('Error getting temples by location from Supabase:', error);
        throw new Error(error.message || 'Failed to get temples by location');
    }
};

// Add a temple to Supabase
// Add a temple to Supabase (via API for verification logic)
export const addTempleToSupabase = async (
    temple: Omit<TempleData, 'id' | 'created_at' | 'updated_at'>
): Promise<boolean> => {
    try {
        let authHeader = '';
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                authHeader = `Bearer ${session.access_token}`;
            }
        }

        const response = await fetch('/api/temples/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader && { 'Authorization': authHeader }),
            },
            body: JSON.stringify(temple),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to add temple');
        }

        return true;
    } catch (error: any) {
        console.error('Error adding temple:', error);
        throw new Error(error.message || 'Failed to add temple');
    }
};

// Update a temple in Supabase
export const updateTempleInSupabase = async (
    id: string,
    temple: Partial<Omit<TempleData, 'id' | 'created_at' | 'updated_at'>>
): Promise<boolean> => {
    try {
        let authHeader = '';
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                authHeader = `Bearer ${session.access_token}`;
            }
        }

        const response = await fetch('/api/temples/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader && { 'Authorization': authHeader }),
            },
            body: JSON.stringify({ id, ...temple }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to update temple');
        }

        return true;
    } catch (error: any) {
        console.error('Error updating temple:', error);
        throw new Error(error.message || 'Failed to update temple');
    }
};

// Delete a temple from Supabase
export const deleteTempleFromSupabase = async (templeId: string): Promise<boolean> => {
    try {
        let authHeader = '';
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                authHeader = `Bearer ${session.access_token}`;
            }
        }

        const response = await fetch('/api/temples/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader && { 'Authorization': authHeader }),
            },
            body: JSON.stringify({ id: templeId }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to delete temple');
        }

        return true;
    } catch (error: any) {
        console.error('Error deleting temple:', error);
        throw new Error(error.message || 'Failed to delete temple');
    }
};

// Bulk add temples to Supabase
export const addTemplesBulkToSupabase = async (
    temples: Array<Omit<TempleData, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: number; errors: number; errorsList: Array<{ temple: string; error: string }> }> => {
    if (!supabase) {
        throw new Error('Supabase is not initialized');
    }

    let success = 0;
    let errors = 0;
    const errorsList: Array<{ temple: string; error: string }> = [];

    const batchSize = 100;

    for (let i = 0; i < temples.length; i += batchSize) {
        const batch = temples.slice(i, i + batchSize);

        // Deduplicate within batch
        const uniqueBatch = Array.from(
            new Map(batch.map(c => [`${c.state}:${c.city}:${c.name}`, c])).values()
        );

        try {
            // Use upsert
            const { error: batchError } = await supabase
                .from('temples')
                .upsert(
                    uniqueBatch.map(c => ({
                        name: c.name.trim(),
                        state: c.state.trim(),
                        city: c.city.trim(),
                        address: c.address?.trim() || null,
                        contact: c.contact?.trim() || null,
                    })),
                    {
                        onConflict: 'state,city,name',
                        ignoreDuplicates: true,
                    }
                );

            if (batchError) {
                // Fallback to individual inserts
                for (const temple of uniqueBatch) {
                    try {
                        await addTempleToSupabase(temple);
                        success++;
                    } catch (err: any) {
                        errors++;
                        errorsList.push({ temple: `${temple.state} - ${temple.city} - ${temple.name}`, error: err.message });
                    }
                }
            } else {
                success += uniqueBatch.length;
            }
        } catch (error: any) {
            // Fallback
            for (const temple of uniqueBatch) {
                try {
                    await addTempleToSupabase(temple);
                    success++;
                } catch (err: any) {
                    errors++;
                    errorsList.push({ temple: `${temple.state} - ${temple.city} - ${temple.name}`, error: err.message });
                }
            }
        }
    }

    return { success, errors, errorsList };
};
