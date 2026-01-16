import { supabase } from './config';

/**
 * Get all user IDs from the database
 * Used for broadcast messages to send to all users
 */
export const getAllUserIds = async (): Promise<string[]> => {
    if (!supabase) {
        console.error('Supabase is not initialized');
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('id');

        if (error) {
            console.error('Error fetching all user IDs:', error);
            return [];
        }

        return (data || []).map((user: any) => user.id);
    } catch (error) {
        console.error('Error fetching all user IDs:', error);
        return [];
    }
};
