'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/config';
import { updateUser } from '@/lib/supabase/users';
import { getCentersByLocationFromLocal, addCenterToLocal } from '@/lib/data/local-centers';
import { getCitiesByStateFromLocal, addCityToLocal } from '@/lib/data/local-cities';
import { getCounselorsFromLocal, addCounselorToLocal } from '@/lib/data/local-counselors';
import {
  Plus, X, User, Mail, Phone, MapPin, Building2,
  BookOpen, GraduationCap, Calendar, LogOut,
  ChevronRight, AlertCircle, Check, Loader2, Heart, Sparkles,
  Shield, Upload // For Royal Member and Profile Photo
} from 'lucide-react';
import { validateEmail, isValidName, validateCounselorInput, validateMobile } from '@/lib/utils/validation';
import PhotoUpload from '@/components/ui/PhotoUpload';

export default function CompleteProfilePage() {
  const { user, userData, refreshUserData } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    state: '',
    city: '',
    center: '',
    // Spiritual fields
    initiationStatus: '', // 'initiated' or 'aspiring'
    initiatedName: '',
    spiritualMasterName: '',
    aspiringSpiritualMasterName: '',
    chantingSince: '',
    rounds: '',
    ashram: '',
    royalMember: '', // 'yes' or 'no'
    brahmachariCounselor: '',
    brahmachariCounselorEmail: '',
    grihasthaCounselor: '',
    grihasthaCounselorEmail: '',
    centerId: '', // Added for type safety
  });
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

  // Brahmachari Counselor state
  const [availableBrahmachariCounselors, setAvailableBrahmachariCounselors] = useState<Array<{ id: string; name: string; mobile: string; email: string; city: string; ashram?: string }>>([]);
  const [brahmachariCounselorSearch, setBrahmachariCounselorSearch] = useState('');
  const [loadingBrahmachariCounselors, setLoadingBrahmachariCounselors] = useState(false);
  const [showAddBrahmachariCounselor, setShowAddBrahmachariCounselor] = useState(false);
  const [newBrahmachariCounselor, setNewBrahmachariCounselor] = useState({
    name: '',
    mobile: '',
    email: '',
    city: '',
  });
  const [addingBrahmachariCounselor, setAddingBrahmachariCounselor] = useState(false);

  // Grihastha Counselor state
  const [availableGrihasthaCounselors, setAvailableGrihasthaCounselors] = useState<Array<{ id: string; name: string; mobile: string; email: string; city: string; ashram?: string }>>([]);
  const [grihasthaCounselorSearch, setGrihasthaCounselorSearch] = useState('');
  const [loadingGrihasthaCounselors, setLoadingGrihasthaCounselors] = useState(false);
  const [showAddGrihasthaCounselor, setShowAddGrihasthaCounselor] = useState(false);
  const [newGrihasthaCounselor, setNewGrihasthaCounselor] = useState({
    name: '',
    mobile: '',
    email: '',
    city: '',
  });
  const [addingGrihasthaCounselor, setAddingGrihasthaCounselor] = useState(false);

  // Shared counselor field errors
  const [counselorFieldErrors, setCounselorFieldErrors] = useState({
    name: '',
    mobile: '',
    email: '',
    city: '',
  });
  const [profileImage, setProfileImage] = useState('');
  const uploadedImageUrlRef = useRef<string>(''); // Track the URL we just uploaded to ensure it's available

  // Debug: Log when profileImage changes
  useEffect(() => {
    console.log('Complete Profile - profileImage state changed to:', profileImage);
  }, [profileImage]);

  // Load user data if available
  useEffect(() => {
    if (userData) {
      const savedCenter = userData.hierarchy?.center || '';
      const savedState = userData.hierarchy?.state || '';
      const savedCity = userData.hierarchy?.city || '';

      setFormData(prev => ({
        ...prev,
        name: userData.name || user?.user_metadata?.name || user?.email?.split('@')[0] || '',
        email: userData.email || user?.email || '',
        state: savedState,
        city: savedCity,
        center: savedCenter,
        initiationStatus: userData.hierarchy?.initiationStatus || '',
        initiatedName: userData.hierarchy?.initiatedName || '',
        spiritualMasterName: userData.hierarchy?.spiritualMasterName || '',
        aspiringSpiritualMasterName: userData.hierarchy?.aspiringSpiritualMasterName || '',
        chantingSince: userData.hierarchy?.chantingSince || '',
        rounds: userData.hierarchy?.rounds?.toString() || '',
        ashram: userData.hierarchy?.ashram || '',
        royalMember: typeof userData.hierarchy?.royalMember === 'boolean'
          ? (userData.hierarchy.royalMember ? 'yes' : 'no')
          : (userData.hierarchy?.royalMember || ''),
        brahmachariCounselor: userData.hierarchy?.brahmachariCounselor || '',
        brahmachariCounselorEmail: userData.hierarchy?.brahmachariCounselorEmail || '',
        grihasthaCounselor: userData.hierarchy?.grihasthaCounselor || '',
        grihasthaCounselorEmail: userData.hierarchy?.grihasthaCounselorEmail || '',
      }));
      if (userData.profileImage) {
        setProfileImage(userData.profileImage);
      }
      // Set counselor search values
      if (userData.hierarchy?.brahmachariCounselor) {
        setBrahmachariCounselorSearch(userData.hierarchy.brahmachariCounselor);
      }
      if (userData.hierarchy?.grihasthaCounselor) {
        setGrihasthaCounselorSearch(userData.hierarchy.grihasthaCounselor);
      }

      // Load centers immediately if state and city are available from userData
      // This ensures the center dropdown shows the saved center name
      if (savedState && savedCity) {
        const loadCentersForUserData = async () => {
          try {
            const centers = await getCentersByLocationFromLocal(savedState, savedCity);
            const centersList = centers.map(c => ({ id: c.id, name: c.name }));
            setAvailableCenters(centersList);
            console.log('Loaded centers for userData:', centersList);
            console.log('Saved center name from database:', savedCenter);

            // Verify the saved center exists in the list and ensure it's set correctly
            if (savedCenter && savedCenter.trim() !== '') {
              const centerExists = centersList.some(c => c.name.trim() === savedCenter.trim());
              if (!centerExists) {
                // Try case-insensitive match
                const matchedCenter = centersList.find(c =>
                  c.name.trim().toLowerCase() === savedCenter.trim().toLowerCase()
                );
                if (matchedCenter) {
                  console.log('Found case-insensitive match, updating center to:', matchedCenter.name);
                  setFormData(prev => ({ ...prev, center: matchedCenter.name }));
                } else {
                  console.warn('⚠️ Saved center not found in centers list:', savedCenter);
                  console.warn('Available centers:', centersList.map(c => c.name));
                  // Keep the saved center name even if not in list (might be valid)
                  // But ensure it's set in formData
                  setFormData(prev => ({ ...prev, center: savedCenter }));
                }
              } else {
                console.log('✅ Saved center found in centers list');
                // Ensure center is set correctly (trimmed to match option value)
                const exactMatch = centersList.find(c => c.name.trim() === savedCenter.trim());
                if (exactMatch && exactMatch.name !== savedCenter) {
                  console.log('Updating center to exact match:', exactMatch.name);
                  setFormData(prev => ({ ...prev, center: exactMatch.name }));
                }
              }
            }
          } catch (error) {
            console.error('Error loading centers for userData:', error);
          } finally {
            // Mark initial load as complete after centers are loaded
            isInitialLoadRef.current = false;
          }
        };
        loadCentersForUserData();
      } else {
        isInitialLoadRef.current = false;
      }
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        email: user.email || '',
      }));
      isInitialLoadRef.current = false;
    }
  }, [user, userData]);

  // Fetch states from API
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const response = await fetch('/api/states/get', { cache: 'no-store' });
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

  // Track if this is the initial load from userData
  const isInitialLoadRef = useRef(true);

  // Update cities when state changes
  useEffect(() => {
    const loadCities = async () => {
      if (formData.state) {
        const localCities = await getCitiesByStateFromLocal(formData.state);
        const allCities = [...new Set(localCities)].sort();
        setAvailableCities(allCities);

        // Only reset city and center if this is NOT the initial load from userData
        // On initial load, userData already has the correct values, so don't reset them
        if (!isInitialLoadRef.current) {
          setFormData(prev => ({ ...prev, city: '', center: '' }));
          setAvailableCenters([]);
        }
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
          const centersList = centers.map(c => ({ id: c.id, name: c.name }));
          setAvailableCenters(centersList);

          // Only reset center if user manually changes city (not on initial load)
          if (!isInitialLoadRef.current && formData.city) {
            // User changed city manually, reset center
            setFormData(prev => ({ ...prev, center: '' }));
          }
        } catch (error) {
          console.error('Error loading centers:', error);
        } finally {
          setLoadingCenters(false);
        }
      } else {
        setAvailableCenters([]);
      }
    };
    loadCenters();
  }, [formData.state, formData.city]);

  // Load Brahmachari counselors with search functionality
  useEffect(() => {
    const loadCounselors = async () => {
      setLoadingBrahmachariCounselors(true);
      try {
        const counselors = await getCounselorsFromLocal(brahmachariCounselorSearch, 'Brahmachari Ashram');
        setAvailableBrahmachariCounselors(counselors);
      } catch (error) {
        console.error('Error loading Brahmachari counselors:', error);
      } finally {
        setLoadingBrahmachariCounselors(false);
      }
    };

    const timeoutId = setTimeout(() => {
      loadCounselors();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [brahmachariCounselorSearch]);

  // Load Grihastha counselors with search functionality
  useEffect(() => {
    const loadCounselors = async () => {
      setLoadingGrihasthaCounselors(true);
      try {
        const counselors = await getCounselorsFromLocal(grihasthaCounselorSearch, 'Grihastha Ashram');
        setAvailableGrihasthaCounselors(counselors);
      } catch (error) {
        console.error('Error loading Grihastha counselors:', error);
      } finally {
        setLoadingGrihasthaCounselors(false);
      }
    };

    const timeoutId = setTimeout(() => {
      loadCounselors();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [grihasthaCounselorSearch]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

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
      const success = await addCityToLocal(
        formData.state,
        newCityName.trim()
      );

      if (success) {
        const updatedCities = await getCitiesByStateFromLocal(formData.state);
        setAvailableCities([...new Set(updatedCities)].sort());
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

    if (!newCenter.address.trim()) {
      setError('Center address is required');
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
        address: newCenter.address.trim(),
        contact: newCenter.contact.trim() || undefined,
      });

      if (success) {
        const updatedCenters = await getCentersByLocationFromLocal(formData.state, formData.city);
        setAvailableCenters(updatedCenters.map(c => ({ id: c.id, name: c.name })));
        setFormData(prev => ({ ...prev, center: newCenter.name.trim() }));
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

  // Handle adding Brahmachari Counselor
  const handleAddBrahmachariCounselor = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setCounselorFieldErrors({ name: '', mobile: '', email: '', city: '' });
    setError('');

    if (!newBrahmachariCounselor.name.trim()) {
      setCounselorFieldErrors(prev => ({ ...prev, name: 'Counselor name is required' }));
      setError('Please fill in all required fields');
      return;
    }

    if (!isValidName(newBrahmachariCounselor.name)) {
      setCounselorFieldErrors(prev => ({ ...prev, name: 'Invalid characters in name. Only letters, numbers, and basic punctuation (.,-\'&) are allowed.' }));
      setError('Invalid counselor name');
      return;
    }

    const mobileValidation = validateMobile(newBrahmachariCounselor.mobile);
    if (!mobileValidation.valid) {
      setCounselorFieldErrors(prev => ({ ...prev, mobile: mobileValidation.error || 'Invalid mobile number' }));
      setError('Invalid mobile number');
      return;
    }

    const emailValidation = validateEmail(newBrahmachariCounselor.email);
    if (!emailValidation.valid) {
      setCounselorFieldErrors(prev => ({ ...prev, email: emailValidation.error || 'Invalid email address' }));
      setError('Invalid email address');
      return;
    }

    setAddingBrahmachariCounselor(true);
    setError('');

    try {
      if (!newBrahmachariCounselor.city.trim()) {
        setCounselorFieldErrors(prev => ({ ...prev, city: 'City is required' }));
        setError('City is required');
        return;
      }

      const success = await addCounselorToLocal({
        name: newBrahmachariCounselor.name.trim(),
        mobile: newBrahmachariCounselor.mobile.trim(),
        email: newBrahmachariCounselor.email.trim().toLowerCase(),
        city: newBrahmachariCounselor.city.trim(),
        ashram: 'Brahmachari Ashram',
      });

      if (success) {
        const updatedCounselors = await getCounselorsFromLocal('', 'Brahmachari Ashram');
        setAvailableBrahmachariCounselors(updatedCounselors);

        const addedCounselor = updatedCounselors.find(c =>
          c.email.toLowerCase() === newBrahmachariCounselor.email.trim().toLowerCase()
        );
        if (addedCounselor) {
          setFormData(prev => ({ ...prev, brahmachariCounselor: addedCounselor.name }));
        }

        setNewBrahmachariCounselor({ name: '', mobile: '', email: '', city: '' });
        setShowAddBrahmachariCounselor(false);
        setBrahmachariCounselorSearch('');
        setCounselorFieldErrors({ name: '', mobile: '', email: '', city: '' });
      } else {
        setError('Failed to add counselor. Please contact an admin.');
      }
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
        if (err.existingCounselor) {
          setError(`${err.message} You can select "${err.existingCounselor.name}" from the dropdown.`);
        } else {
          setError(err.message);
        }
      } else {
        setError(err.message || 'Failed to add counselor');
      }
    } finally {
      setAddingBrahmachariCounselor(false);
    }
  };

  // Handle adding Grihastha Counselor
  const handleAddGrihasthaCounselor = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setCounselorFieldErrors({ name: '', mobile: '', email: '', city: '' });
    setError('');

    if (!newGrihasthaCounselor.name.trim()) {
      setCounselorFieldErrors(prev => ({ ...prev, name: 'Counselor name is required' }));
      setError('Please fill in all required fields');
      return;
    }

    if (!isValidName(newGrihasthaCounselor.name)) {
      setCounselorFieldErrors(prev => ({ ...prev, name: 'Invalid characters in name. Only letters, numbers, and basic punctuation (.,-\'&) are allowed.' }));
      setError('Invalid counselor name');
      return;
    }

    const mobileValidation = validateMobile(newGrihasthaCounselor.mobile);
    if (!mobileValidation.valid) {
      setCounselorFieldErrors(prev => ({ ...prev, mobile: mobileValidation.error || 'Invalid mobile number' }));
      setError('Invalid mobile number');
      return;
    }

    const emailValidation = validateEmail(newGrihasthaCounselor.email);
    if (!emailValidation.valid) {
      setCounselorFieldErrors(prev => ({ ...prev, email: emailValidation.error || 'Invalid email address' }));
      setError('Invalid email address');
      return;
    }

    setAddingGrihasthaCounselor(true);
    setError('');

    try {
      if (!newGrihasthaCounselor.city.trim()) {
        setCounselorFieldErrors(prev => ({ ...prev, city: 'City is required' }));
        setError('City is required');
        return;
      }

      const success = await addCounselorToLocal({
        name: newGrihasthaCounselor.name.trim(),
        mobile: newGrihasthaCounselor.mobile.trim(),
        email: newGrihasthaCounselor.email.trim().toLowerCase(),
        city: newGrihasthaCounselor.city.trim(),
        ashram: 'Grihastha Ashram',
      });

      if (success) {
        const updatedCounselors = await getCounselorsFromLocal('', 'Grihastha Ashram');
        setAvailableGrihasthaCounselors(updatedCounselors);

        const addedCounselor = updatedCounselors.find(c =>
          c.email.toLowerCase() === newGrihasthaCounselor.email.trim().toLowerCase()
        );
        if (addedCounselor) {
          setFormData(prev => ({
            ...prev,
            grihasthaCounselor: addedCounselor.name,
            grihasthaCounselorEmail: addedCounselor.email
          }));
        }

        setNewGrihasthaCounselor({ name: '', mobile: '', email: '', city: '' });
        setShowAddGrihasthaCounselor(false);
        setGrihasthaCounselorSearch('');
        setCounselorFieldErrors({ name: '', mobile: '', email: '', city: '' });
      } else {
        setError('Failed to add counselor. Please contact an admin.');
      }
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
        if (err.existingCounselor) {
          setError(`${err.message} You can select "${err.existingCounselor.name}" from the dropdown.`);
        } else {
          setError(err.message);
        }
      } else {
        setError(err.message || 'Failed to add counselor');
      }
    } finally {
      setAddingGrihasthaCounselor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be logged in to complete your profile');
      return;
    }

    // Validate Name
    if (!isValidName(formData.name)) {
      setError('Invalid characters in name');
      return;
    }

    // Validate Email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Invalid email');
      return;
    }

    // Validate required fields
    // Use ref value first (synchronous) if state is empty (handles React state batching issues)
    // Check both state and ref to ensure we have the uploaded image
    const finalProfileImageValue = uploadedImageUrlRef.current?.trim() || profileImage?.trim() || '';
    console.log('Complete Profile - handleSubmit - profileImage state:', profileImage);
    console.log('Complete Profile - handleSubmit - uploadedImageUrlRef.current:', uploadedImageUrlRef.current);
    console.log('Complete Profile - handleSubmit - finalProfileImageValue:', finalProfileImageValue);

    if (!finalProfileImageValue) {
      console.error('Complete Profile - handleSubmit - Profile image validation failed. Both state and ref are empty.');
      console.error('Complete Profile - handleSubmit - Validation check: ref=', uploadedImageUrlRef.current, ', state=', profileImage);
      setError('Please upload your profile photo. It is required.');
      return;
    }

    // Ensure state is in sync with ref (update if needed, but we'll use ref value anyway)
    if (uploadedImageUrlRef.current?.trim() && profileImage !== uploadedImageUrlRef.current.trim()) {
      console.log('Complete Profile - handleSubmit - Syncing profileImage state with ref');
      setProfileImage(uploadedImageUrlRef.current.trim());
    }

    // Validate location fields
    if (!formData.state || !formData.city || !formData.center) {
      setError('Please fill in all required location fields (State, City, and Center)');
      return;
    }

    // Validate spiritual fields
    if (!formData.initiationStatus) {
      setError('Please select whether you are Initiated or Aspiring');
      return;
    }

    if (formData.initiationStatus === 'initiated') {
      if (!formData.initiatedName || !formData.spiritualMasterName) {
        setError('Please fill in Initiated Name and Spiritual Master Name');
        return;
      }
    } else if (formData.initiationStatus === 'aspiring') {
      // Aspiring Spiritual Master Name is optional - no validation needed
    }

    if (!formData.chantingSince) {
      setError('Please select Chanting Since date');
      return;
    }

    if (!formData.ashram) {
      setError('Please select Ashram');
      return;
    }

    if (!formData.royalMember) {
      setError('Please select Royal Member status');
      return;
    }

    if (!formData.brahmachariCounselor) {
      setError('Please select Brahmachari Counselor');
      return;
    }

    setLoading(true);

    try {
      // Build hierarchy object with all fields
      const hierarchy: any = {};
      if (formData.state) hierarchy.state = formData.state;
      if (formData.city) hierarchy.city = formData.city;
      if (formData.center) hierarchy.center = formData.center;
      if (formData.centerId) hierarchy.centerId = formData.centerId; // Include centerId if available

      // Add spiritual fields to hierarchy
      if (formData.initiationStatus) hierarchy.initiationStatus = formData.initiationStatus;
      if (formData.initiatedName) hierarchy.initiatedName = formData.initiatedName;
      if (formData.spiritualMasterName) hierarchy.spiritualMasterName = formData.spiritualMasterName;
      if (formData.aspiringSpiritualMasterName) hierarchy.aspiringSpiritualMasterName = formData.aspiringSpiritualMasterName;
      if (formData.chantingSince) hierarchy.chantingSince = formData.chantingSince;
      if (formData.rounds) hierarchy.rounds = formData.rounds;
      if (formData.ashram) hierarchy.ashram = formData.ashram;
      if (formData.royalMember) hierarchy.royalMember = formData.royalMember;
      if (formData.brahmachariCounselor) hierarchy.brahmachariCounselor = formData.brahmachariCounselor;
      if (formData.brahmachariCounselorEmail) hierarchy.brahmachariCounselorEmail = formData.brahmachariCounselorEmail;
      if (formData.grihasthaCounselor) hierarchy.grihasthaCounselor = formData.grihasthaCounselor;
      if (formData.grihasthaCounselorEmail) hierarchy.grihasthaCounselorEmail = formData.grihasthaCounselorEmail;

      // Use ref value as fallback if state is empty (handles React state batching)
      // Recalculate to ensure we have the latest value - use ref first since it's synchronous
      const finalProfileImage = uploadedImageUrlRef.current?.trim() || profileImage?.trim() || userData?.profileImage || null;
      console.log('Complete Profile - handleSubmit - About to update with profile_image:', finalProfileImage);
      console.log('Complete Profile - handleSubmit - profileImage state:', profileImage);
      console.log('Complete Profile - handleSubmit - uploadedImageUrlRef.current:', uploadedImageUrlRef.current);
      console.log('Complete Profile - handleSubmit - finalProfileImageValue (from validation):', finalProfileImageValue);

      if (!finalProfileImage || !finalProfileImage.trim()) {
        console.error('Complete Profile - handleSubmit - Final profile image is still empty after all checks');
        console.error('Complete Profile - handleSubmit - All values checked: ref=', uploadedImageUrlRef.current, ', state=', profileImage, ', userData=', userData?.profileImage);
        throw new Error('Please upload your profile photo. It is required.');
      }

      console.log('Complete Profile - handleSubmit - Hierarchy before enrichment:', JSON.stringify(hierarchy, null, 2));

      // Update user with all fields - updateUser will enrich hierarchy with counselor emails and center_id
      await updateUser(user.id, {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        profileImage: finalProfileImage,
        hierarchy: hierarchy,
      });

      console.log('Complete Profile - handleSubmit - Profile updated successfully via updateUser');
      console.log('Complete Profile - handleSubmit - Refreshing user data...');

      // Refresh user data in AuthProvider to ensure accurate state before redirect
      await refreshUserData();

      console.log('Complete Profile - handleSubmit - User data refreshed, redirecting to dashboard...');
      // Redirect to dashboard after successful update
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto shadow-lg"></div>
          <p className="mt-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl sm:rounded-3xl shadow-2xl mb-4 sm:mb-5 md:mb-6 transform hover:scale-105 transition-all duration-300">
            <User className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-serif bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mb-3 sm:mb-4 px-2">
            Complete Your Profile
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-2xl mx-auto font-medium px-2">
            Help us get to know you better by filling in your information. This will help us personalize your experience.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl shadow-md flex items-start space-x-2 sm:space-x-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-red-600" />
            <p className="flex-1 font-semibold text-sm sm:text-base">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Basic Information Card */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border-2 border-blue-200 p-4 sm:p-5 md:p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-5 md:mb-6">
              <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl shadow-lg">
                <User className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Basic Information</h2>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-blue-300"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled
                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-blue-200 rounded-lg bg-blue-50 text-gray-700 cursor-not-allowed shadow-sm"
                  />
                </div>
                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-500 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>Email cannot be changed (from Google account)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Address Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border-2 border-green-200 p-4 sm:p-5 md:p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-5 md:mb-6">
              <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg sm:rounded-xl shadow-lg">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Address</h2>
            </div>

            <div className="mb-4 sm:mb-5">
              <label htmlFor="state" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <select
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '', center: '' })}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white transition-all appearance-none cursor-pointer shadow-sm hover:border-green-300"
              >
                <option value="">Select State</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="mb-4 sm:mb-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                <label htmlFor="city" className="block text-sm sm:text-base font-semibold text-gray-700">
                  City <span className="text-red-500">*</span>
                </label>
                {formData.state && !showAddCity && (
                  <button
                    type="button"
                    onClick={() => setShowAddCity(true)}
                    className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-md hover:bg-primary-50 transition-colors self-start sm:self-auto"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Add New City</span>
                  </button>
                )}
              </div>

              {!showAddCity ? (
                <>
                  <select
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value, center: '' })}
                    required
                    disabled={!formData.state || availableCities.length === 0}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed transition-all appearance-none"
                  >
                    <option value="">{formData.state ? 'Select City' : 'Select State first'}</option>
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  {formData.state && availableCities.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>No cities found for this state. Click "Add New City" to add one.</span>
                    </p>
                  )}
                </>
              ) : (
                <div className="border-2 border-green-200 rounded-xl p-5 bg-green-50 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-800">Add New City</h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowAddCity(false);
                        setNewCityName('');
                        setError('');
                      }}
                      className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                        City Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newCityName}
                        onChange={(e) => setNewCityName(e.target.value)}
                        required
                        placeholder="Enter city name"
                        className="w-full px-4 py-3 text-sm border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-green-300"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleAddCity}
                        disabled={addingCity || !newCityName.trim()}
                        className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                      >
                        {addingCity ? 'Adding...' : 'Add City'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowAddCity(false);
                          setNewCityName('');
                          setError('');
                        }}
                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="center" className="block text-sm sm:text-base font-semibold text-gray-700">
                  Center <span className="text-red-500">*</span>
                </label>
                {formData.city && !showAddCenter && (
                  <button
                    type="button"
                    onClick={() => setShowAddCenter(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-primary-50 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add New Center</span>
                  </button>
                )}
              </div>

              {!showAddCenter ? (
                <>
                  <select
                    id="center"
                    value={formData.center}
                    onChange={(e) => setFormData({ ...formData, center: e.target.value })}
                    disabled={!formData.city || loadingCenters}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed transition-all appearance-none"
                  >
                    <option value="">
                      {loadingCenters
                        ? 'Loading centers...'
                        : formData.city
                          ? availableCenters.length > 0
                            ? 'Select Center'
                            : 'No centers available'
                          : 'Select City first'}
                    </option>
                    {availableCenters.map(center => (
                      <option key={center.id} value={center.name}>{center.name}</option>
                    ))}
                  </select>
                  {formData.city && availableCenters.length === 0 && !loadingCenters && (
                    <p className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>No centers found for this city. Click "Add New Center" to add one.</span>
                    </p>
                  )}
                </>
              ) : (
                <div className="border-2 border-green-200 rounded-xl p-5 bg-green-50 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-800">Add New Center</h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowAddCenter(false);
                        setNewCenter({ name: '', address: '', contact: '' });
                        setError('');
                      }}
                      className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                        Center Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newCenter.name}
                        onChange={(e) => setNewCenter({ ...newCenter, name: e.target.value })}
                        required
                        placeholder="Enter center name"
                        className="w-full px-4 py-3 text-sm border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-green-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newCenter.address}
                        onChange={(e) => setNewCenter({ ...newCenter, address: e.target.value })}
                        required
                        placeholder="Enter center address"
                        className="w-full px-4 py-3 text-sm border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-green-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                        Contact <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={newCenter.contact}
                        onChange={(e) => setNewCenter({ ...newCenter, contact: e.target.value })}
                        placeholder="Enter contact number"
                        className="w-full px-4 py-3 text-sm border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-green-300"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleAddCenter}
                        disabled={addingCenter || !newCenter.name.trim()}
                        className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                      >
                        {addingCenter ? 'Adding...' : 'Add Center'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowAddCenter(false);
                          setNewCenter({ name: '', address: '', contact: '' });
                          setError('');
                        }}
                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>Center will be added for: <strong>{formData.city}</strong>, <strong>{formData.state}</strong></span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Profile Photo Upload Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border-2 border-indigo-200 p-4 sm:p-5 md:p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-5 md:mb-6">
              <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg sm:rounded-xl shadow-lg">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Profile Photo</h2>
              <span className="text-red-500 text-lg sm:text-xl font-bold">*</span>
            </div>
            <PhotoUpload
              onUploadComplete={async (url) => {
                console.log('Complete Profile - onUploadComplete called with URL:', url);
                console.log('Complete Profile - Current profileImage state before update:', profileImage);
                console.log('Complete Profile - Current uploadedImageUrlRef.current before update:', uploadedImageUrlRef.current);

                if (url && url.trim()) {
                  const trimmedUrl = url.trim();
                  // Check if this is a different URL than what we already have (prevents duplicate uploads)
                  if (uploadedImageUrlRef.current === trimmedUrl && profileImage === trimmedUrl) {
                    console.log('Complete Profile - URL already set, skipping duplicate update');
                    return;
                  }

                  // Store in both state and ref to ensure it's available when form is submitted
                  // Set ref first (synchronous) so it's available immediately
                  uploadedImageUrlRef.current = trimmedUrl;
                  console.log('Complete Profile - Set ref to:', uploadedImageUrlRef.current);

                  // Then update state (asynchronous)
                  setProfileImage(trimmedUrl);
                  console.log('Complete Profile - Set profileImage state to:', trimmedUrl);

                  // Auto-save to database immediately after upload (don't wait for form submission)
                  if (user && supabase && trimmedUrl) {
                    try {
                      console.log('Complete Profile - Auto-saving profile image to database immediately after upload...');
                      const { data: autoSaveResult, error: autoSaveError } = await supabase
                        .from('users')
                        .update({
                          profile_image: trimmedUrl,
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', user.id)
                        .select('id, profile_image');

                      if (autoSaveError) {
                        console.error('Complete Profile - Auto-save error:', autoSaveError);
                        // Don't show error to user - they can save it later when submitting the form
                        // But set error state so they know something went wrong
                        setError('Profile photo uploaded but could not be saved automatically. Please submit the form to save it.');
                      } else {
                        console.log('Complete Profile - Profile image auto-saved successfully!', autoSaveResult);
                        // Clear any previous errors related to photo upload
                        setError(prev => {
                          if (prev && prev.includes('profile photo')) {
                            console.log('Complete Profile - Clearing profile photo error');
                            return '';
                          }
                          return prev;
                        });
                      }
                    } catch (autoSaveErr: any) {
                      console.error('Complete Profile - Auto-save exception:', autoSaveErr);
                      // Don't block the user - they can save it when submitting the form
                    }
                  }

                  // Verify after a short delay
                  setTimeout(() => {
                    console.log('Complete Profile - Verified profileImage state after update:', profileImage);
                    console.log('Complete Profile - Verified ref after update:', uploadedImageUrlRef.current);
                  }, 100);
                } else {
                  console.error('Complete Profile - onUploadComplete called with empty URL!');
                  setError('Photo upload completed but no URL was returned. Please try again.');
                  uploadedImageUrlRef.current = '';
                  setProfileImage('');
                }
              }}
              onUploadError={(error) => {
                console.error('Complete Profile - PhotoUpload error:', error);
                setError(error);
                setProfileImage(''); // Clear profile image on error
                uploadedImageUrlRef.current = '';
              }}
              userName={formData.name || 'user'}
              disabled={loading}
              required={true}
              showMessage={true}
              state={formData.state}
              city={formData.city}
              center={formData.center}
              currentImageUrl={profileImage}
            />
          </div>

          {/* Spiritual Information Card */}
          <div className="relative z-30 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border-2 border-amber-200 p-4 sm:p-5 md:p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-5 md:mb-6">
              <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 rounded-lg sm:rounded-xl shadow-lg">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent">Spiritual Information</h2>
            </div>

            <div className="space-y-4 sm:space-y-5">

              {/* Initiated/Aspiring Field */}
              <div className="mb-5">
                <label htmlFor="initiationStatus" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Initiated/Aspiring <span className="text-red-500">*</span>
                </label>
                <select
                  id="initiationStatus"
                  value={formData.initiationStatus}
                  onChange={(e) => {
                    const newStatus = e.target.value as 'initiated' | 'aspiring' | '';
                    setFormData(prev => {
                      // Only clear fields if switching between initiated and aspiring
                      // Preserve existing values when switching back
                      if (newStatus === 'initiated' && prev.initiationStatus === 'aspiring') {
                        // Switching from aspiring to initiated - clear aspiring field only
                        return {
                          ...prev,
                          initiationStatus: newStatus,
                          aspiringSpiritualMasterName: ''
                        };
                      } else if (newStatus === 'aspiring' && prev.initiationStatus === 'initiated') {
                        // Switching from initiated to aspiring - clear initiated fields only
                        return {
                          ...prev,
                          initiationStatus: newStatus,
                          initiatedName: '',
                          spiritualMasterName: ''
                        };
                      } else {
                        // No change or switching from empty - just update status
                        return {
                          ...prev,
                          initiationStatus: newStatus
                        };
                      }
                    });
                  }}
                  required
                  className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white transition-all appearance-none cursor-pointer shadow-sm hover:border-green-300"
                >
                  <option value="">Select...</option>
                  <option value="initiated">Initiated</option>
                  <option value="aspiring">Aspiring</option>
                </select>
              </div>

              {/* Initiated Name - only shown if Initiated */}
              {formData.initiationStatus === 'initiated' && (
                <>
                  <div className="mb-5">
                    <label htmlFor="initiatedName" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Initiated Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="initiatedName"
                      type="text"
                      value={formData.initiatedName}
                      onChange={(e) => setFormData({ ...formData, initiatedName: e.target.value })}
                      required
                      placeholder="Enter your initiated name"
                      className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-amber-300"
                    />
                  </div>
                  <div className="mb-5">
                    <label htmlFor="spiritualMasterName" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Spiritual Master Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="spiritualMasterName"
                      type="text"
                      value={formData.spiritualMasterName}
                      onChange={(e) => setFormData({ ...formData, spiritualMasterName: e.target.value })}
                      required
                      placeholder="Enter your spiritual master name"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-amber-300"
                    />
                  </div>
                </>
              )}

              {/* Aspiring Spiritual Master Name - only shown if Aspiring */}
              {formData.initiationStatus === 'aspiring' && (
                <div className="mb-5">
                  <label htmlFor="aspiringSpiritualMasterName" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Aspiring Spiritual Master Name
                  </label>
                  <input
                    id="aspiringSpiritualMasterName"
                    type="text"
                    value={formData.aspiringSpiritualMasterName}
                    onChange={(e) => setFormData({ ...formData, aspiringSpiritualMasterName: e.target.value })}
                    placeholder="Enter aspiring spiritual master name (optional)"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-amber-300"
                  />
                </div>
              )}

              {/* Chanting Since and Rounds */}
              <div className="mb-5">
                <label htmlFor="chantingSince" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Chanting Since <span className="text-red-500">*</span>
                </label>
                <input
                  id="chantingSince"
                  type="date"
                  value={formData.chantingSince}
                  onChange={(e) => setFormData({ ...formData, chantingSince: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white transition-all"
                />
                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-500 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>Future dates are not allowed</span>
                </p>
              </div>

              <div className="mb-4 sm:mb-5">
                <label htmlFor="rounds" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  How many Rounds
                </label>
                <input
                  id="rounds"
                  type="number"
                  value={formData.rounds}
                  onChange={(e) => setFormData({ ...formData, rounds: e.target.value })}
                  placeholder="Enter number of rounds"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-amber-300"
                />
              </div>

              {/* Ashram */}
              <div className="mb-5">
                <label htmlFor="ashram" className="block text-sm font-semibold text-gray-700 mb-2">
                  Ashram <span className="text-red-500">*</span>
                </label>
                <select
                  id="ashram"
                  value={formData.ashram}
                  onChange={(e) => setFormData({ ...formData, ashram: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white transition-all appearance-none cursor-pointer shadow-sm hover:border-green-300"
                >
                  <option value="">Select Ashram</option>
                  <option value="Gauranga Sabha">Gauranga Sabha</option>
                  <option value="Nityananda Sabha">Nityananda Sabha</option>
                  <option value="Grihastha Ashram">Grihastha Ashram</option>
                  <option value="Brahmachari Ashram">Brahmachari Ashram</option>
                  <option value="Not Decided">Not Decided</option>
                </select>
              </div>

              {/* Royal Member */}
              <div className="mb-5">
                <label htmlFor="royalMember" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-primary-600" />
                  <span>Royal Member <span className="text-red-500">*</span></span>
                </label>
                <select
                  id="royalMember"
                  value={formData.royalMember}
                  onChange={(e) => setFormData({ ...formData, royalMember: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white transition-all appearance-none cursor-pointer shadow-sm hover:border-green-300"
                >
                  <option value="">Select...</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              {/* Brahmachari Counselor */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="brahmachariCounselor" className="block text-sm font-semibold text-gray-700">
                    Brahmachari Counselor <span className="text-red-500">*</span>
                  </label>
                  {!showAddBrahmachariCounselor && (
                    <button
                      type="button"
                      onClick={() => setShowAddBrahmachariCounselor(true)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-primary-50 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Counselor</span>
                    </button>
                  )}
                </div>

                {!showAddBrahmachariCounselor ? (
                  <>
                    <div className="relative">
                      <input
                        type="text"
                        id="brahmachariCounselor"
                        value={brahmachariCounselorSearch}
                        onChange={(e) => {
                          setBrahmachariCounselorSearch(e.target.value);
                          if (!e.target.value) {
                            setFormData(prev => ({ ...prev, brahmachariCounselor: '' }));
                          }
                        }}
                        onFocus={() => {
                          if (!brahmachariCounselorSearch && !formData.brahmachariCounselor) {
                            getCounselorsFromLocal('', 'Brahmachari Ashram').then(counselors => {
                              setAvailableBrahmachariCounselors(counselors);
                            });
                          }
                        }}
                        placeholder={formData.brahmachariCounselor ? formData.brahmachariCounselor : "Search Brahmachari counselor by name..."}
                        required
                        className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-amber-300"
                      />
                      {brahmachariCounselorSearch && !formData.brahmachariCounselor && (
                        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
                          {loadingBrahmachariCounselors ? (
                            <div className="p-3 text-sm text-gray-500">Loading...</div>
                          ) : availableBrahmachariCounselors.length > 0 ? (
                            availableBrahmachariCounselors.map(counselor => (
                              <button
                                key={counselor.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, brahmachariCounselor: counselor.name }));
                                  setBrahmachariCounselorSearch(counselor.name);
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
                    {formData.brahmachariCounselor && (
                      <p className="mt-1 text-xs text-gray-600">
                        Selected: <strong>{formData.brahmachariCounselor}</strong>
                      </p>
                    )}
                  </>
                ) : (
                  <div className="border-2 border-teal-300 rounded-xl p-5 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-teal-700">Add New Brahmachari Counselor</h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowAddBrahmachariCounselor(false);
                          setNewBrahmachariCounselor({ name: '', mobile: '', email: '', city: '' });
                          setCounselorFieldErrors({ name: '', mobile: '', email: '', city: '' });
                          setError('');
                        }}
                        className="text-gray-500 hover:text-teal-600 p-1 rounded-md hover:bg-teal-50 transition-colors"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Counselor Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newBrahmachariCounselor.name}
                          onChange={(e) => {
                            setNewBrahmachariCounselor({ ...newBrahmachariCounselor, name: e.target.value });
                            if (counselorFieldErrors.name) {
                              setCounselorFieldErrors(prev => ({ ...prev, name: '' }));
                            }
                          }}
                          required
                          placeholder="Enter counselor name"
                          className={`w-full px-4 py-3 text-sm border-2 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm ${counselorFieldErrors.name ? 'border-red-400 bg-red-50' : 'border-teal-200 hover:border-teal-300'
                            }`}
                        />
                        {counselorFieldErrors.name && (
                          <p className="mt-2 text-xs text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{counselorFieldErrors.name}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="tel"
                            value={newBrahmachariCounselor.mobile}
                            onChange={(e) => {
                              setNewBrahmachariCounselor({ ...newBrahmachariCounselor, mobile: e.target.value });
                              if (counselorFieldErrors.mobile) {
                                setCounselorFieldErrors(prev => ({ ...prev, mobile: '' }));
                              }
                            }}
                            required
                            placeholder="Enter mobile number (e.g., +91 9876543210)"
                            className={`w-full pl-10 pr-4 py-3 text-sm border-2 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm ${counselorFieldErrors.mobile ? 'border-red-400 bg-red-50' : 'border-teal-200 hover:border-teal-300'
                              }`}
                          />
                        </div>
                        {counselorFieldErrors.mobile && (
                          <p className="mt-2 text-xs text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{counselorFieldErrors.mobile}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Email ID <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            value={newBrahmachariCounselor.email}
                            onChange={(e) => {
                              setNewBrahmachariCounselor({ ...newBrahmachariCounselor, email: e.target.value });
                              if (counselorFieldErrors.email) {
                                setCounselorFieldErrors(prev => ({ ...prev, email: '' }));
                              }
                            }}
                            required
                            placeholder="Enter email address (e.g., name@example.com)"
                            className={`w-full pl-10 pr-4 py-3 text-sm border-2 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm ${counselorFieldErrors.email ? 'border-red-400 bg-red-50' : 'border-teal-200 hover:border-teal-300'
                              }`}
                          />
                        </div>
                        {counselorFieldErrors.email && (
                          <p className="mt-2 text-xs text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{counselorFieldErrors.email}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Temple Connected To <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newBrahmachariCounselor.city}
                          onChange={(e) => {
                            setNewBrahmachariCounselor({ ...newBrahmachariCounselor, city: e.target.value });
                            if (counselorFieldErrors.city) {
                              setCounselorFieldErrors(prev => ({ ...prev, city: '' }));
                            }
                          }}
                          required
                          placeholder="Enter temple name (e.g., ISKCON Mumbai)"
                          className={`w-full px-4 py-3 text-sm border-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 ${counselorFieldErrors.city ? 'border-red-400 bg-red-50' : 'border-gray-200'
                            }`}
                        />
                        {counselorFieldErrors.city && (
                          <p className="mt-2 text-xs text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{counselorFieldErrors.city}</span>
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-teal-600 flex items-center space-x-1 font-medium">
                        <BookOpen className="w-3 h-3" />
                        <span>Note: Ashram will be automatically set to "Brahmachari Ashram"</span>
                      </p>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={handleAddBrahmachariCounselor}
                          disabled={addingBrahmachariCounselor || !newBrahmachariCounselor.name.trim() || !newBrahmachariCounselor.mobile.trim() || !newBrahmachariCounselor.email.trim() || !newBrahmachariCounselor.city.trim()}
                          className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                          {addingBrahmachariCounselor ? 'Adding...' : 'Add Counselor'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowAddBrahmachariCounselor(false);
                            setNewBrahmachariCounselor({ name: '', mobile: '', email: '', city: '' });
                            setError('');
                          }}
                          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Grihastha Counselor (Optional) */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="grihasthaCounselor" className="block text-sm font-semibold text-gray-700">
                    Grihastha Counselor <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                  </label>
                  {!showAddGrihasthaCounselor && (
                    <button
                      type="button"
                      onClick={() => setShowAddGrihasthaCounselor(true)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-primary-50 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Counselor</span>
                    </button>
                  )}
                </div>

                {!showAddGrihasthaCounselor ? (
                  <>
                    <div className="relative">
                      <input
                        type="text"
                        id="grihasthaCounselor"
                        value={grihasthaCounselorSearch}
                        onChange={(e) => {
                          setGrihasthaCounselorSearch(e.target.value);
                          if (!e.target.value) {
                            setFormData(prev => ({ ...prev, grihasthaCounselor: '' }));
                          }
                        }}
                        onFocus={() => {
                          if (!grihasthaCounselorSearch && !formData.grihasthaCounselor) {
                            getCounselorsFromLocal('', 'Grihastha Ashram').then(counselors => {
                              setAvailableGrihasthaCounselors(counselors);
                            });
                          }
                        }}
                        placeholder={formData.grihasthaCounselor ? formData.grihasthaCounselor : "Search Grihastha counselor by name..."}
                        className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-amber-300"
                      />
                      {grihasthaCounselorSearch && !formData.grihasthaCounselor && (
                        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
                          {loadingGrihasthaCounselors ? (
                            <div className="p-3 text-sm text-gray-500">Loading...</div>
                          ) : availableGrihasthaCounselors.length > 0 ? (
                            availableGrihasthaCounselors.map(counselor => (
                              <button
                                key={counselor.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    grihasthaCounselor: counselor.name,
                                    grihasthaCounselorEmail: counselor.email
                                  }));
                                  setGrihasthaCounselorSearch(counselor.name);
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
                    {formData.grihasthaCounselor && (
                      <p className="mt-1 text-xs text-gray-600">
                        Selected: <strong>{formData.grihasthaCounselor}</strong>
                      </p>
                    )}
                  </>
                ) : (
                  <div className="border-2 border-teal-300 rounded-xl p-5 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-teal-700">Add New Grihastha Counselor</h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowAddGrihasthaCounselor(false);
                          setNewGrihasthaCounselor({ name: '', mobile: '', email: '', city: '' });
                          setCounselorFieldErrors({ name: '', mobile: '', email: '', city: '' });
                          setError('');
                        }}
                        className="text-gray-500 hover:text-teal-600 p-1 rounded-md hover:bg-teal-50 transition-colors"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Counselor Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newGrihasthaCounselor.name}
                          onChange={(e) => {
                            setNewGrihasthaCounselor({ ...newGrihasthaCounselor, name: e.target.value });
                            if (counselorFieldErrors.name) {
                              setCounselorFieldErrors(prev => ({ ...prev, name: '' }));
                            }
                          }}
                          required
                          placeholder="Enter counselor name"
                          className={`w-full px-4 py-3 text-sm border-2 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm ${counselorFieldErrors.name ? 'border-red-400 bg-red-50' : 'border-teal-200 hover:border-teal-300'
                            }`}
                        />
                        {counselorFieldErrors.name && (
                          <p className="mt-2 text-xs text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{counselorFieldErrors.name}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="tel"
                            value={newGrihasthaCounselor.mobile}
                            onChange={(e) => {
                              setNewGrihasthaCounselor({ ...newGrihasthaCounselor, mobile: e.target.value });
                              if (counselorFieldErrors.mobile) {
                                setCounselorFieldErrors(prev => ({ ...prev, mobile: '' }));
                              }
                            }}
                            required
                            placeholder="Enter mobile number (e.g., +91 9876543210)"
                            className={`w-full pl-10 pr-4 py-3 text-sm border-2 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm ${counselorFieldErrors.mobile ? 'border-red-400 bg-red-50' : 'border-teal-200 hover:border-teal-300'
                              }`}
                          />
                        </div>
                        {counselorFieldErrors.mobile && (
                          <p className="mt-2 text-xs text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{counselorFieldErrors.mobile}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Email ID <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            value={newGrihasthaCounselor.email}
                            onChange={(e) => {
                              setNewGrihasthaCounselor({ ...newGrihasthaCounselor, email: e.target.value });
                              if (counselorFieldErrors.email) {
                                setCounselorFieldErrors(prev => ({ ...prev, email: '' }));
                              }
                            }}
                            required
                            placeholder="Enter email address (e.g., name@example.com)"
                            className={`w-full pl-10 pr-4 py-3 text-sm border-2 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm ${counselorFieldErrors.email ? 'border-red-400 bg-red-50' : 'border-teal-200 hover:border-teal-300'
                              }`}
                          />
                        </div>
                        {counselorFieldErrors.email && (
                          <p className="mt-2 text-xs text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{counselorFieldErrors.email}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Temple Connected To <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newGrihasthaCounselor.city}
                          onChange={(e) => {
                            setNewGrihasthaCounselor({ ...newGrihasthaCounselor, city: e.target.value });
                            if (counselorFieldErrors.city) {
                              setCounselorFieldErrors(prev => ({ ...prev, city: '' }));
                            }
                          }}
                          required
                          placeholder="Enter temple name (e.g., ISKCON Mumbai)"
                          className={`w-full px-4 py-3 text-sm border-2 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 ${counselorFieldErrors.city ? 'border-red-400 bg-red-50' : 'border-gray-200'
                            }`}
                        />
                        {counselorFieldErrors.city && (
                          <p className="mt-2 text-xs text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{counselorFieldErrors.city}</span>
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-teal-600 flex items-center space-x-1 font-medium">
                        <BookOpen className="w-3 h-3" />
                        <span>Note: Ashram will be automatically set to "Grihastha Ashram"</span>
                      </p>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={handleAddGrihasthaCounselor}
                          disabled={addingGrihasthaCounselor || !newGrihasthaCounselor.name.trim() || !newGrihasthaCounselor.mobile.trim() || !newGrihasthaCounselor.email.trim() || !newGrihasthaCounselor.city.trim()}
                          className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                          {addingGrihasthaCounselor ? 'Adding...' : 'Add Counselor'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowAddGrihasthaCounselor(false);
                            setNewGrihasthaCounselor({ name: '', mobile: '', email: '', city: '' });
                            setError('');
                          }}
                          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Submit Button */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border-2 border-gray-200 p-4 sm:p-5 md:p-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg md:text-xl hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 sm:space-x-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>Completing Profile...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Complete Profile</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-4 sm:mt-6 text-center">
          <button
            type="button"
            onClick={async () => {
              if (supabase) {
                await supabase.auth.signOut();
              }
              router.push('/auth/login');
            }}
            className="text-gray-500 hover:text-gray-700 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center space-x-1 sm:space-x-2 mx-auto hover:underline"
          >
            <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Logout / Go back to Login</span>
          </button>
        </div>
      </div>
    </div>
  );
}
