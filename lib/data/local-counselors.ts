export interface CounselorData {
  id: string;
  name: string;
  mobile: string;
  email: string;
  city: string;
  ashram?: string;
}

// Get all counselors from API with optional ashram filter
export const getCounselorsFromLocal = async (search?: string, ashram?: string): Promise<CounselorData[]> => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (ashram) params.append('ashram', ashram);

    const url = `/api/counselors/get${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch counselors');
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching counselors:', error);
    return [];
  }
};

// Add a new counselor
export const addCounselorToLocal = async (counselor: {
  name: string;
  mobile: string;
  email: string;
  city: string;
  ashram?: string;
}): Promise<boolean> => {
  try {
    // Get the current session token
    const { supabase } = await import('@/lib/supabase/config');
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const { getDeviceHeaders } = await import('@/lib/utils/device');
    const deviceHeaders = getDeviceHeaders();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...deviceHeaders as Record<string, string>, // Include device ID
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch('/api/counselors/add', {
      method: 'POST',
      headers,
      body: JSON.stringify(counselor),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error || 'Failed to add counselor');
      // Attach additional error data for duplicate handling
      if (errorData.duplicate) {
        (error as any).duplicate = true;
        (error as any).existingCounselor = errorData.existingCounselor;
      }
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error adding counselor:', error);
    throw error;
  }
};
