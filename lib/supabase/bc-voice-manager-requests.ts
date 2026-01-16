import { supabase } from './config';
import { BCVoiceManagerRequest } from '@/types';
import { sanitizeText } from '@/lib/utils/sanitize';
import { updateUser } from './users';

export const createBCVoiceManagerRequest = async (
  userId: string,
  userEmail: string,
  userName: string,
  subject?: string,
  message?: string,
  requestedCenters?: string[]
): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Check if there's already a pending request for this user
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('bc_voice_manager_request_status')
      .eq('id', userId)
      .single();

    // Handle different error cases
    if (checkError) {
      // PGRST116 = no rows returned (user doesn't exist)
      if (checkError.code === 'PGRST116') {
        throw new Error('User not found');
      }
      console.warn('Error checking existing request:', checkError);
    }

    // If user already has a pending request, throw error
    if (existingUser?.bc_voice_manager_request_status === 'pending') {
      throw new Error('You already have a pending BC Voice Manager request');
    }

    // Sanitize the message and subject
    const sanitizedMessage = message ? sanitizeText(message) : '';
    const sanitizedSubject = subject ? sanitizeText(subject) : '';

    // Update user record with BC Voice Manager request
    // Clear old rejection data when creating a new request
    const updateData: any = {
      bc_voice_manager_request_status: 'pending',
      bc_voice_manager_request_subject: sanitizedSubject,
      bc_voice_manager_request_message: sanitizedMessage,
      bc_voice_manager_requested_at: new Date().toISOString(),
      // Clear old rejection data
      bc_voice_manager_reviewed_at: null,
      bc_voice_manager_reviewed_by: null,
      bc_voice_manager_request_notes: null,
    };

    // Add requested centers if provided
    if (requestedCenters && requestedCenters.length > 0) {
      updateData.bc_voice_manager_requested_centers = requestedCenters;
    } else {
      updateData.bc_voice_manager_requested_centers = [];
    }

    console.log('Creating BC Voice Manager request with data:', {
      userId,
      subject: sanitizedSubject,
      requestedCenters: updateData.bc_voice_manager_requested_centers,
    });

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, bc_voice_manager_requested_centers, bc_voice_manager_request_status')
      .single();

    if (error) {
      console.error('Error creating BC Voice Manager request:', error);
      throw new Error('Failed to create BC Voice Manager request');
    }

    console.log('BC Voice Manager request created successfully:', {
      requestedCenters: data.bc_voice_manager_requested_centers,
      status: data.bc_voice_manager_request_status,
    });

    return data.id;
  } catch (error: any) {
    console.error('Error creating BC Voice Manager request:', error);
    throw error;
  }
};

export const getBCVoiceManagerRequestByUserId = async (userId: string): Promise<BCVoiceManagerRequest | null> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, bc_voice_manager_request_status, bc_voice_manager_request_subject, bc_voice_manager_request_message, bc_voice_manager_requested_at, bc_voice_manager_reviewed_at, bc_voice_manager_reviewed_by, bc_voice_manager_request_notes, bc_voice_manager_requested_centers, bc_voice_manager_approved_centers')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user doesn't have a request
        return null;
      }
      console.error('Error fetching BC Voice Manager request:', error);
      throw new Error('Failed to fetch BC Voice Manager request');
    }

    if (!data || !data.bc_voice_manager_request_status) {
      return null;
    }

    const result = {
      id: data.id,
      userId: data.id,
      userEmail: data.email,
      userName: data.name,
      subject: data.bc_voice_manager_request_subject || undefined,
      message: data.bc_voice_manager_request_message || undefined,
      requestedCenters: data.bc_voice_manager_requested_centers || undefined,
      approvedCenters: data.bc_voice_manager_approved_centers || undefined,
      status: data.bc_voice_manager_request_status as 'pending' | 'approved' | 'rejected',
      requestedAt: new Date(data.bc_voice_manager_requested_at),
      reviewedAt: data.bc_voice_manager_reviewed_at ? new Date(data.bc_voice_manager_reviewed_at) : undefined,
      reviewedBy: data.bc_voice_manager_reviewed_by || undefined,
      notes: data.bc_voice_manager_request_notes || undefined,
    };

    return result;
  } catch (error: any) {
    console.error('Error fetching BC Voice Manager request:', error);
    throw error;
  }
};

export const getAllBCVoiceManagerRequests = async (): Promise<BCVoiceManagerRequest[]> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, bc_voice_manager_request_status, bc_voice_manager_request_subject, bc_voice_manager_request_message, bc_voice_manager_requested_at, bc_voice_manager_reviewed_at, bc_voice_manager_reviewed_by, bc_voice_manager_request_notes, bc_voice_manager_requested_centers, bc_voice_manager_approved_centers')
      .not('bc_voice_manager_request_status', 'is', null)
      .order('bc_voice_manager_requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching BC Voice Manager requests:', error);
      throw new Error('Failed to fetch BC Voice Manager requests');
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((user: any) => ({
      id: user.id,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      subject: user.bc_voice_manager_request_subject || undefined,
      message: user.bc_voice_manager_request_message || undefined,
      requestedCenters: user.bc_voice_manager_requested_centers || undefined,
      approvedCenters: user.bc_voice_manager_approved_centers || undefined,
      status: user.bc_voice_manager_request_status as 'pending' | 'approved' | 'rejected',
      requestedAt: new Date(user.bc_voice_manager_requested_at),
      reviewedAt: user.bc_voice_manager_reviewed_at ? new Date(user.bc_voice_manager_reviewed_at) : undefined,
      reviewedBy: user.bc_voice_manager_reviewed_by || undefined,
      notes: user.bc_voice_manager_request_notes || undefined,
    }));
  } catch (error: any) {
    console.error('Error fetching BC Voice Manager requests:', error);
    throw error;
  }
};

export const updateBCVoiceManagerRequestStatus = async (
  requestId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  notes?: string,
  approvedCenters?: string[]
): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    // First verify the user exists
    const { data: userCheck, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', requestId)
      .single();

    if (checkError || !userCheck) {
      throw new Error(`No user found with ID: ${requestId}`);
    }

    console.log('Updating BC Voice Manager request:', { requestId, status, reviewedBy, notes });

    const updateData: any = {
      bc_voice_manager_request_status: status,
      bc_voice_manager_reviewed_at: new Date().toISOString(),
      bc_voice_manager_reviewed_by: reviewedBy,
    };

    if (notes) {
      updateData.bc_voice_manager_request_notes = sanitizeText(notes);
    }

    // If approved, merge new centers with existing approved centers
    if (status === 'approved' && approvedCenters && approvedCenters.length > 0) {
      // Get current approved centers
      const { data: currentData } = await supabase
        .from('users')
        .select('bc_voice_manager_approved_centers')
        .eq('id', requestId)
        .single();

      const existingApproved = currentData?.bc_voice_manager_approved_centers || [];

      // Merge and deduplicate
      const mergedCenters = [...new Set([...existingApproved, ...approvedCenters])];
      updateData.bc_voice_manager_approved_centers = mergedCenters;

      // Clear the newly approved centers from requested_centers
      const { data: requestData } = await supabase
        .from('users')
        .select('bc_voice_manager_requested_centers')
        .eq('id', requestId)
        .single();

      const currentRequested = requestData?.bc_voice_manager_requested_centers || [];
      const remainingRequested = currentRequested.filter(
        (centerId: string) => !approvedCenters.includes(centerId)
      );
      updateData.bc_voice_manager_requested_centers = remainingRequested;
    } else if (status === 'rejected') {
      // Clear approved centers on rejection
      updateData.bc_voice_manager_approved_centers = [];
    }

    // If approved, add bc_voice_manager role (role 4) using updateUser which handles conversion
    if (status === 'approved') {
      // Get current user roles
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', requestId)
        .single();

      if (userError) {
        throw new Error('Failed to fetch user roles');
      }

      // Normalize roles to array
      const currentRoles = currentUser.role || [];
      const rolesArray = Array.isArray(currentRoles) ? currentRoles : [currentRoles];

      // Check if user already has bc_voice_manager role (4)
      const hasBCVoiceManagerRole = rolesArray.some((r: any) =>
        r === 'bc_voice_manager' || r === 4 || r === 'center_admin'
      );

      if (!hasBCVoiceManagerRole) {
        // Add bc_voice_manager role using updateUser which handles conversion
        const updatedRoles = [...rolesArray, 'bc_voice_manager'];
        await updateUser(requestId, { role: updatedRoles });
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', requestId)
      .select('bc_voice_manager_request_status, role')
      .single();

    if (error) {
      console.error('Error updating BC Voice Manager request:', error);
      throw new Error('Failed to update BC Voice Manager request status');
    }

    if (!data) {
      console.log(`No rows updated for requestId: ${requestId}`);
      throw new Error(`No user found with ID: ${requestId}. Please check Supabase RLS policies.`);
    }

    // Verify the update was successful
    if (data.bc_voice_manager_request_status !== status) {
      console.error('Status mismatch after update:', {
        expected: status,
        actual: data.bc_voice_manager_request_status,
      });
      throw new Error('Failed to update BC Voice Manager request status - status mismatch');
    }

    console.log('BC Voice Manager request updated successfully:', data);
  } catch (error: any) {
    console.error('Error updating BC Voice Manager request:', error);
    throw error;
  }
};

/**
 * Request additional centers for an existing approved BC Voice Manager
 * This adds new centers to the requested_centers array for admin review
 */
export const requestAdditionalCenters = async (
  userId: string,
  additionalCenters: string[]
): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  if (!userId || !additionalCenters || additionalCenters.length === 0) {
    throw new Error('User ID and additional centers are required');
  }

  try {
    // Get current request data
    const { data: currentData, error: fetchError } = await supabase
      .from('users')
      .select('bc_voice_manager_requested_centers, bc_voice_manager_approved_centers, bc_voice_manager_request_status')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw new Error('Failed to fetch current request data');
    }

    if (!currentData || currentData.bc_voice_manager_request_status !== 'approved') {
      throw new Error('No approved BC Voice Manager request found');
    }

    // Merge new centers with existing requested centers (avoid duplicates)
    const existingRequested = currentData.bc_voice_manager_requested_centers || [];
    const existingApproved = currentData.bc_voice_manager_approved_centers || [];

    // Filter out centers that are already requested or approved
    const newCenters = additionalCenters.filter(
      centerId => !existingRequested.includes(centerId) && !existingApproved.includes(centerId)
    );

    if (newCenters.length === 0) {
      throw new Error('All selected centers are already requested or approved');
    }

    const updatedRequestedCenters = [...existingRequested, ...newCenters];

    // Update the requested centers
    const { error: updateError } = await supabase
      .from('users')
      .update({
        bc_voice_manager_requested_centers: updatedRequestedCenters,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error('Failed to request additional centers');
    }

    console.log('Additional centers requested successfully:', newCenters);
  } catch (error: any) {
    console.error('Error requesting additional centers:', error);
    throw error;
  }
};
