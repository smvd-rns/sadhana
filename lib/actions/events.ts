'use server';

import { getActiveSadhanaSupabase, getAdminSadhanaSupabase } from '@/lib/supabase/sadhana';
import { ManagedEvent, ManagedEventResponse, ManagedEventAttachment } from '@/types';
import { sendPushNotification } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';

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
            is_pinned: eventData.isPinned || false,
            rsvp_deadline: eventData.rsvpDeadline
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
        let query = supabaseAdmin
            .from('users')
            .select('id, ashram, role, state, city, center, current_center, parent_center, current_temple, parent_temple, push_tokens, hierarchy')
            .not('push_tokens', 'is', null)
            .neq('push_tokens', '{}');

        // Apply ashram filter in SQL if present
        if (eventData.targetAshrams?.length > 0) {
            query = query.in('ashram', eventData.targetAshrams);
        }

        const { data: users, error } = await query;

        if (error || !users || users.length === 0) return;

        // Filter users in JS for more complex criteria
        const targetedUsers = users.filter((user: any) => {
            // 1. Check Roles
            const matchesRole = !eventData.targetRoles?.length ||
                eventData.targetRoles.some(r => {
                    const userRole = user.role;
                    if (Array.isArray(userRole)) {
                        return userRole.some(ur => String(ur) === String(r));
                    }
                    return String(userRole) === String(r);
                });

            if (!matchesRole) return false;

            // 2. Check Temples
            const matchesTemple = !eventData.targetTemples?.length ||
                eventData.targetTemples.some(t =>
                    [user.current_temple, user.parent_temple, user.hierarchy?.temple, user.hierarchy?.currentTemple]
                        .some(loc => String(loc).trim().toLowerCase() === String(t).trim().toLowerCase())
                );

            if (!matchesTemple) return false;

            // 3. Check Centers
            const matchesCenter = !eventData.targetCenters?.length ||
                eventData.targetCenters.some(c =>
                    [user.center, user.current_center, user.parent_center, user.hierarchy?.center, user.hierarchy?.currentCenter]
                        .some(loc => String(loc).trim().toLowerCase() === String(c).trim().toLowerCase())
                );

            if (!matchesCenter) return false;

            // 4. Check Excluded
            if (eventData.excludedUserIds?.includes(user.id)) return false;

            return true;
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
    isSuperAdmin?: boolean; // New parameter to bypass creator restriction
    allLocations?: string[]; // Multiple possible location tokens (Centers/Temples)
    isManagementView?: boolean; // Explicit flag for the History/Management tab
}) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) return [];

    // 1. Fetch all events
    let query = supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

    // 1b. Isolation: If it's the "Management Hub" view,
    // we MUST restrict to events the current user created, unless they are a Super Admin.
    const isTargetingEmpty = !userParams.ashram && !userParams.role && !userParams.temple && !userParams.center && (!userParams.completedCamps || !userParams.completedCamps.length);
    const shouldIsolate = userParams.isManagementView === true || isTargetingEmpty;

    if (shouldIsolate && userParams.isSuperAdmin !== true && userParams.userId) {
        query = query.eq('created_by', userParams.userId);
    }

    const { data: eventsData, error: eventsError } = await query;

    if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return [];
    }

    // 1c. Fetch creator names (for Management Hub / Admin view)
    let creatorNamesMap = new Map<string, string>();
    if (eventsData && eventsData.length > 0) {
        const creatorIds = Array.from(new Set(eventsData.map(e => e.created_by)));
        try {
            const { getAdminClient } = await import('@/lib/supabase/admin');
            const supabaseAdmin = getAdminClient();
            if (supabaseAdmin) {
                const { data: userData } = await supabaseAdmin
                    .from('users')
                    .select('id, name')
                    .in('id', creatorIds);
                if (userData) {
                    userData.forEach(u => creatorNamesMap.set(u.id, u.name));
                }
            }
        } catch (err) {
            console.error('Error fetching creator names:', err);
        }
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

    // 2b. Admin Stats
    if (isTargetingEmpty) {
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
        // If we are in Management View, we show what we fetched (already SQL isolated)
        if (userParams.isManagementView || isTargetingEmpty) return true;

        // Otherwise, filter for the regular User Inbox (Audience View)
        const matchesAshram = !event.target_ashrams?.length || event.target_ashrams.includes(userParams.ashram);
        const matchesRole = !event.target_roles?.length || event.target_roles.includes(userParams.role);

        // Robust Location Checking (Temples)
        const userTemples = [userParams.temple, ...(userParams.allLocations || [])].filter(Boolean);
        const matchesTemple = !event.target_temples?.length ||
            event.target_temples.some((t: string) =>
                userTemples.some(ut => String(ut).trim().toLowerCase() === String(t).trim().toLowerCase())
            );

        // Robust Location Checking (Centers)
        const userCenters = [userParams.center, ...(userParams.allLocations || [])].filter(Boolean);
        const matchesCenter = !event.target_centers?.length ||
            event.target_centers.some((c: string) =>
                userCenters.some(uc => String(uc).trim().toLowerCase() === String(c).trim().toLowerCase())
            );

        const matchesCamps = !event.target_camps?.length ||
            event.target_camps.some((camp: string) => userParams.completedCamps?.includes(camp));

        const isExcluded = event.excluded_user_ids?.includes(userParams.userId);

        return matchesAshram && matchesRole && matchesTemple && matchesCenter && matchesCamps && !isExcluded;
    });

    return filtered.map(event => {
        const managed = mapDbEventToManagedEvent(event, creatorNamesMap.get(event.created_by));
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
        if (isTargetingEmpty) {
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

    if (response.status === 'coming' || response.status === 'not_coming') {
        const { data: eventData } = await supabase
            .from('events')
            .select('rsvp_deadline')
            .eq('id', response.eventId)
            .single();

        if (eventData?.rsvp_deadline) {
            const deadline = new Date(eventData.rsvp_deadline);
            if (new Date() > deadline) {
                throw new Error('Time to respond to this event is over.');
            }
        }
    }

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
export async function getRecentResponses(limit: number = 20, currentUserId?: string, isSuperAdmin?: boolean) {
    const supabase = getActiveSadhanaSupabase();
    if (!supabase) return [];

    let query = supabase
        .from('event_responses')
        .select(`
            *,
            events!inner (
                title,
                created_by
            )
        `)
        .order('updated_at', { ascending: false })
        .limit(limit);

    // If not a Super Admin, only show responses to events the current user created
    if (!isSuperAdmin && currentUserId) {
        query = query.eq('events.created_by', currentUserId);
    }

    const { data, error } = await query;

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

/**
 * Fetch targeted users for a specific event with optional center/temple filtering
 * Optimized to only fetch relevant users
 */
export async function getEventTargetedUsers(eventId: string, filters?: { temple?: string, center?: string }) {
    const supabaseClient = getActiveSadhanaSupabase();
    if (!supabaseClient) return [];

    // 1. Fetch Event Targeting Data
    const { data: event, error: eventError } = await supabaseClient
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (eventError || !event) return [];

    // 2. Build User Query for main database
    const { supabase: mainSupabase } = await import('@/lib/supabase/config');
    if (!mainSupabase) return [];

    let userQuery = mainSupabase
        .from('users')
        .select('*');

    // Apply strict filters from the event itself to reduce payload
    if (event.target_ashrams?.length) {
        userQuery = userQuery.in('ashram', event.target_ashrams);
    }

    // Apply specific admin filters (Center/Temple)
    if (filters?.temple && filters.temple !== 'all') {
        userQuery = userQuery.or(`current_temple.eq."${filters.temple}",parent_temple.eq."${filters.temple}",hierarchy->>temple.eq."${filters.temple}"`);
    }
    if (filters?.center && filters.center !== 'all') {
        userQuery = userQuery.or(`current_center.eq."${filters.center}",center.eq."${filters.center}",hierarchy->>center.eq."${filters.center}"`);
    }

    const { data: users, error: usersError } = await userQuery;
    if (usersError || !users) return [];

    // 3. Final JS filtering for complex hierarchy/role logic that SQL can't do easily
    return users.filter(user => {
        const userRoles = Array.isArray(user.role) ? user.role.map(String) : [String(user.role)];
        const matchesRole = !event.target_roles?.length || event.target_roles.some((r: any) => userRoles.includes(String(r)));

        // Detailed Location Checks (already partially done in SQL, but double check for robustness)
        const userTemple = user.current_temple || user.parent_temple || user.hierarchy?.temple || user.hierarchy?.currentTemple;
        const userCenter = user.center || user.current_center || user.hierarchy?.center || user.hierarchy?.currentCenter;

        const matchesTemple = !event.target_temples?.length || event.target_temples.includes(userTemple);
        const matchesCenter = !event.target_centers?.length || event.target_centers.includes(userCenter);

        // Camp checks
        const matchesCamps = !event.target_camps?.length || event.target_camps.some((c: string) => {
            const campField = `camp${c.charAt(0).toUpperCase()}${c.slice(1)}`;
            return user[campField] === true;
        });

        // Exclusions
        const isExcluded = event.excluded_user_ids?.includes(user.id);

        return matchesRole && matchesTemple && matchesCenter && matchesCamps && !isExcluded;
    });
}

export async function updateEventDeadline(eventId: string, rsvpDeadline: Date | null, userId: string) {
    console.log(`[updateEventDeadline] Starting update for event ${eventId} by user ${userId}`);
    try {
        const sadhanaSupabase = getActiveSadhanaSupabase(); // anon (for reading)
        if (!sadhanaSupabase) throw new Error('Sadhana Supabase not initialized');

        // 1. Fetch the event to check ownership
        console.log('[updateEventDeadline] Fetching event ownership...');
        const { data: event, error: fetchError } = await sadhanaSupabase
            .from('events')
            .select('created_by, id')
            .eq('id', eventId)
            .single();

        if (fetchError) {
            console.error('[updateEventDeadline] Error fetching event:', fetchError);
            throw new Error(`Event not found: ${fetchError.message}`);
        }
        if (!event) throw new Error('Event not found');
        console.log('[updateEventDeadline] Found event creator:', event.created_by);

        // 2. Check permissions — use the MAIN DB admin client (users are NOT in sadhana DB)
        const isCreator = event.created_by === userId;
        let isSuperAdmin = false;

        if (!isCreator) {
            console.log('[updateEventDeadline] User is not creator, checking super_admin role in main DB...');
            try {
                const { getAdminClient } = await import('@/lib/supabase/admin');
                const mainAdmin = getAdminClient();
                const { data: userData, error: userError } = await mainAdmin
                    .from('users')
                    .select('role')
                    .eq('id', userId)
                    .single();

                if (userError) {
                    console.error('[updateEventDeadline] Error fetching user role from main DB:', userError);
                }

                const userRole = Array.isArray(userData?.role) ? userData.role : [userData?.role];
                isSuperAdmin = userRole.some((r: any) => String(r) === '8' || String(r) === 'super_admin');
                console.log('[updateEventDeadline] User isSuperAdmin:', isSuperAdmin);
            } catch (err) {
                console.error('[updateEventDeadline] Failed to check admin role:', err);
            }
        } else {
            console.log('[updateEventDeadline] User is the event creator.');
        }

        if (!isCreator && !isSuperAdmin) {
            console.warn('[updateEventDeadline] Unauthorized update attempt by user:', userId);
            throw new Error('Not authorized to update this event deadline');
        }

        // 3. Perform the update — use service role to bypass RLS
        console.log('[updateEventDeadline] Getting admin Sadhana client...');
        const adminSadhana = getAdminSadhanaSupabase();
        if (!adminSadhana) throw new Error('Sadhana admin client not available');

        const deadline = rsvpDeadline ? rsvpDeadline.toISOString() : null;

        console.log(`[updateEventDeadline] Updating event ${eventId} with deadline: ${deadline}`);

        const { data: updateData, error: updateError } = await adminSadhana
            .from('events')
            .update({ rsvp_deadline: deadline })
            .eq('id', eventId)
            .select();

        if (updateError) {
            console.error('[updateEventDeadline] Supabase UPDATE error:', updateError);
            throw updateError;
        }

        revalidatePath('/dashboard/events');
        return { success: true };
    } catch (error: any) {
        console.error('[updateEventDeadline] FATAL ERROR:', error);
        throw new Error(error.message || 'An internal error occurred while updating the deadline');
    }
}

// Utility to map DB format to app ManagedEvent type
function mapDbEventToManagedEvent(dbEvent: any, creatorName?: string): ManagedEvent {
    return {
        id: dbEvent.id,
        createdAt: new Date(dbEvent.created_at),
        createdBy: dbEvent.created_by,
        createdByName: creatorName,
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
        rsvpDeadline: dbEvent.rsvp_deadline ? new Date(dbEvent.rsvp_deadline) : undefined,
        updatedAt: new Date(dbEvent.updated_at)
    };
}
