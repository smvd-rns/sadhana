'use server';

import { getActiveSadhanaSupabase } from '@/lib/supabase/sadhana';
import { ManagedEvent, ManagedEventResponse, ManagedEventAttachment } from '@/types';
import { sendPushNotification } from '@/lib/firebase/admin';

/**
 * Create a new event in the second Supabase
 */
export async function createEvent(eventData: Omit<ManagedEvent, 'id' | 'createdAt' | 'updatedAt'>) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) throw new Error('Sadhana Supabase not initialized');

    // 1. Insert the main event
    const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
            created_by: eventData.createdBy,
            title: eventData.title,
            event_date: eventData.eventDate,
            message: eventData.message,
            attachments: eventData.attachments,
            target_ashrams: eventData.targetAshrams,
            target_roles: eventData.targetRoles,
            target_temples: eventData.targetTemples,
            target_centers: eventData.targetCenters,
            target_camps: eventData.targetCamps,
            excluded_user_ids: eventData.excludedUserIds,
            reached_count: eventData.reachedCount || 0,
            is_important: eventData.isImportant || false,
            is_pinned: eventData.isPinned || false
        })
        .select()
        .single();

    if (eventError) {
        console.error('Error creating event:', eventError);
        throw eventError;
    }

    // 2. Track materials in event_materials table
    const materialsToTrack = (eventData.attachments || [])
        .filter(att => !!att.fileId)
        .map(att => ({
            event_id: event.id,
            file_id: att.fileId,
            file_name: att.name,
            file_url: att.url,
            mime_type: att.mimeType || null
        }));

    if (materialsToTrack.length > 0) {
        const { error: materialsError } = await supabase
            .from('event_materials')
            .insert(materialsToTrack);

        if (materialsError) {
            console.error('Error tracking materials:', materialsError);
            // We don't throw here to avoid failing the whole broadcast if just tracking fails
            // but in a production app you might want to consider the atomicity requirements.
        }
    }

    // Trigger push notifications (don't await to avoid blocking response)
    triggerPushNotificationsForEvent(event.id, eventData);

    return event;
}

/**
 * Identify targeted users and send push notifications
 */
async function triggerPushNotificationsForEvent(eventId: string, eventData: Omit<ManagedEvent, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
        const { getAdminClient } = await import('@/lib/supabase/admin');
        const supabaseAdmin = getAdminClient();
        if (!supabaseAdmin) return;

        // Fetch all users with push tokens from the Main database
        // For efficiency, we only fetch users who have at least one token
        let query = supabaseAdmin
            .from('users')
            .select('id, ashram, role, state, city, center, push_tokens')
            .not('push_tokens', 'is', null)
            .neq('push_tokens', '{}');

        // Apply filters if present
        if (eventData.targetAshrams?.length > 0) {
            query = query.in('ashram', eventData.targetAshrams);
        }
        // Roles and Temples/Centers filtering can be complex in SQl, 
        // but since push tokens are few, fetching and filtering in JS is often acceptable

        const { data: users, error } = await query;

        if (error || !users || users.length === 0) return;

        // Filter users in JS for more complex criteria (like roles or temples)
        const targetedUsers = users.filter((user: any) => {
            // Check roles
            const matchesRole = !eventData.targetRoles?.length ||
                eventData.targetRoles.some(r => user.role?.includes(r));

            // Check temples/centers (if needed, though SQL filters handles most)
            // ... add more filtering here if necessary ...

            return matchesRole;
        });

        const allTokens = targetedUsers.flatMap((u: any) => u.push_tokens || []);
        if (allTokens.length === 0) return;

        // deduplicate tokens
        const uniqueTokens = [...new Set(allTokens)];

        await sendPushNotification(
            uniqueTokens,
            `New Announcement: ${eventData.title}`,
            eventData.message ? eventData.message.replace(/<[^>]*>/g, '').substring(0, 100) + '...' : 'Open the app to see the details.',
            {
                url: `/dashboard/events`,
                eventId: eventId
            }
        );
    } catch (error) {
        console.error('Error triggering push notifications:', error);
    }
}

/**
 * Fetch events for a specific user based on targeting filters
 * Since user data is in the first Supabase, we pass the user's properties to filter here
 */
export async function getEventsForUser(userParams: {
    userId?: string;
    ashram?: string;
    role?: string;
    temple?: string;
    center?: string;
    completedCamps?: string[];
}) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) return [];

    // 1. Fetch all events
    // Base events query
    // 1. Fetch all events targeting this user
    let query = supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });



    const { data: eventsData, error: eventsError } = await query;

    if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return [];
    }

    // 2. Fetch user responses if userId is provided
    let responsesMap = new Map<string, any>();
    let comingCountsMap = new Map<string, number>();

    if (userParams.userId) {
        const { data: respData } = await supabase
            .from('event_responses')
            .select('*')
            .eq('user_id', userParams.userId);

        if (respData) {
            respData.forEach(r => responsesMap.set(r.event_id, r));
        }
    }

    // 2b. If Admin (isFilterEmpty is true), fetch aggregate 'coming' counts for each event
    const isFilterEmpty = !userParams.ashram && !userParams.role && !userParams.temple && !userParams.center && (!userParams.completedCamps || !userParams.completedCamps.length);

    if (isFilterEmpty) {
        const { data: comingStats } = await supabase
            .from('event_responses')
            .select('event_id')
            .eq('status', 'coming');

        if (comingStats) {
            comingStats.forEach(r => {
                comingCountsMap.set(r.event_id, (comingCountsMap.get(r.event_id) || 0) + 1);
            });
        }
    }

    const filtered = (eventsData || []).filter(event => {
        // If filter is explicitly empty (Admin view), show all
        if (isFilterEmpty) return true;

        const matchesAshram = !event.target_ashrams || !event.target_ashrams.length || event.target_ashrams.includes(userParams.ashram);
        const matchesRole = !event.target_roles || !event.target_roles.length || event.target_roles.includes(userParams.role);
        const matchesTemple = !event.target_temples || !event.target_temples.length || event.target_temples.includes(userParams.temple);
        const matchesCenter = !event.target_centers || !event.target_centers.length || event.target_centers.includes(userParams.center);

        const matchesCamps = !event.target_camps || !event.target_camps.length ||
            event.target_camps.some((camp: string) => userParams.completedCamps?.includes(camp));

        const isExcluded = event.excluded_user_ids?.includes(userParams.userId);

        return matchesAshram && matchesRole && matchesTemple && matchesCenter && matchesCamps && !isExcluded;
    });

    return filtered.map(event => {
        const managed = mapDbEventToManagedEvent(event);
        const userResp = responsesMap.get(event.id);

        if (userResp) {
            managed.userResponse = {
                id: userResp.id,
                eventId: userResp.event_id,
                userId: userResp.user_id,
                status: userResp.status,
                reason: userResp.reason,
                isBulk: userResp.is_bulk,
                bulkAddedBy: userResp.bulk_added_by,
                createdAt: new Date(userResp.created_at),
                updatedAt: new Date(userResp.updated_at)
            };
            // PERSONAL PIN OVERRIDE: If the user has a response, their pin status WINS
            managed.isPinned = userResp.is_pinned;
        } else {
            // Default to Global Admin Pin if no personal interaction yet
            managed.isPinned = event.is_pinned || false;
        }

        // Attach aggregate stats for admin
        if (isFilterEmpty) {
            managed.comingCount = comingCountsMap.get(event.id) || 0;
        }
        return managed;
    });
}

/**
 * Submit or update an event response (attendance/seen)
 */
export async function submitEventResponse(response: {
    eventId: string;
    userId: string;
    status: 'coming' | 'not_coming' | 'seen';
    reason?: string;
    isBulk?: boolean;
    isPinned?: boolean;
}) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) throw new Error('Sadhana Supabase not initialized');

    const { error } = await supabase
        .from('event_responses')
        .upsert({
            event_id: response.eventId,
            user_id: response.userId,
            status: response.status,
            reason: response.reason,
            is_bulk: response.isBulk || false,
            is_pinned: response.isPinned
        }, { onConflict: 'event_id,user_id' });

    if (error) {
        console.error('Error submitting response:', error);
        throw error;
    }
}

/**
 * Toggle personal pin for an event
 */
export async function toggleEventPin(eventId: string, userId: string, isPinned: boolean) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) throw new Error('Sadhana Supabase not initialized');

    const { error } = await supabase
        .from('event_responses')
        .upsert({
            event_id: eventId,
            user_id: userId,
            is_pinned: isPinned,
            status: 'seen' // Ensure there is a status if it's the first interaction
        }, { onConflict: 'event_id,user_id' });

    if (error) {
        console.error('Error toggling pin:', error);
        throw error;
    }
}


/**
 * Bulk submit responses (for Project Managers)
 */
export async function bulkSubmitResponses(eventId: string, userIds: string[], pmId: string, status: 'coming' | 'not_coming') {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) throw new Error('Sadhana Supabase not initialized');

    const responses = userIds.map(userId => ({
        event_id: eventId,
        user_id: userId,
        status: status,
        is_bulk: true,
        bulk_added_by: pmId,
        updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
        .from('event_responses')
        .upsert(responses, { onConflict: 'event_id,user_id' });

    if (error) {
        console.error('Error bulk submitting responses:', error);
        throw error;
    }
    return data;
}

/**
 * Fetch a single event by ID
 */
export async function getEventById(eventId: string) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) return null;

    const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (error || !event) {
        console.error('Error fetching event by ID:', error);
        return null;
    }

    return mapDbEventToManagedEvent(event);
}

/**
 * Get statistics for an event (reach, views, attendance)
 */
export async function getEventStats(eventId: string) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('event_responses')
        .select('status, user_id')
        .eq('event_id', eventId);

    if (error) {
        console.error('Error fetching event stats:', error);
        return null;
    }

    const stats = {
        totalSeen: data.filter(r => r.status === 'seen').length,
        totalComing: data.filter(r => r.status === 'coming').length,
        totalNotComing: data.filter(r => r.status === 'not_coming').length,
        totalResponses: data.length
    };

    return stats;
}

/**
 * Get recent responses across all events (Global Log)
 */
export async function getRecentResponses(limit: number = 20) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('event_responses')
        .select(`
            *,
            events (
                title
            )
        `)
        .order('updated_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching global logs:', error);
        return [];
    }

    return data.map((r: any) => ({
        id: r.id,
        eventId: r.event_id,
        eventTitle: r.events?.title || 'Unknown Event',
        userId: r.user_id,
        status: r.status,
        reason: r.reason,
        isBulk: r.is_bulk,
        bulkAddedBy: r.bulk_added_by,
        updatedAt: new Date(r.updated_at)
    }));
}

// Utility to map DB format to app ManagedEvent type
function mapDbEventToManagedEvent(dbEvent: any): ManagedEvent {
    return {
        id: dbEvent.id,
        createdAt: new Date(dbEvent.created_at),
        createdBy: dbEvent.created_by,
        title: dbEvent.title,
        eventDate: new Date(dbEvent.event_date),
        message: dbEvent.message,
        attachments: (dbEvent.attachments || []) as ManagedEventAttachment[],
        targetAshrams: dbEvent.target_ashrams || [],
        targetRoles: dbEvent.target_roles || [],
        targetTemples: dbEvent.target_temples || [],
        targetCenters: dbEvent.target_centers || [],
        targetCamps: dbEvent.target_camps || [],
        excludedUserIds: dbEvent.excluded_user_ids || [],
        reachedCount: dbEvent.reached_count || 0,
        isImportant: dbEvent.is_important || false,
        isPinned: dbEvent.is_pinned || false, // Base state, overridden in getEventsForUser loop
        updatedAt: new Date(dbEvent.updated_at)
    };
}
