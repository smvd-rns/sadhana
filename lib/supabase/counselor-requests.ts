import { supabase } from './config';
import { CounselorRequest } from '@/types';
import { sanitizeText } from '@/lib/utils/sanitize';

export const createCounselorRequest = async (
  userId: string,
  userEmail: string,
  userName: string,
  counselorEmail: string,
  message?: string
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
      .select('counselor_request_status')
      .eq('id', userId)
      .single();

    // Handle different error cases
    if (checkError) {
      // PGRST116 = no rows returned (user doesn't exist)
      if (checkError.code === 'PGRST116') {
        throw new Error('User not found');
      }
      // If it's a different error, log it but continue (might be column doesn't exist yet)
      console.warn('Error checking existing request:', checkError);
    }

    // If user already has a pending request, throw error
    if (existingUser?.counselor_request_status === 'pending') {
      throw new Error('You already have a pending counselor request');
    }

    // Sanitize the message
    const sanitizedMessage = message ? sanitizeText(message) : '';

    // Update user record with counselor request
    // Clear old rejection data when creating a new request
    const { data, error } = await supabase
      .from('users')
      .update({
        counselor_request_status: 'pending',
        counselor_request_message: sanitizedMessage,
        counselor_request_email: counselorEmail,
        counselor_requested_at: new Date().toISOString(),
        counselor_reviewed_at: null,
        counselor_reviewed_by: null,
        counselor_request_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to create counselor request');
    }

    return userId;
  } catch (error: any) {
    console.error('Error creating counselor request:', error);
    throw error;
  }
};

export const getCounselorRequestByUserId = async (userId: string): Promise<CounselorRequest | null> => {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, counselor_request_status, counselor_request_message, counselor_request_email, counselor_requested_at, counselor_reviewed_at, counselor_reviewed_by, counselor_request_notes')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    // If no request status, return null
    if (!data.counselor_request_status) {
      return null;
    }

    return {
      id: data.id,
      userId: data.id,
      userEmail: data.email,
      userName: data.name,
      counselorEmail: data.counselor_request_email || data.email,
      message: data.counselor_request_message || '',
      status: data.counselor_request_status as 'pending' | 'approved' | 'rejected',
      requestedAt: data.counselor_requested_at ? new Date(data.counselor_requested_at) : new Date(),
      reviewedAt: data.counselor_reviewed_at ? new Date(data.counselor_reviewed_at) : undefined,
      reviewedBy: data.counselor_reviewed_by || undefined,
      notes: data.counselor_request_notes || undefined,
    } as CounselorRequest;
  } catch (error) {
    console.error('Error fetching counselor request:', error);
    return null;
  }
};

export const getAllCounselorRequests = async (status?: 'pending' | 'approved' | 'rejected'): Promise<CounselorRequest[]> => {
  if (!supabase) {
    return [];
  }

  try {
    let query = supabase
      .from('users')
      .select('id, email, name, counselor_request_status, counselor_request_message, counselor_request_email, counselor_requested_at, counselor_reviewed_at, counselor_reviewed_by, counselor_request_notes')
      .not('counselor_request_status', 'is', null)
      .order('counselor_requested_at', { ascending: false });

    if (status) {
      query = query.eq('counselor_request_status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching counselor requests:', error);
      return [];
    }

    return (data || []).map((user: any) => ({
      id: user.id,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      counselorEmail: user.counselor_request_email || user.email,
      message: user.counselor_request_message || '',
      status: user.counselor_request_status as 'pending' | 'approved' | 'rejected',
      requestedAt: user.counselor_requested_at ? new Date(user.counselor_requested_at) : new Date(),
      reviewedAt: user.counselor_reviewed_at ? new Date(user.counselor_reviewed_at) : undefined,
      reviewedBy: user.counselor_reviewed_by || undefined,
      notes: user.counselor_request_notes || undefined,
    } as CounselorRequest));
  } catch (error) {
    console.error('Error fetching counselor requests:', error);
    return [];
  }
};

export const updateCounselorRequestStatus = async (
  requestId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  notes?: string
): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  if (!requestId) {
    throw new Error('Request ID is required');
  }

  try {
    // First, verify the user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, counselor_request_status')
      .eq('id', requestId)
      .single();

    if (checkError) {
      console.error('Error checking user existence:', checkError);
      if (checkError.code === 'PGRST116') {
        throw new Error(`User not found with ID: ${requestId}. Please ensure the user exists in Supabase.`);
      }
      throw new Error(`Failed to verify user: ${checkError.message}`);
    }

    if (!existingUser) {
      throw new Error(`User not found with ID: ${requestId}`);
    }

    console.log('User found:', { id: existingUser.id, email: existingUser.email, currentStatus: existingUser.counselor_request_status });

    const updateData: any = {
      counselor_request_status: status,
      counselor_reviewed_at: new Date().toISOString(),
      counselor_reviewed_by: reviewedBy,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.counselor_request_notes = sanitizeText(notes);
    }

    console.log('Updating counselor request:', { requestId, status, updateData });

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', requestId)
      .select('id, counselor_request_status, counselor_request_notes, counselor_reviewed_at');

    if (error) {
      console.error('Supabase update error:', error);
      throw new Error(error.message || `Failed to update counselor request: ${error.code || 'Unknown error'}`);
    }

    if (!data || data.length === 0) {
      // This might happen if RLS policies block the update
      console.warn('No rows updated for requestId:', requestId);
      console.warn('User exists but update was blocked. This is likely due to Row Level Security (RLS) policies.');
      console.warn('Please check your Supabase RLS policies for the users table.');
      console.warn('The policy should allow authenticated users with super_admin role to update counselor_request_status fields.');
      throw new Error(`Update failed: Row Level Security (RLS) policies may be blocking this update. Please check your Supabase RLS policies for the 'users' table. User ID: ${requestId}`);
    }

    const updatedUser = data[0];
    console.log('Successfully updated counselor request:', updatedUser);

    // Verify the status was actually updated
    if (updatedUser.counselor_request_status !== status) {
      console.error('Status mismatch! Expected:', status, 'Got:', updatedUser.counselor_request_status);
      throw new Error(`Status update failed. Expected ${status} but got ${updatedUser.counselor_request_status}`);
    }
  } catch (error) {
    console.error('Error updating counselor request:', error);
    throw error;
  }
};

export const checkIfEmailIsCounselor = async (email: string): Promise<boolean> => {
  try {
    // Fetch all counselors and check if email matches
    const response = await fetch('/api/counselors/get');
    if (!response.ok) {
      return false;
    }
    const counselors = await response.json();
    if (!Array.isArray(counselors)) {
      return false;
    }
    // Check if any counselor has this email (case-insensitive)
    return counselors.some(counselor => 
      counselor.email && counselor.email.toLowerCase() === email.toLowerCase()
    );
  } catch (error) {
    console.error('Error checking counselor email:', error);
    return false;
  }
};
