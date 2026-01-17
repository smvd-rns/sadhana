'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/lib/supabase/auth';
import { UserRole } from '@/types';
// Remove indianStates import
import { getCentersByLocationFromLocal, addCenterToLocal } from '@/lib/data/local-centers';
import { getCitiesByStateFromLocal, addCityToLocal } from '@/lib/data/local-cities';
import { getCounselorsFromLocal, addCounselorToLocal } from '@/lib/data/local-counselors';
import {
  Plus, X, User, Mail, Lock, Phone, MapPin, Building2,
  BookOpen, GraduationCap, Calendar, AlertCircle, Check, Loader2, Heart, Sparkles,
  Shield, Upload, UserPlus
} from 'lucide-react';
import { validateEmail, validatePassword, isValidName, validateCounselorInput, validateMobile } from '@/lib/utils/validation';
import PhotoUpload from '@/components/ui/PhotoUpload';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    state: '',
    city: '',
    center: '',
    centerId: '', // Store center ID along with center name
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

  const router = useRouter();

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

  // Update cities when state changes - use local JSON file (which wraps API)
  useEffect(() => {
    const loadCities = async () => {
      if (formData.state) {
        // Get cities from API via wrapper
        const localCities = await getCitiesByStateFromLocal(formData.state);

        // Remove dependency on static file
        const allCities = [...new Set(localCities)].sort();

        setAvailableCities(allCities);
        // Reset city and center when state changes
        setFormData(prev => ({ ...prev, city: '', center: '' }));
        setAvailableCenters([]);
      } else {
        setAvailableCities([]);
        setAvailableCenters([]);
      }
    };
    loadCities();
  }, [formData.state]);

  // Load centers when state and city change - use local JSON file
  useEffect(() => {
    const loadCenters = async () => {
      if (formData.state && formData.city) {
        setLoadingCenters(true);
        try {
          // Get centers from local JSON file (no Firestore reads!)
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
      // Reset center when city changes
      if (formData.city) {
        setFormData(prev => ({ ...prev, center: '', centerId: '' }));
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

    // Debounce search
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

    // Debounce search
    const timeoutId = setTimeout(() => {
      loadCounselors();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [grihasthaCounselorSearch]);

  const handleAddCity = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling to parent form
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
      // Add city to local JSON file (only admins can do this, but we'll allow it here for now)
      // In production, this should be restricted to admin pages only
      const success = await addCityToLocal(formData.state, newCityName.trim());

      if (success) {
        // Reload cities to get the updated list
        const localCities = await getCitiesByStateFromLocal(formData.state);
        const allCities = [...new Set(localCities)].sort();
        setAvailableCities(allCities);

        // Select the newly added city
        setFormData(prev => ({ ...prev, city: newCityName.trim() }));

        // Reset form and hide add city form
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
      e.stopPropagation(); // Prevent event bubbling to parent form
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
      // Add center to local JSON file (only admins should do this, but we'll allow it here for now)
      const success = await addCenterToLocal({
        name: newCenter.name.trim(),
        state: formData.state,
        city: formData.city,
        address: newCenter.address.trim(),
        contact: newCenter.contact.trim() || undefined,
      });

      if (success) {
        // Reload centers to get the updated list
        const updatedCenters = await getCentersByLocationFromLocal(formData.state, formData.city);
        setAvailableCenters(updatedCenters.map(c => ({ id: c.id, name: c.name })));

        // Select the newly added center - find it to get its ID
        const newCenterData = updatedCenters.find(c => c.name === newCenter.name.trim());
        setFormData(prev => ({
          ...prev,
          center: newCenter.name.trim(),
          centerId: newCenterData?.id || ''
        }));

        // Reset form and hide add center form
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
          setFormData(prev => ({
            ...prev,
            brahmachariCounselor: addedCounselor.name,
            brahmachariCounselorEmail: addedCounselor.email
          }));
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
          setFormData(prev => ({ ...prev, grihasthaCounselor: addedCounselor.name }));
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

    // Validate Password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Invalid password');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate required fields
    if (!profileImage || !profileImage.trim()) {
      setError('Please upload your profile photo. It is required for registration.');
      return;
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
      // Build hierarchy object, only including fields with actual values
      const hierarchy: any = {};
      if (formData.state) hierarchy.state = formData.state;
      if (formData.city) hierarchy.city = formData.city;
      if (formData.center) hierarchy.center = formData.center;
      if (formData.centerId) hierarchy.centerId = formData.centerId; // Store center ID

      // Add spiritual fields to hierarchy
      if (formData.initiationStatus) hierarchy.initiationStatus = formData.initiationStatus;
      if (formData.initiatedName) hierarchy.initiatedName = formData.initiatedName;
      if (formData.spiritualMasterName) hierarchy.spiritualMasterName = formData.spiritualMasterName;
      if (formData.aspiringSpiritualMasterName) hierarchy.aspiringSpiritualMasterName = formData.aspiringSpiritualMasterName;
      if (formData.chantingSince) hierarchy.chantingSince = formData.chantingSince;
      if (formData.rounds) hierarchy.rounds = formData.rounds;
      if (formData.ashram) hierarchy.ashram = formData.ashram;
      if (formData.royalMember) hierarchy.royalMember = formData.royalMember;
      if (formData.brahmachariCounselor) {
        hierarchy.brahmachariCounselor = formData.brahmachariCounselor;
        hierarchy.brahmachariCounselorEmail = formData.brahmachariCounselorEmail;
      }
      if (formData.grihasthaCounselor) {
        hierarchy.grihasthaCounselor = formData.grihasthaCounselor;
        hierarchy.grihasthaCounselorEmail = formData.grihasthaCounselorEmail;
      }

      const user = await signUp(
        formData.email,
        formData.password,
        formData.name,
        'student', // All new users default to student role
        hierarchy,
        profileImage || undefined
      );

      // Check if email confirmation is required
      // Supabase may require email confirmation depending on settings
      if (user && !user.email_confirmed_at) {
        setError('Registration successful! Please check your email to confirm your account before signing in.');
        // Don't redirect, let user know to check email
        return;
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 md:py-8 lg:py-10 xl:py-12">
      <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl sm:rounded-3xl shadow-2xl mb-4 sm:mb-5 md:mb-6 lg:mb-8 transform hover:scale-105 transition-all duration-300">
            <UserPlus className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold font-serif bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mb-5 sm:mb-6 md:mb-7 lg:mb-8 xl:mb-9 px-2 leading-normal pb-2 sm:pb-3 md:pb-4 lg:pb-5">
            Register
          </h1>
          <div className="max-w-2xl mx-auto px-2 pt-1 sm:pt-2 relative">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent via-cyan-400 to-cyan-500"></div>
              <p className="text-sm sm:text-base md:text-lg font-serif italic font-medium text-cyan-700 leading-relaxed text-center">
                Join our spiritual family and begin your sacred journey
              </p>
              <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent via-cyan-400 to-cyan-500"></div>
            </div>
            <p className="text-xs sm:text-sm md:text-base font-serif italic font-normal text-teal-600 leading-relaxed text-center opacity-90">
              Share your details to connect with devotees and deepen your practice
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl shadow-md flex items-start space-x-2 sm:space-x-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-red-600" />
            <p className="flex-1 font-semibold text-sm sm:text-base break-words">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-7 xl:space-y-8">
          {/* Basic Information Card */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border-2 border-blue-200 p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 mb-4 sm:mb-5 md:mb-6 lg:mb-7">
              <div className="p-2 sm:p-2.5 md:p-3 lg:p-3.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl shadow-lg">
                <User className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-serif bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Basic Information</h2>
            </div>

            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-blue-300"
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
                    className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-blue-300"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-blue-300"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-blue-300"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border-2 border-green-200 p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 mb-4 sm:mb-5 md:mb-6 lg:mb-7">
              <div className="p-2 sm:p-2.5 md:p-3 lg:p-3.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg sm:rounded-xl shadow-lg">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-serif bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Address</h2>
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
                    value={formData.centerId}
                    onChange={(e) => {
                      const selectedCenter = availableCenters.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        center: selectedCenter?.name || '',
                        centerId: e.target.value
                      });
                    }}
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
                      <option key={center.id} value={center.id}>{center.name}</option>
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
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border-2 border-indigo-200 p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 mb-4 sm:mb-5 md:mb-6 lg:mb-7">
              <div className="p-2 sm:p-2.5 md:p-3 lg:p-3.5 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg sm:rounded-xl shadow-lg">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-serif bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Profile Photo</h2>
              <span className="text-red-500 text-lg sm:text-xl lg:text-2xl font-bold">*</span>
            </div>
            <PhotoUpload
              onUploadComplete={(url) => {
                console.log('Register - onUploadComplete called with URL:', url);
                if (url && url.trim()) {
                  setProfileImage(url.trim());
                  console.log('Register - Set profileImage to:', url.trim());
                  // Clear any photo-related errors when upload succeeds
                  setError(prev => {
                    if (prev && prev.includes('profile photo')) {
                      return '';
                    }
                    return prev;
                  });
                } else {
                  console.error('Register - onUploadComplete called with empty URL!');
                  setError('Photo upload completed but no URL was returned. Please try again.');
                }
              }}
              onUploadError={(error) => {
                console.error('Register - PhotoUpload error:', error);
                setError(error);
                setProfileImage('');
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
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border-2 border-amber-200 p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 mb-4 sm:mb-5 md:mb-6 lg:mb-7">
              <div className="p-2 sm:p-2.5 md:p-3 lg:p-3.5 bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 rounded-lg sm:rounded-xl shadow-lg">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-serif bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent">Spiritual Information</h2>
            </div>

            <div className="space-y-4 sm:space-y-5 lg:space-y-6">

              {/* Initiated/Aspiring Field */}
              <div className="mb-5">
                <label htmlFor="initiationStatus" className="block text-sm sm:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Initiated/Aspiring <span className="text-red-500">*</span>
                </label>
                <select
                  id="initiationStatus"
                  value={formData.initiationStatus}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      initiationStatus: e.target.value,
                      initiatedName: '',
                      spiritualMasterName: '',
                      aspiringSpiritualMasterName: ''
                    }));
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
                                  setFormData(prev => ({
                                    ...prev,
                                    brahmachariCounselor: counselor.name,
                                    brahmachariCounselorEmail: counselor.email
                                  }));
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
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border-2 border-gray-200 p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 sm:py-4 md:py-5 rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg md:text-xl lg:text-2xl hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 sm:space-x-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Register</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-xs sm:text-sm md:text-base text-gray-600 px-2">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
