'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getCentersByLocationFromLocal, addCenterToLocal } from '@/lib/data/local-centers';
import { getCitiesByStateFromLocal, addCityToLocal } from '@/lib/data/local-cities';
import { getCounselorsFromLocal, addCounselorToLocal } from '@/lib/data/local-counselors';
import { supabase } from '@/lib/supabase/config';
import { validateCounselorInput, validateMobile, validateEmail, isValidName } from '@/lib/utils/validation';
import { Plus, X } from 'lucide-react';
import PhotoUpload from '@/components/ui/PhotoUpload';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export default function ProfileCompletionModal({ isOpen, onComplete }: ProfileCompletionModalProps) {
  const { user, userData } = useAuth();
  const [formData, setFormData] = useState({
    state: '',
    city: '',
    center: '',
    centerId: '',
    counselor: '',
  });
  const [selectedCounselor, setSelectedCounselor] = useState<{ id: string; name: string; mobile: string; email: string; city: string; ashram?: string } | null>(null);
  const [formInitialized, setFormInitialized] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableCenters, setAvailableCenters] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddCenter, setShowAddCenter] = useState(false);
  const [newCenter, setNewCenter] = useState({
    name: '',
    address: '',
    contact: '',
  });
  const [addingCenter, setAddingCenter] = useState(false);
  const [showAddCity, setShowAddCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [addingCity, setAddingCity] = useState(false);
  const [availableCounselors, setAvailableCounselors] = useState<Array<{ id: string; name: string; mobile: string; email: string; city: string; ashram?: string }>>([]);
  const [counselorSearch, setCounselorSearch] = useState('');
  const [loadingCounselors, setLoadingCounselors] = useState(false);
  const [showAddCounselor, setShowAddCounselor] = useState(false);
  const [newCounselor, setNewCounselor] = useState({
    name: '',
    mobile: '',
    email: '',
    city: '',
  });
  const [addingCounselor, setAddingCounselor] = useState(false);
  const [counselorFieldErrors, setCounselorFieldErrors] = useState({
    name: '',
    mobile: '',
    email: '',
    city: '',
  });
  const [profileImage, setProfileImage] = useState('');

  // Fetch states from API
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const response = await fetch('/api/states/get');
        if (response.ok) {
          const data = await response.json();
          setStates(data);
        } else {
          console.error('Failed to fetch states');
        }
      } catch (error) {
        console.error('Error loading states:', error);
      }
    };
    fetchStates();
  }, []);

  // Update cities when state changes
  useEffect(() => {
    const loadCities = async () => {
      if (formData.state) {
        const localCities = await getCitiesByStateFromLocal(formData.state);
        const allCities = [...new Set(localCities)].sort();
        setAvailableCities(allCities);
        setFormData(prev => ({ ...prev, city: '', center: '', centerId: '' }));
        setAvailableCenters([]);
      } else {
        setAvailableCities([]);
        setAvailableCenters([]);
      }
    };
    loadCities();
  }, [formData.state]);

  // Load centers when state and city change
  useEffect(() => {
    const loadCenters = async () => {
      if (formData.state && formData.city) {
        setLoadingCenters(true);
        try {
          const centers = await getCentersByLocationFromLocal(formData.state, formData.city);
          setAvailableCenters(centers.map(c => ({ id: c.id, name: c.name })));
        } catch (error) {
          console.error('Error loading centers:', error);
        } finally {
          setLoadingCenters(false);
        }
      } else {
        setAvailableCenters([]);
      }
      if (formData.city) {
        setFormData(prev => ({ ...prev, center: '', centerId: '' }));
      }
    };
    loadCenters();
  }, [formData.state, formData.city]);

  // Pre-fill form with existing data if available (only on initial load, once)
  useEffect(() => {
    if (!formInitialized && userData) {
      // Cast to any to access properties that might not be in the stricter User interface yet
      const userAny = userData as any;

      // Only pre-fill once when userData is first available and form hasn't been initialized
      const hasData = userAny.hierarchy || userAny.state || userAny.city || userAny.center;
      if (hasData && !formData.state && !formData.city && !formData.center) {
        setFormData({
          state: userAny.hierarchy?.state || userAny.state || '',
          city: userAny.hierarchy?.city || userAny.city || '',
          center: userAny.hierarchy?.center || userAny.center || '',
          centerId: userAny.center_id || userAny.hierarchy?.centerId || '',
          counselor: userAny.hierarchy?.counselor || userAny.counselor || '',
        });
        if (userAny.hierarchy?.counselor || userAny.counselor) {
          setCounselorSearch(userAny.hierarchy?.counselor || userAny.counselor || '');
        }
        // Also load profile image if available
        if (userAny.profile_image && !profileImage) {
          setProfileImage(userAny.profile_image);
        } else if (userAny.profileImage && !profileImage) {
          setProfileImage(userAny.profileImage);
        }
      }
      setFormInitialized(true); // Mark as initialized to prevent future resets
    }
  }, [userData, formInitialized]); // Run when userData becomes available, but only initialize once

  // Load counselors with search functionality
  useEffect(() => {
    const loadCounselors = async () => {
      setLoadingCounselors(true);
      try {
        const counselors = await getCounselorsFromLocal(counselorSearch);
        setAvailableCounselors(counselors);
      } catch (error) {
        console.error('Error loading counselors:', error);
      } finally {
        setLoadingCounselors(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      loadCounselors();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [counselorSearch]);

  const handleAddCity = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!newCityName.trim()) {
      setError('City name is required');
      return;
    }

    if (!formData.state) {
      setError('Please select state first');
      return;
    }

    setAddingCity(true);
    setError('');

    try {
      const success = await addCityToLocal(formData.state, newCityName.trim());
      if (success) {
        const localCities = await getCitiesByStateFromLocal(formData.state);
        const allCities = [...new Set(localCities)].sort();
        setAvailableCities(allCities);
        setFormData(prev => ({ ...prev, city: newCityName.trim() }));
        setNewCityName('');
        setShowAddCity(false);
      } else {
        setError('Failed to add city. Please contact an admin.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add city');
    } finally {
      setAddingCity(false);
    }
  };

  const handleAddCenter = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!newCenter.name.trim()) {
      setError('Center name is required');
      return;
    }

    if (!formData.state || !formData.city) {
      setError('Please select state and city first');
      return;
    }

    setAddingCenter(true);
    setError('');

    try {
      const success = await addCenterToLocal({
        name: newCenter.name.trim(),
        state: formData.state,
        city: formData.city,
        address: newCenter.address.trim() || undefined,
        contact: newCenter.contact.trim() || undefined,
      });

      if (success) {
        const updatedCenters = await getCentersByLocationFromLocal(formData.state, formData.city);
        setAvailableCenters(updatedCenters.map(c => ({ id: c.id, name: c.name })));

        // Find the new center to get its ID
        const addedCenter = updatedCenters.find(c => c.name === newCenter.name.trim());
        setFormData(prev => ({
          ...prev,
          center: newCenter.name.trim(),
          centerId: addedCenter?.id || ''
        }));

        setNewCenter({ name: '', address: '', contact: '' });
        setShowAddCenter(false);
      } else {
        setError('Failed to add center. Please contact an admin.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add center');
    } finally {
      setAddingCenter(false);
    }
  };

  const handleAddCounselor = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Reset field errors
    setCounselorFieldErrors({ name: '', mobile: '', email: '', city: '' });
    setError('');

    // Validate name
    if (!newCounselor.name.trim()) {
      setCounselorFieldErrors(prev => ({ ...prev, name: 'Counselor name is required' }));
      setError('Please fill in all required fields');
      return;
    }

    // Validate name format
    if (!isValidName(newCounselor.name)) {
      setCounselorFieldErrors(prev => ({ ...prev, name: 'Invalid characters in name. Only letters, numbers, and basic punctuation (.,-\'&) are allowed.' }));
      setError('Invalid counselor name');
      return;
    }

    // Validate mobile
    const mobileValidation = validateMobile(newCounselor.mobile);
    if (!mobileValidation.valid) {
      setCounselorFieldErrors(prev => ({ ...prev, mobile: mobileValidation.error || 'Invalid mobile number' }));
      setError('Invalid mobile number');
      return;
    }

    // Validate email
    const emailValidation = validateEmail(newCounselor.email);
    if (!emailValidation.valid) {
      setCounselorFieldErrors(prev => ({ ...prev, email: emailValidation.error || 'Invalid email address' }));
      setError('Invalid email address');
      return;
    }

    // Validate city
    if (!newCounselor.city.trim()) {
      setCounselorFieldErrors(prev => ({ ...prev, city: 'City is required' }));
      setError('City is required');
      return;
    }

    setAddingCounselor(true);
    setError('');

    try {
      const success = await addCounselorToLocal({
        name: newCounselor.name.trim(),
        mobile: newCounselor.mobile.trim(),
        email: newCounselor.email.trim().toLowerCase(),
        city: newCounselor.city.trim(),
      });

      if (success) {
        // Reload counselors to get the updated list
        const updatedCounselors = await getCounselorsFromLocal();
        setAvailableCounselors(updatedCounselors);

        // Select the newly added counselor
        const addedCounselor = updatedCounselors.find(c =>
          c.email.toLowerCase() === newCounselor.email.trim().toLowerCase()
        );
        if (addedCounselor) {
          setFormData(prev => ({ ...prev, counselor: addedCounselor.name }));
          setSelectedCounselor(addedCounselor);
          setCounselorSearch(addedCounselor.name);
        }

        // Reset form and hide add counselor form
        setNewCounselor({ name: '', mobile: '', email: '', city: '' });
        setShowAddCounselor(false);
        setCounselorFieldErrors({ name: '', mobile: '', email: '', city: '' });
      } else {
        setError('Failed to add counselor. Please contact an admin.');
      }
    } catch (err: any) {
      // Check if it's a duplicate error
      if (err.message?.includes('already exists') || err.message?.includes('duplicate') || err.duplicate) {
        setError(err.message || 'A counselor with this information already exists.');
        // If there's an existing counselor, suggest selecting it
        if (err.existingCounselor) {
          setError(`${err.message} You can select "${err.existingCounselor.name}" from the dropdown.`);
        }
      } else {
        setError(err.message || 'Failed to add counselor');
      }
    } finally {
      setAddingCounselor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate photo upload
    if (!profileImage || !profileImage.trim()) {
      setError('Please upload your profile photo. It is required to complete your profile.');
      return;
    }

    if (!formData.state || !formData.city || !formData.center || !formData.counselor) {
      setError('Please fill in all required fields (State, City, Center, and Counselor)');
      return;
    }

    if (!user || !supabase) {
      setError('User session not found. Please sign in again.');
      return;
    }

    setLoading(true);

    try {
      // Use the selectedCounselor state which has email and ashram
      let counselorData: any = {};

      if (selectedCounselor) {
        if (selectedCounselor.ashram === 'Brahmachari Ashram') {
          counselorData.brahmachari_counselor = selectedCounselor.name;
          counselorData.brahmachari_counselor_email = selectedCounselor.email;
        } else {
          // Default to Grihastha for others or if unspecified
          counselorData.grihastha_counselor = selectedCounselor.name;
          counselorData.grihastha_counselor_email = selectedCounselor.email;
        }
      } else {
        // Fallback: try to find in availableCounselors if selectedCounselor is null
        const foundCounselor = availableCounselors.find(c => c.name === formData.counselor);
        if (foundCounselor) {
          if (foundCounselor.ashram === 'Brahmachari Ashram') {
            counselorData.brahmachari_counselor = foundCounselor.name;
            counselorData.brahmachari_counselor_email = foundCounselor.email;
          } else {
            counselorData.grihastha_counselor = foundCounselor.name;
            counselorData.grihastha_counselor_email = foundCounselor.email;
          }
        } else {
          // Last resort fallback if name was manually typed
          counselorData.grihastha_counselor = formData.counselor;
        }
      }

      // Build hierarchy object for backward compatibility
      const hierarchy: any = {};
      if (formData.state) hierarchy.state = formData.state;
      if (formData.city) hierarchy.city = formData.city;
      if (formData.center) hierarchy.center = formData.center;
      if (formData.centerId) hierarchy.centerId = formData.centerId;
      if (counselorData.brahmachari_counselor) {
        hierarchy.brahmachariCounselor = counselorData.brahmachari_counselor;
        hierarchy.brahmachariCounselorEmail = counselorData.brahmachari_counselor_email;
      }
      if (counselorData.grihastha_counselor) {
        hierarchy.grihasthaCounselor = counselorData.grihastha_counselor;
        hierarchy.grihasthaCounselorEmail = counselorData.grihastha_counselor_email;
      }
      if (formData.counselor) hierarchy.counselor = formData.counselor;

      console.log('Updating user profile:', {
        state: formData.state,
        city: formData.city,
        center: formData.center,
        center_id: formData.centerId,
        ...counselorData
      });

      // Update user profile in Supabase - using separate columns
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({
          state: formData.state || null,
          city: formData.city || null,
          center: formData.center || null,
          center_id: formData.centerId || null,
          ...counselorData,
          profile_image: profileImage || null, // Google Drive photo link
          hierarchy: hierarchy, // Keep for backward compatibility
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select('id, state, city, center, center_id, profile_image');

      console.log('Update result:', { updateData, updateError });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update profile');
      }

      // Success - reload the page to refresh user data
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary-700">
              Complete Your Profile
            </h2>
            <p className="text-sm text-gray-500">
              Required to continue
            </p>
          </div>

          <p className="text-gray-600 mb-6">
            Please provide your location information (State, City, Center) first, then upload your profile photo. The photo will be organized in folders based on your location. This information is required to access the platform.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* State Selection */}
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
              >
                <option value="">Select State</option>
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* City Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City <span className="text-red-500">*</span>
                </label>
                {formData.state && (
                  <button
                    type="button"
                    onClick={() => setShowAddCity(!showAddCity)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add City
                  </button>
                )}
              </div>
              {showAddCity ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCityName}
                      onChange={(e) => setNewCityName(e.target.value)}
                      placeholder="Enter city name"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCity}
                      disabled={addingCity}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {addingCity ? 'Adding...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCity(false);
                        setNewCityName('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  disabled={!formData.state}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">{formData.state ? 'Select City' : 'Select State first'}</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Center Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="center" className="block text-sm font-medium text-gray-700">
                  Center <span className="text-red-500">*</span>
                </label>
                {formData.state && formData.city && (
                  <button
                    type="button"
                    onClick={() => setShowAddCenter(!showAddCenter)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Center
                  </button>
                )}
              </div>
              {showAddCenter ? (
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Center Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCenter.name}
                      onChange={(e) => setNewCenter({ ...newCenter, name: e.target.value })}
                      placeholder="Enter center name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={newCenter.address}
                      onChange={(e) => setNewCenter({ ...newCenter, address: e.target.value })}
                      placeholder="Enter center address"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact (Optional)
                    </label>
                    <input
                      type="text"
                      value={newCenter.contact}
                      onChange={(e) => setNewCenter({ ...newCenter, contact: e.target.value })}
                      placeholder="Enter contact information"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddCenter}
                      disabled={addingCenter}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {addingCenter ? 'Adding...' : 'Add Center'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCenter(false);
                        setNewCenter({ name: '', address: '', contact: '' });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  id="center"
                  value={formData.centerId}
                  onChange={(e) => {
                    const selectedCenter = availableCenters.find(c => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      center: selectedCenter?.name || '',
                      centerId: e.target.value
                    });
                  }}
                  required
                  disabled={!formData.state || !formData.city}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingCenters
                      ? 'Loading centers...'
                      : !formData.state || !formData.city
                        ? 'Select State and City first'
                        : 'Select Center'}
                  </option>
                  {availableCenters.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Profile Photo Upload - After location fields for folder structure */}
            <div>
              <PhotoUpload
                onUploadComplete={(url) => {
                  setProfileImage(url);
                  // Clear any photo-related errors when upload succeeds
                  if (error && error.includes('profile photo')) {
                    setError('');
                  }
                }}
                onUploadError={(error) => setError(error)}
                userName={userData?.name || user?.email || 'user'}
                disabled={loading}
                required={true}
                showMessage={true}
                state={formData.state}
                city={formData.city}
                center={formData.center}
              />
            </div>

            {/* Counselor Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="counselor" className="block text-sm font-medium text-gray-700">
                  Counselor Name <span className="text-red-500">*</span>
                </label>
                {!showAddCounselor && (
                  <button
                    type="button"
                    onClick={() => setShowAddCounselor(true)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Counselor
                  </button>
                )}
              </div>
              {showAddCounselor ? (
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Counselor Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCounselor.name}
                      onChange={(e) => {
                        setNewCounselor({ ...newCounselor, name: e.target.value });
                        if (counselorFieldErrors.name) {
                          setCounselorFieldErrors(prev => ({ ...prev, name: '' }));
                        }
                      }}
                      placeholder="Enter counselor name"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white ${counselorFieldErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                    />
                    {counselorFieldErrors.name && (
                      <p className="mt-1 text-xs text-red-600">{counselorFieldErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newCounselor.mobile}
                      onChange={(e) => {
                        setNewCounselor({ ...newCounselor, mobile: e.target.value });
                        if (counselorFieldErrors.mobile) {
                          setCounselorFieldErrors(prev => ({ ...prev, mobile: '' }));
                        }
                      }}
                      placeholder="Enter mobile number (e.g., +91 9876543210)"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white ${counselorFieldErrors.mobile ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                    />
                    {counselorFieldErrors.mobile && (
                      <p className="mt-1 text-xs text-red-600">{counselorFieldErrors.mobile}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newCounselor.email}
                      onChange={(e) => {
                        setNewCounselor({ ...newCounselor, email: e.target.value });
                        if (counselorFieldErrors.email) {
                          setCounselorFieldErrors(prev => ({ ...prev, email: '' }));
                        }
                      }}
                      placeholder="Enter email address (e.g., name@example.com)"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white ${counselorFieldErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                    />
                    {counselorFieldErrors.email && (
                      <p className="mt-1 text-xs text-red-600">{counselorFieldErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCounselor.city}
                      onChange={(e) => {
                        setNewCounselor({ ...newCounselor, city: e.target.value });
                        if (counselorFieldErrors.city) {
                          setCounselorFieldErrors(prev => ({ ...prev, city: '' }));
                        }
                      }}
                      required
                      placeholder="Enter city name (e.g., Mumbai)"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white ${counselorFieldErrors.city ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                    />
                    {counselorFieldErrors.city && (
                      <p className="mt-1 text-xs text-red-600">{counselorFieldErrors.city}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddCounselor}
                      disabled={addingCounselor || !newCounselor.name.trim() || !newCounselor.mobile.trim() || !newCounselor.email.trim() || !newCounselor.city.trim()}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {addingCounselor ? 'Adding...' : 'Add Counselor'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCounselor(false);
                        setNewCounselor({ name: '', mobile: '', email: '', city: '' });
                        setCounselorFieldErrors({ name: '', mobile: '', email: '', city: '' });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      id="counselor"
                      value={counselorSearch}
                      onChange={(e) => {
                        setCounselorSearch(e.target.value);
                        if (!e.target.value) {
                          setFormData(prev => ({ ...prev, counselor: '' }));
                        }
                      }}
                      onFocus={() => {
                        if (!counselorSearch && !formData.counselor) {
                          getCounselorsFromLocal().then(counselors => {
                            setAvailableCounselors(counselors);
                          });
                        }
                      }}
                      placeholder={formData.counselor ? formData.counselor : "Search counselor by name..."}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                    />
                    {counselorSearch && !formData.counselor && (
                      <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
                        {loadingCounselors ? (
                          <div className="p-3 text-sm text-gray-500">Loading...</div>
                        ) : availableCounselors.length > 0 ? (
                          availableCounselors.map(counselor => (
                            <button
                              key={counselor.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, counselor: counselor.name }));
                                setSelectedCounselor(counselor);
                                setCounselorSearch(counselor.name);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">{counselor.name}</div>
                              <div className="text-xs text-gray-500">{counselor.city}</div>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-sm text-gray-500">No counselors found. Click "Add Counselor" to add one.</div>
                        )}
                      </div>
                    )}
                  </div>
                  {formData.counselor && (
                    <p className="mt-1 text-xs text-gray-600">
                      Selected: <strong>{formData.counselor}</strong>
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !profileImage || !formData.state || !formData.city || !formData.center || !formData.counselor}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Complete Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
