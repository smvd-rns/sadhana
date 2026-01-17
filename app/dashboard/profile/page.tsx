'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/config';
import { getCitiesByStateFromLocal, addCityToLocal } from '@/lib/data/local-cities';
import { getCentersByLocationFromLocal, addCenterToLocal } from '@/lib/data/local-centers';
import { getCounselorsFromLocal, addCounselorToLocal } from '@/lib/data/local-counselors';
import { Plus, X, Save, User, Mail, Phone, MapPin, Building2, Users, BookOpen, GraduationCap, Briefcase, Calendar, Check, AlertTriangle } from 'lucide-react';
import { validateEmail, isValidName, validateMobile, validateTextInput, validatePhone, sanitizeTextInput, sanitizeInput, validateEducationField, validateWorkField } from '@/lib/utils/validation';
import PhotoUpload from '@/components/ui/PhotoUpload';
import { getSmallThumbnailUrl } from '@/lib/utils/google-drive';
import { EducationEntry, WorkExperienceEntry, LanguageEntry, SkillEntry, ServiceEntry } from '@/types';

export default function ProfilePage() {
  const { user, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Track if form has unsaved changes
  const [isDirty, setIsDirty] = useState(false);
  const isInitializedRef = useRef(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    state: '',
    city: '',
    center: '',
    centerId: '', // Store center ID along with center name
    // Spiritual fields
    initiationStatus: '' as 'initiated' | 'aspiring' | '',
    initiatedName: '',
    spiritualMasterName: '',
    aspiringSpiritualMasterName: '',
    chantingSince: '',
    rounds: '',
    ashram: '',
    royalMember: '' as 'yes' | 'no' | '',
    brahmachariCounselor: '',
    brahmachariCounselorEmail: '',
    grihasthaCounselor: '',
    grihasthaCounselorEmail: '',
    // Camp completion fields
    campDys: false,
    campSankalpa: false,
    campSphurti: false,
    campUtkarsh: false,
    campFaithAndDoubt: false,
    campSrcgdWorkshop: false,
    campNistha: false,
    campAshray: false,
    // SP Books Study Course fields (Third Semester)
    spbookThirdSsr15: false,
    spbookThirdComingBack: false,
    spbookThirdPqpa: false,
    spbookThirdMatchlessGift: false,
    spbookThirdRajaVidya: false,
    spbookThirdElevationKc: false,
    spbookThirdBeyondBirthDeath: false,
    spbookThirdKrishnaReservoir: false,
    // SP Books Study Course fields (Fourth Semester)
    spbookFourthSsr68: false,
    spbookFourthLawsOfNature: false,
    spbookFourthDharma: false,
    spbookFourthSecondChance: false,
    spbookFourthIsopanishad110: false,
    spbookFourthQueenKuntiVideo: false,
    spbookFourthEnlightenmentNatural: false,
    spbookFourthKrishnaBook121: false,
    // SP Books Study Course fields (Fifth Semester)
    spbookFifthLifeFromLife: false,
    spbookFifthPrahladTeachings: false,
    spbookFifthJourneySelfDiscovery: false,
    spbookFifthQueenKuntiHearing: false,
    spbookFifthLordKapila: false,
    spbookFifthNectar16: false,
    spbookFifthGita16: false,
    spbookFifthKrishnaBook2428: false,
    // SP Books Study Course fields (Sixth Semester)
    spbookSixthNectar711: false,
    spbookSixthPathPerfection: false,
    spbookSixthCivilisationTranscendence: false,
    spbookSixthHareKrishnaChallenge: false,
    spbookSixthGita712: false,
    spbookSixthSb1stCanto16: false,
    spbookSixthKrishnaBook3559: false,
    // SP Books Study Course fields (Seventh Semester)
    spbookSeventhGita1318: false,
    spbookSeventhSb1stCanto713: false,
    spbookSeventhKrishnaBook6378: false,
    // SP Books Study Course fields (Eighth Semester)
    spbookEighthSb1stCanto1419: false,
    spbookEighthKrishnaBook7889: false,
  });

  // Education and Work Experience arrays
  const [education, setEducation] = useState<EducationEntry[]>([
    { institution: '', field: '', year: null }
  ]);
  const [workExperience, setWorkExperience] = useState<WorkExperienceEntry[]>([
    { company: '', position: '', startDate: null, endDate: null, current: false }
  ]);
  // Language, Skills, and Services arrays
  const [languages, setLanguages] = useState<LanguageEntry[]>([
    { name: '' }
  ]);
  const [skills, setSkills] = useState<SkillEntry[]>([
    { name: '' }
  ]);
  const [services, setServices] = useState<ServiceEntry[]>([
    { name: '' }
  ]);

  // Available options
  const [states] = useState<string[]>([
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableCenters, setAvailableCenters] = useState<Array<{ id: string; name: string }>>([]);

  // Brahmachari Counselor state
  const [availableBrahmachariCounselors, setAvailableBrahmachariCounselors] = useState<Array<{ id: string; name: string; email: string; mobile: string; city: string; ashram?: string }>>([]);
  const [brahmachariCounselorSearch, setBrahmachariCounselorSearch] = useState('');
  const [loadingBrahmachariCounselors, setLoadingBrahmachariCounselors] = useState(false);

  // Grihastha Counselor state
  const [availableGrihasthaCounselors, setAvailableGrihasthaCounselors] = useState<Array<{ id: string; name: string; email: string; mobile: string; city: string; ashram?: string }>>([]);
  const [grihasthaCounselorSearch, setGrihasthaCounselorSearch] = useState('');
  const [loadingGrihasthaCounselors, setLoadingGrihasthaCounselors] = useState(false);

  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  // Add New City State
  const [showAddCity, setShowAddCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [addingCity, setAddingCity] = useState(false);

  // Add New Center State
  const [showAddCenter, setShowAddCenter] = useState(false);
  const [newCenter, setNewCenter] = useState({
    name: '',
    address: '',
    contact: '',
  });
  const [addingCenter, setAddingCenter] = useState(false);

  // Add New Brahmachari Counselor State
  const [showAddBrahmachariCounselor, setShowAddBrahmachariCounselor] = useState(false);
  const [newBrahmachariCounselor, setNewBrahmachariCounselor] = useState({
    name: '',
    mobile: '',
    email: '',
    city: '',
  });
  const [addingBrahmachariCounselor, setAddingBrahmachariCounselor] = useState(false);

  // Add New Grihastha Counselor State
  const [showAddGrihasthaCounselor, setShowAddGrihasthaCounselor] = useState(false);
  const [newGrihasthaCounselor, setNewGrihasthaCounselor] = useState({
    name: '',
    mobile: '',
    email: '',
    city: '',
  });
  const [addingGrihasthaCounselor, setAddingGrihasthaCounselor] = useState(false);

  // Shared counselor field errors for new forms
  const [counselorFieldErrors, setCounselorFieldErrors] = useState({
    name: '',
    mobile: '',
    email: '',
    city: '',
  });

  const [mounted, setMounted] = useState(false);

  // Animation observer for scroll-triggered animations
  useEffect(() => {
    setMounted(true);
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // Set initialized to true after a delay to allow initial data population
    // This prevents isDirty from becoming true on initial load
    setTimeout(() => {
      isInitializedRef.current = true;
    }, 1500);

    setTimeout(() => {
      const animatedElements = document.querySelectorAll('.animate-on-scroll');
      animatedElements.forEach((el) => observer.observe(el));
    }, 100);

    return () => observer.disconnect();
  }, []);

  // Auto-dismiss success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Refs for counselor inputs to calculate dropdown position
  const brahmachariCounselorInputRef = useRef<HTMLInputElement>(null);
  const grihasthaCounselorInputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [showCounselorDropdown, setShowCounselorDropdown] = useState(false);
  const [currentCounselorType, setCurrentCounselorType] = useState<'brahmachari' | 'grihastha' | null>(null);

  // Update dropdown position on scroll/resize when dropdown is visible
  useEffect(() => {
    const activeRef = currentCounselorType === 'brahmachari' ? brahmachariCounselorInputRef.current :
      currentCounselorType === 'grihastha' ? grihasthaCounselorInputRef.current : null;

    if (!showCounselorDropdown || !activeRef) return;

    const updatePosition = () => {
      if (activeRef) {
        const rect = activeRef.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showCounselorDropdown, currentCounselorType, brahmachariCounselorSearch, grihasthaCounselorSearch]);

  // Detect unsaved changes
  useEffect(() => {
    if (isInitializedRef.current) {
      setIsDirty(true);
    }
  }, [formData, education, workExperience, languages, skills, services]);

  // Load initial data
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        birthDate: userData.birthDate || '',
        state: userData.hierarchy?.state || '',
        city: userData.hierarchy?.city || '',
        center: userData.hierarchy?.center || '',
        centerId: userData.hierarchy?.centerId || '', // Load centerId from database if available
        // Spiritual fields
        initiationStatus: (userData.hierarchy?.initiationStatus || '') as 'initiated' | 'aspiring' | '',
        initiatedName: userData.hierarchy?.initiatedName || '',
        spiritualMasterName: userData.hierarchy?.spiritualMasterName || '',
        aspiringSpiritualMasterName: userData.hierarchy?.aspiringSpiritualMasterName || '',
        chantingSince: userData.hierarchy?.chantingSince || '',
        rounds: userData.hierarchy?.rounds?.toString() || '',
        ashram: userData.hierarchy?.ashram || '',
        royalMember: (userData.hierarchy?.royalMember || '') as 'yes' | 'no' | '',
        brahmachariCounselor: userData.hierarchy?.brahmachariCounselor || '',
        brahmachariCounselorEmail: userData.hierarchy?.brahmachariCounselorEmail || '',
        grihasthaCounselor: userData.hierarchy?.grihasthaCounselor || '',
        grihasthaCounselorEmail: userData.hierarchy?.grihasthaCounselorEmail || '',
        // Camp completion fields
        campDys: userData.campDys || false,
        campSankalpa: userData.campSankalpa || false,
        campSphurti: userData.campSphurti || false,
        campUtkarsh: userData.campUtkarsh || false,
        campFaithAndDoubt: userData.campFaithAndDoubt || false,
        campSrcgdWorkshop: userData.campSrcgdWorkshop || false,
        campNistha: userData.campNistha || false,
        campAshray: userData.campAshray || false,
        // SP Books Study Course fields (Third Semester)
        spbookThirdSsr15: userData.spbookThirdSsr15 || false,
        spbookThirdComingBack: userData.spbookThirdComingBack || false,
        spbookThirdPqpa: userData.spbookThirdPqpa || false,
        spbookThirdMatchlessGift: userData.spbookThirdMatchlessGift || false,
        spbookThirdRajaVidya: userData.spbookThirdRajaVidya || false,
        spbookThirdElevationKc: userData.spbookThirdElevationKc || false,
        spbookThirdBeyondBirthDeath: userData.spbookThirdBeyondBirthDeath || false,
        spbookThirdKrishnaReservoir: userData.spbookThirdKrishnaReservoir || false,
        // SP Books Study Course fields (Fourth Semester)
        spbookFourthSsr68: userData.spbookFourthSsr68 || false,
        spbookFourthLawsOfNature: userData.spbookFourthLawsOfNature || false,
        spbookFourthDharma: userData.spbookFourthDharma || false,
        spbookFourthSecondChance: userData.spbookFourthSecondChance || false,
        spbookFourthIsopanishad110: userData.spbookFourthIsopanishad110 || false,
        spbookFourthQueenKuntiVideo: userData.spbookFourthQueenKuntiVideo || false,
        spbookFourthEnlightenmentNatural: userData.spbookFourthEnlightenmentNatural || false,
        spbookFourthKrishnaBook121: userData.spbookFourthKrishnaBook121 || false,
        // SP Books Study Course fields (Fifth Semester)
        spbookFifthLifeFromLife: userData.spbookFifthLifeFromLife || false,
        spbookFifthPrahladTeachings: userData.spbookFifthPrahladTeachings || false,
        spbookFifthJourneySelfDiscovery: userData.spbookFifthJourneySelfDiscovery || false,
        spbookFifthQueenKuntiHearing: userData.spbookFifthQueenKuntiHearing || false,
        spbookFifthLordKapila: userData.spbookFifthLordKapila || false,
        spbookFifthNectar16: userData.spbookFifthNectar16 || false,
        spbookFifthGita16: userData.spbookFifthGita16 || false,
        spbookFifthKrishnaBook2428: userData.spbookFifthKrishnaBook2428 || false,
        // SP Books Study Course fields (Sixth Semester)
        spbookSixthNectar711: userData.spbookSixthNectar711 || false,
        spbookSixthPathPerfection: userData.spbookSixthPathPerfection || false,
        spbookSixthCivilisationTranscendence: userData.spbookSixthCivilisationTranscendence || false,
        spbookSixthHareKrishnaChallenge: userData.spbookSixthHareKrishnaChallenge || false,
        spbookSixthGita712: userData.spbookSixthGita712 || false,
        spbookSixthSb1stCanto16: userData.spbookSixthSb1stCanto16 || false,
        spbookSixthKrishnaBook3559: userData.spbookSixthKrishnaBook3559 || false,
        // SP Books Study Course fields (Seventh Semester)
        spbookSeventhGita1318: userData.spbookSeventhGita1318 || false,
        spbookSeventhSb1stCanto713: userData.spbookSeventhSb1stCanto713 || false,
        spbookSeventhKrishnaBook6378: userData.spbookSeventhKrishnaBook6378 || false,
        // SP Books Study Course fields (Eighth Semester)
        spbookEighthSb1stCanto1419: userData.spbookEighthSb1stCanto1419 || false,
        spbookEighthKrishnaBook7889: userData.spbookEighthKrishnaBook7889 || false,
      });
      // Set counselor search values from spiritual fields
      setBrahmachariCounselorSearch(userData.hierarchy?.brahmachariCounselor || '');
      setGrihasthaCounselorSearch(userData.hierarchy?.grihasthaCounselor || '');
      // Set profile image from userData (Google Drive URL)
      const imageUrl = userData.profileImage || '';
      setProfileImage(imageUrl);
      console.log('Loaded profile image from userData:', imageUrl);

      // Load education and work experience
      if (userData.education && userData.education.length > 0) {
        const filteredEdu = userData.education.filter(edu => edu.institution || edu.field);
        setEducation(filteredEdu.length > 0 ? filteredEdu : [{ institution: '', field: '', year: null }]);
      } else {
        setEducation([{ institution: '', field: '', year: null }]);
      }

      if (userData.workExperience && userData.workExperience.length > 0) {
        const filteredWork = userData.workExperience.filter(work => work.company || work.position);
        setWorkExperience(filteredWork.length > 0 ? filteredWork : [{ company: '', position: '', startDate: null, endDate: null, current: false }]);
      }
      // Load languages, skills, and services
      if (userData.languages && userData.languages.length > 0) {
        const filteredLangs = userData.languages.filter(lang => lang.name && lang.name.trim());
        setLanguages(filteredLangs.length > 0 ? filteredLangs : [{ name: '' }]);
      } else {
        setLanguages([{ name: '' }]);
      }
      if (userData.skills && userData.skills.length > 0) {
        const filteredSkills = userData.skills.filter(skill => skill.name && skill.name.trim());
        setSkills(filteredSkills.length > 0 ? filteredSkills : [{ name: '' }]);
      } else {
        setSkills([{ name: '' }]);
      }
      if (userData.services && userData.services.length > 0) {
        const filteredServices = userData.services.filter(service => service.name && service.name.trim());
        setServices(filteredServices.length > 0 ? filteredServices : [{ name: '' }]);
      } else {
        setServices([{ name: '' }]);
      }
    }
  }, [userData]);

  // Load cities when state changes
  useEffect(() => {
    if (formData.state) {
      setLoadingCities(true);
      getCitiesByStateFromLocal(formData.state)
        .then(cities => {
          setAvailableCities(cities);
          setLoadingCities(false);
        })
        .catch(err => {
          console.error('Error loading cities:', err);
          setAvailableCities([]);
          setLoadingCities(false);
        });
    } else {
      setAvailableCities([]);
    }
  }, [formData.state]);

  // Load centers when state and city change
  useEffect(() => {
    if (formData.state && formData.city) {
      setLoadingCenters(true);
      getCentersByLocationFromLocal(formData.state, formData.city)
        .then(centers => {
          const centersList = centers.map(c => ({ id: c.id, name: c.name }));
          setAvailableCenters(centersList);

          // If we have a center name but no centerId, try to match it with the loaded centers
          if (formData.center && !formData.centerId) {
            const matchedCenter = centersList.find(c =>
              c.name.toLowerCase().trim() === formData.center.toLowerCase().trim()
            );
            if (matchedCenter) {
              setFormData(prev => ({ ...prev, centerId: matchedCenter.id }));
            }
          }
          // If we have a centerId, verify it still exists in the loaded centers
          else if (formData.centerId) {
            const matchedCenter = centersList.find(c => c.id === formData.centerId);
            if (matchedCenter && formData.center !== matchedCenter.name) {
              // Update center name if it doesn't match
              setFormData(prev => ({ ...prev, center: matchedCenter.name }));
            } else if (!matchedCenter && formData.center) {
              // If centerId doesn't match but we have a center name, try to find by name
              const matchedByName = centersList.find(c =>
                c.name.toLowerCase().trim() === formData.center.toLowerCase().trim()
              );
              if (matchedByName) {
                setFormData(prev => ({ ...prev, centerId: matchedByName.id }));
              }
            }
          }

          setLoadingCenters(false);
        })
        .catch(err => {
          console.error('Error loading centers:', err);
          setAvailableCenters([]);
          setLoadingCenters(false);
        });
    } else {
      setAvailableCenters([]);
    }
  }, [formData.state, formData.city]);

  // Load Brahmachari counselors with search (with debounce)
  useEffect(() => {
    const loadCounselors = async () => {
      setLoadingBrahmachariCounselors(true);
      try {
        const counselors = await getCounselorsFromLocal(brahmachariCounselorSearch || '', 'Brahmachari Ashram');
        setAvailableBrahmachariCounselors(counselors);
      } catch (error) {
        console.error('Error loading Brahmachari counselors:', error);
        setAvailableBrahmachariCounselors([]);
      } finally {
        setLoadingBrahmachariCounselors(false);
      }
    };

    const timeoutId = setTimeout(() => {
      loadCounselors();
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [brahmachariCounselorSearch]);

  // Load Grihastha counselors with search (with debounce)
  useEffect(() => {
    const loadCounselors = async () => {
      setLoadingGrihasthaCounselors(true);
      try {
        const counselors = await getCounselorsFromLocal(grihasthaCounselorSearch || '', 'Grihastha Ashram');
        setAvailableGrihasthaCounselors(counselors);
      } catch (error) {
        console.error('Error loading Grihastha counselors:', error);
        setAvailableGrihasthaCounselors([]);
      } finally {
        setLoadingGrihasthaCounselors(false);
      }
    };

    const timeoutId = setTimeout(() => {
      loadCounselors();
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [grihasthaCounselorSearch]);

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
        const cities = await getCitiesByStateFromLocal(formData.state);
        setAvailableCities(cities);
        setFormData(prev => ({ ...prev, city: newCityName.trim(), center: '' }));
        setNewCityName('');
        setShowAddCity(false);
        setSuccess('City added successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to add city.');
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
        const centers = await getCentersByLocationFromLocal(formData.state, formData.city);
        setAvailableCenters(centers.map(c => ({ id: c.id, name: c.name })));
        // Find the newly added center to get its ID
        const updatedCenters = await getCentersByLocationFromLocal(formData.state, formData.city);
        const newCenterData = updatedCenters.find(c => c.name === newCenter.name.trim());
        setFormData(prev => ({
          ...prev,
          center: newCenter.name.trim(),
          centerId: newCenterData?.id || ''
        }));
        setNewCenter({ name: '', address: '', contact: '' });
        setShowAddCenter(false);
        setSuccess('Center added successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to add center.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add center');
    } finally {
      setAddingCenter(false);
    }
  };

  const handleAddBrahmachariCounselor = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setCounselorFieldErrors({ name: '', mobile: '', email: '', city: '' });
    setError('');

    if (!newBrahmachariCounselor.name.trim()) {
      setCounselorFieldErrors(prev => ({ ...prev, name: 'Counselor name is required' }));
      return;
    }

    if (!isValidName(newBrahmachariCounselor.name)) {
      setCounselorFieldErrors(prev => ({ ...prev, name: 'Invalid characters in name.' }));
      return;
    }

    const mobileValidation = validateMobile(newBrahmachariCounselor.mobile);
    if (!mobileValidation.valid) {
      setCounselorFieldErrors(prev => ({ ...prev, mobile: mobileValidation.error || 'Invalid mobile number' }));
      return;
    }

    const emailValidation = validateEmail(newBrahmachariCounselor.email);
    if (!emailValidation.valid) {
      setCounselorFieldErrors(prev => ({ ...prev, email: emailValidation.error || 'Invalid email address' }));
      return;
    }

    if (!newBrahmachariCounselor.city.trim()) {
      setCounselorFieldErrors(prev => ({ ...prev, city: 'City is required' }));
      return;
    }

    setAddingBrahmachariCounselor(true);

    try {
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
        setFormData(prev => ({
          ...prev,
          brahmachariCounselor: newBrahmachariCounselor.name.trim(),
          brahmachariCounselorEmail: newBrahmachariCounselor.email.trim().toLowerCase()
        }));
        setBrahmachariCounselorSearch(newBrahmachariCounselor.name.trim());
        setNewBrahmachariCounselor({ name: '', mobile: '', email: '', city: '' });
        setShowAddBrahmachariCounselor(false);
        setSuccess('Counselor added successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to add counselor.');
      }
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        setError(`${err.message}`);
      } else {
        setError(err.message || 'Failed to add counselor');
      }
    } finally {
      setAddingBrahmachariCounselor(false);
    }
  };

  const handleAddGrihasthaCounselor = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setCounselorFieldErrors({ name: '', mobile: '', email: '', city: '' });
    setError('');

    if (!newGrihasthaCounselor.name.trim()) {
      setCounselorFieldErrors(prev => ({ ...prev, name: 'Counselor name is required' }));
      return;
    }

    if (!isValidName(newGrihasthaCounselor.name)) {
      setCounselorFieldErrors(prev => ({ ...prev, name: 'Invalid characters in name.' }));
      return;
    }

    const mobileValidation = validateMobile(newGrihasthaCounselor.mobile);
    if (!mobileValidation.valid) {
      setCounselorFieldErrors(prev => ({ ...prev, mobile: mobileValidation.error || 'Invalid mobile number' }));
      return;
    }

    const emailValidation = validateEmail(newGrihasthaCounselor.email);
    if (!emailValidation.valid) {
      setCounselorFieldErrors(prev => ({ ...prev, email: emailValidation.error || 'Invalid email address' }));
      return;
    }

    if (!newGrihasthaCounselor.city.trim()) {
      setCounselorFieldErrors(prev => ({ ...prev, city: 'City is required' }));
      return;
    }

    setAddingGrihasthaCounselor(true);

    try {
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
        setFormData(prev => ({
          ...prev,
          grihasthaCounselor: newGrihasthaCounselor.name.trim(),
          grihasthaCounselorEmail: newGrihasthaCounselor.email.trim().toLowerCase()
        }));
        setGrihasthaCounselorSearch(newGrihasthaCounselor.name.trim());
        setNewGrihasthaCounselor({ name: '', mobile: '', email: '', city: '' });
        setShowAddGrihasthaCounselor(false);
        setSuccess('Counselor added successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to add counselor.');
      }
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        setError(`${err.message}`);
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
    setSuccess('');
    setFieldErrors({});

    // Validate and sanitize name
    const nameValidation = validateTextInput(formData.name, 'Full Name', 100);
    if (!nameValidation.valid) {
      setFieldErrors({ name: nameValidation.error || 'Invalid name' });
      setError(nameValidation.error || 'Invalid name');
      return;
    }
    const sanitizedName = sanitizeTextInput(formData.name.trim());

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      setFieldErrors({ email: emailValidation.error || 'Invalid email address' });
      setError(emailValidation.error || 'Invalid email address');
      return;
    }

    // Validate and sanitize phone if provided
    let sanitizedPhone = null;
    if (formData.phone && formData.phone.trim()) {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) {
        setFieldErrors({ phone: phoneValidation.error || 'Invalid phone number' });
        setError(phoneValidation.error || 'Invalid phone number');
        return;
      }
      sanitizedPhone = formData.phone.trim();
    }

    // Validate required hierarchy fields
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

    // Validate and sanitize education entries
    const educationErrors: string[] = [];
    const sanitizedEducation = education.map((edu, index) => {
      if (edu.institution?.trim()) {
        const instValidation = validateEducationField(edu.institution, `Education ${index + 1} - Institution`);
        if (!instValidation.valid) {
          educationErrors.push(instValidation.error || `Invalid institution name in entry ${index + 1}`);
        }
      }
      if (edu.field?.trim()) {
        const fieldValidation = validateEducationField(edu.field, `Education ${index + 1} - Field`);
        if (!fieldValidation.valid) {
          educationErrors.push(fieldValidation.error || `Invalid field name in entry ${index + 1}`);
        }
      }
      return {
        institution: edu.institution ? sanitizeTextInput(edu.institution.trim()) : '',
        field: edu.field ? sanitizeTextInput(edu.field.trim()) : '',
        year: edu.year
      };
    });
    if (educationErrors.length > 0) {
      setError(educationErrors[0]);
      setFieldErrors({ education: educationErrors[0] });
      return;
    }

    // Validate and sanitize work experience entries
    const workErrors: string[] = [];
    const sanitizedWork = workExperience.map((work, index) => {
      if (work.company?.trim()) {
        const companyValidation = validateWorkField(work.company, `Work ${index + 1} - Company`);
        if (!companyValidation.valid) {
          workErrors.push(companyValidation.error || `Invalid company name in entry ${index + 1}`);
        }
      }
      if (work.position?.trim()) {
        const positionValidation = validateWorkField(work.position, `Work ${index + 1} - Position`);
        if (!positionValidation.valid) {
          workErrors.push(positionValidation.error || `Invalid position name in entry ${index + 1}`);
        }
      }
      return {
        company: work.company ? sanitizeTextInput(work.company.trim()) : '',
        position: work.position ? sanitizeTextInput(work.position.trim()) : '',
        startDate: work.startDate,
        endDate: work.endDate,
        current: work.current
      };
    });
    if (workErrors.length > 0) {
      setError(workErrors[0]);
      setFieldErrors({ work: workErrors[0] });
      return;
    }

    if (!user || !supabase) {
      setError('User session not found. Please sign in again.');
      return;
    }

    setSaving(true);

    try {
      // Build hierarchy object for backward compatibility (using sanitized values)
      const hierarchy: any = {};
      if (formData.state) hierarchy.state = sanitizeTextInput(formData.state.trim());
      if (formData.city) hierarchy.city = sanitizeTextInput(formData.city.trim());
      if (formData.center) {
        hierarchy.center = sanitizeTextInput(formData.center.trim());
        if (formData.centerId) hierarchy.centerId = formData.centerId; // Store center ID
      }

      // Add spiritual fields to hierarchy
      if (formData.initiationStatus) hierarchy.initiationStatus = formData.initiationStatus;
      if (formData.initiatedName) hierarchy.initiatedName = sanitizeTextInput(formData.initiatedName.trim());
      if (formData.spiritualMasterName) hierarchy.spiritualMasterName = sanitizeTextInput(formData.spiritualMasterName.trim());
      if (formData.aspiringSpiritualMasterName) hierarchy.aspiringSpiritualMasterName = sanitizeTextInput(formData.aspiringSpiritualMasterName.trim());
      if (formData.chantingSince) hierarchy.chantingSince = formData.chantingSince;
      if (formData.rounds) hierarchy.rounds = formData.rounds;
      if (formData.ashram) hierarchy.ashram = formData.ashram;
      if (formData.royalMember) hierarchy.royalMember = formData.royalMember;
      if (formData.brahmachariCounselor) {
        hierarchy.brahmachariCounselor = sanitizeTextInput(formData.brahmachariCounselor.trim());
        hierarchy.brahmachariCounselorEmail = formData.brahmachariCounselorEmail || null;
      }
      if (formData.grihasthaCounselor) {
        hierarchy.grihasthaCounselor = sanitizeTextInput(formData.grihasthaCounselor.trim());
        hierarchy.grihasthaCounselorEmail = formData.grihasthaCounselorEmail || null;
      }

      // Build education update object (up to 5 entries) - filter out empty entries using sanitized data
      const educationUpdate: any = {};
      const validEducation = sanitizedEducation.filter(edu => edu.institution?.trim() || edu.field?.trim());
      validEducation.slice(0, 5).forEach((edu, index) => {
        const num = index + 1;
        educationUpdate[`edu_${num}_institution`] = edu.institution?.trim() || null;
        educationUpdate[`edu_${num}_field`] = edu.field?.trim() || null;
        educationUpdate[`edu_${num}_year`] = edu.year || null;
      });
      // Clear remaining education slots if user has fewer than 5 entries
      for (let i = validEducation.length + 1; i <= 5; i++) {
        educationUpdate[`edu_${i}_institution`] = null;
        educationUpdate[`edu_${i}_field`] = null;
        educationUpdate[`edu_${i}_year`] = null;
      }

      // Build work experience update object (up to 5 entries) - filter out empty entries using sanitized data
      const workUpdate: any = {};
      const validWork = sanitizedWork.filter(work => work.company?.trim() || work.position?.trim());
      validWork.slice(0, 5).forEach((work, index) => {
        const num = index + 1;
        workUpdate[`work_${num}_company`] = work.company?.trim() || null;
        workUpdate[`work_${num}_position`] = work.position?.trim() || null;
        workUpdate[`work_${num}_start_date`] = work.startDate || null;
        workUpdate[`work_${num}_end_date`] = work.current ? null : (work.endDate || null);
        workUpdate[`work_${num}_current`] = work.current || false;
      });
      // Clear remaining work slots if user has fewer than 5 entries
      for (let i = validWork.length + 1; i <= 5; i++) {
        workUpdate[`work_${i}_company`] = null;
        workUpdate[`work_${i}_position`] = null;
        workUpdate[`work_${i}_start_date`] = null;
        workUpdate[`work_${i}_end_date`] = null;
        workUpdate[`work_${i}_current`] = false;
      }

      // Build languages update object (up to 5 entries)
      const languagesUpdate: any = {};
      const filteredLanguages = languages.filter(lang => lang.name?.trim());
      filteredLanguages.slice(0, 5).forEach((lang, index) => {
        const num = index + 1;
        languagesUpdate[`language_${num}`] = lang.name?.trim() || null;
      });
      for (let i = filteredLanguages.length + 1; i <= 5; i++) {
        languagesUpdate[`language_${i}`] = null;
      }

      // Build skills update object (up to 5 entries)
      const skillsUpdate: any = {};
      const filteredSkills = skills.filter(skill => skill.name?.trim());
      filteredSkills.slice(0, 5).forEach((skill, index) => {
        const num = index + 1;
        skillsUpdate[`skill_${num}`] = skill.name?.trim() || null;
      });
      for (let i = filteredSkills.length + 1; i <= 5; i++) {
        skillsUpdate[`skill_${i}`] = null;
      }

      // Build services update object (up to 5 entries)
      const servicesUpdate: any = {};
      const filteredServices = services.filter(service => service.name?.trim());
      filteredServices.slice(0, 5).forEach((service, index) => {
        const num = index + 1;
        servicesUpdate[`service_${num}`] = service.name?.trim() || null;
      });
      for (let i = filteredServices.length + 1; i <= 5; i++) {
        servicesUpdate[`service_${i}`] = null;
      }

      // Update user profile in Supabase - using separate columns (with sanitized values)
      // Update user profile via Secure API to handle role revocation logic
      console.log('Updating profile via Secure API...');

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No active session token found');
      }

      // Construct the main updates object
      const updates: any = {
        name: sanitizedName,
        phone: sanitizedPhone,
        birth_date: formData.birthDate || null,
        profile_image: profileImage || null,
        state: hierarchy.state || null,
        city: hierarchy.city || null,
        center: hierarchy.center || null,
        center_id: formData.centerId || null,
        // Spiritual information columns
        initiation_status: formData.initiationStatus || null,
        initiated_name: formData.initiatedName ? sanitizeTextInput(formData.initiatedName.trim()) : null,
        spiritual_master_name: formData.spiritualMasterName ? sanitizeTextInput(formData.spiritualMasterName.trim()) : null,
        aspiring_spiritual_master_name: formData.aspiringSpiritualMasterName ? sanitizeTextInput(formData.aspiringSpiritualMasterName.trim()) : null,
        chanting_since: formData.chantingSince || null,
        rounds: formData.rounds ? parseInt(formData.rounds) || null : null,
        ashram: formData.ashram || null,
        royal_member: formData.royalMember || null,
        brahmachari_counselor: formData.brahmachariCounselor ? sanitizeTextInput(formData.brahmachariCounselor.trim()) : null,
        brahmachari_counselor_email: formData.brahmachariCounselorEmail || null,
        grihastha_counselor: formData.grihasthaCounselor ? sanitizeTextInput(formData.grihasthaCounselor.trim()) : null,
        grihastha_counselor_email: formData.grihasthaCounselorEmail || null,
        // Camp completion fields
        camp_dys: formData.campDys || false,
        camp_sankalpa: formData.campSankalpa || false,
        camp_sphurti: formData.campSphurti || false,
        camp_utkarsh: formData.campUtkarsh || false,
        camp_faith_and_doubt: formData.campFaithAndDoubt || false,
        camp_srcgd_workshop: formData.campSrcgdWorkshop || false,
        camp_nistha: formData.campNistha || false,
        camp_ashray: formData.campAshray || false,
        // SP Books Study Course fields (Third Semester)
        spbook_third_ssr_1_5: formData.spbookThirdSsr15 || false,
        spbook_third_coming_back: formData.spbookThirdComingBack || false,
        spbook_third_pqpa: formData.spbookThirdPqpa || false,
        spbook_third_matchless_gift: formData.spbookThirdMatchlessGift || false,
        spbook_third_raja_vidya: formData.spbookThirdRajaVidya || false,
        spbook_third_elevation_kc: formData.spbookThirdElevationKc || false,
        spbook_third_beyond_birth_death: formData.spbookThirdBeyondBirthDeath || false,
        spbook_third_krishna_reservoir: formData.spbookThirdKrishnaReservoir || false,
        // SP Books Study Course fields (Fourth Semester)
        spbook_fourth_ssr_6_8: formData.spbookFourthSsr68 || false,
        spbook_fourth_laws_of_nature: formData.spbookFourthLawsOfNature || false,
        spbook_fourth_dharma: formData.spbookFourthDharma || false,
        spbook_fourth_second_chance: formData.spbookFourthSecondChance || false,
        spbook_fourth_isopanishad_1_10: formData.spbookFourthIsopanishad110 || false,
        spbook_fourth_queen_kunti_video: formData.spbookFourthQueenKuntiVideo || false,
        spbook_fourth_enlightenment_natural: formData.spbookFourthEnlightenmentNatural || false,
        spbook_fourth_krishna_book_1_21: formData.spbookFourthKrishnaBook121 || false,
        // SP Books Study Course fields (Fifth Semester)
        spbook_fifth_life_from_life: formData.spbookFifthLifeFromLife || false,
        spbook_fifth_prahlad_teachings: formData.spbookFifthPrahladTeachings || false,
        spbook_fifth_journey_self_discovery: formData.spbookFifthJourneySelfDiscovery || false,
        spbook_fifth_queen_kunti_hearing: formData.spbookFifthQueenKuntiHearing || false,
        spbook_fifth_lord_kapila: formData.spbookFifthLordKapila || false,
        spbook_fifth_nectar_1_6: formData.spbookFifthNectar16 || false,
        spbook_fifth_gita_1_6: formData.spbookFifthGita16 || false,
        spbook_fifth_krishna_book_24_28: formData.spbookFifthKrishnaBook2428 || false,
        // SP Books Study Course fields (Sixth Semester)
        spbook_sixth_nectar_7_11: formData.spbookSixthNectar711 || false,
        spbook_sixth_path_perfection: formData.spbookSixthPathPerfection || false,
        spbook_sixth_civilisation_transcendence: formData.spbookSixthCivilisationTranscendence || false,
        spbook_sixth_hare_krishna_challenge: formData.spbookSixthHareKrishnaChallenge || false,
        spbook_sixth_gita_7_12: formData.spbookSixthGita712 || false,
        spbook_sixth_sb_1st_canto_1_6: formData.spbookSixthSb1stCanto16 || false,
        spbook_sixth_krishna_book_35_59: formData.spbookSixthKrishnaBook3559 || false,
        // SP Books Study Course fields (Seventh Semester)
        spbook_seventh_gita_13_18: formData.spbookSeventhGita1318 || false,
        spbook_seventh_sb_1st_canto_7_13: formData.spbookSeventhSb1stCanto713 || false,
        spbook_seventh_krishna_book_63_78: formData.spbookSeventhKrishnaBook6378 || false,
        // SP Books Study Course fields (Eighth Semester)
        spbook_eighth_sb_1st_canto_14_19: formData.spbookEighthSb1stCanto1419 || false,
        spbook_eighth_krishna_book_78_89: formData.spbookEighthKrishnaBook7889 || false,

        // Arrays (expanded)
        ...educationUpdate,
        ...workUpdate,
        ...languagesUpdate,
        ...skillsUpdate,
        ...servicesUpdate,

        hierarchy: hierarchy, // Keep for backward compatibility
        updated_at: new Date().toISOString(),
      };

      const response = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          updates: updates
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      console.log('Profile updated successfully:', data);
      console.log('Profile updated successfully:', data);
      setSuccess('Profile updated successfully!');
      setIsDirty(false); // Reset dirty state on success

      // Reload user data after a short delay to reflect changes (e.g. role revocation)
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-amber-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative animate-fadeIn">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600 mx-auto shadow-lg"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-2 bg-amber-100 rounded-full">
                <User className="h-6 w-6 text-amber-600 animate-pulse" />
              </div>
            </div>
          </div>
          <p className="mt-6 text-gray-700 font-semibold text-lg animate-slideInRight" style={{ animationDelay: '0.2s' }}>Loading your profile...</p>
          <p className="mt-2 text-gray-500 text-sm animate-fadeIn" style={{ animationDelay: '0.3s' }}>Please wait while we fetch your information</p>
          <div className="mt-4 flex justify-center gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-amber-50/50 py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.5s ease-out forwards;
        }
        .animate-slideInRight {
          animation: slideInRight 0.6s ease-out forwards;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-on-scroll {
          opacity: 0;
        }
        .animate-on-scroll.animate-in {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        .ripple-effect {
          position: relative;
          overflow: hidden;
        }
        .ripple-effect::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        .ripple-effect:active::after {
          width: 300px;
          height: 300px;
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header Section - Devotional and Soothing Colors with Animation */}
        <div className={`bg-white rounded-xl sm:rounded-2xl shadow-lg border border-amber-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] ${mounted ? 'animate-fadeInUp' : 'opacity-0'}`}>
          <div className="bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 relative overflow-hidden">
            <div className="absolute inset-0 shimmer opacity-30"></div>
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 mb-0.5 sm:mb-1 flex items-center gap-2 sm:gap-3 drop-shadow-md font-display tracking-tight ${mounted ? 'animate-slideInRight' : 'opacity-0'}`}>
                    <div className="p-1.5 sm:p-2 bg-white/30 rounded-lg sm:rounded-xl backdrop-blur-sm shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-900" />
                    </div>
                    My Profile
                  </h1>
                  <p className={`text-blue-800/80 text-xs sm:text-sm lg:text-base ml-8 sm:ml-10 lg:ml-12 font-medium tracking-wide ${mounted ? 'animate-fadeIn' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>Manage and update your personal information</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Messages with Enhanced Animations */}
        {/* Toasts removed from here and moved to fixed position container at the bottom */}

        <form onSubmit={handleSubmit} className="space-y-8 relative">
          {/* Personal Information Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-blue-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-400 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3 drop-shadow-sm relative z-10">
                <div className="p-1.5 sm:p-2 bg-white/30 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-900" />
                </div>
                Personal Information
              </h2>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex justify-center mb-4 sm:mb-6">
                <PhotoUpload
                  onUploadComplete={async (url) => {
                    console.log('PhotoUpload callback received URL:', url);
                    const previousImageUrl = profileImage;
                    setProfileImage(url);

                    // Auto-save the profile image immediately after upload
                    if (user && supabase && url) {
                      try {
                        console.log('Auto-saving profile image to database...');
                        console.log('User ID:', user.id);
                        console.log('Image URL:', url);

                        const { error: updateError, data: updateData } = await supabase
                          .from('users')
                          .update({
                            profile_image: url,
                            updated_at: new Date().toISOString(),
                          })
                          .eq('id', user.id)
                          .select('id, profile_image');

                        console.log('Database update response:', { updateData, updateError });

                        if (updateError) {
                          console.error('Error auto-saving profile image:', updateError);
                          console.error('Error code:', updateError.code);
                          console.error('Error message:', updateError.message);
                          console.error('Error details:', updateError);
                          setError(`Failed to save profile image: ${updateError.message || 'Unknown error'}`);
                          // Revert the profileImage state if save failed
                          setProfileImage(previousImageUrl);
                        } else {
                          console.log('✅ Profile image saved successfully!');
                          console.log('Saved data:', updateData);
                          // Don't show success message here - PhotoUpload component handles its own success message
                          // This prevents duplicate messages - the PhotoUpload component will show the success message once
                        }
                      } catch (err: any) {
                        console.error('Exception in auto-save:', err);
                        console.error('Error stack:', err.stack);
                        setError(`Failed to save profile image: ${err.message || 'Unknown error'}`);
                        // Revert the profileImage state if save failed
                        setProfileImage(previousImageUrl);
                      }
                    } else {
                      console.warn('Cannot auto-save: missing user, supabase, or URL', { user: !!user, supabase: !!supabase, url: !!url });
                    }
                  }}
                  onUploadError={(error) => setError(error)}
                  userName={formData.name || userData?.name || 'user'}
                  currentImageUrl={profileImage}
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="group animate-on-scroll" style={{ animationDelay: '0.1s' }}>
                  <label htmlFor="name" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 transform transition-all duration-200 group-hover:translate-x-1">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-sky-600 transform transition-all duration-200 group-hover:scale-110 group-hover:rotate-12" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      const sanitized = sanitizeTextInput(e.target.value);
                      setFormData({ ...formData, name: sanitized });
                      // Clear error when user starts typing
                      if (fieldErrors.name) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.name;
                          return newErrors;
                        });
                      }
                    }}
                    onBlur={() => {
                      const validation = validateTextInput(formData.name, 'Full Name', 100);
                      if (!validation.valid) {
                        setFieldErrors(prev => ({ ...prev, name: validation.error || 'Invalid name' }));
                      }
                    }}
                    required
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-sky-50/50 hover:bg-sky-50 transition-all duration-300 group-hover:border-sky-200 focus:scale-[1.02] focus:shadow-md ${fieldErrors.name
                      ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                      : 'border-sky-100 focus:ring-sky-400 focus:border-sky-400'
                      }`}
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                      <X className="h-3 w-3" />
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div className="group animate-on-scroll" style={{ animationDelay: '0.2s' }}>
                  <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 transform transition-all duration-200 group-hover:translate-x-1">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-sky-600 transform transition-all duration-200 group-hover:scale-110 group-hover:rotate-12" />
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-sky-100 rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    Email cannot be changed
                  </p>
                </div>

                <div className="group animate-on-scroll" style={{ animationDelay: '0.3s' }}>
                  <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 transform transition-all duration-200 group-hover:translate-x-1">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-sky-600 transform transition-all duration-200 group-hover:scale-110 group-hover:rotate-12" />
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      // Allow only phone-valid characters
                      const phoneValue = e.target.value.replace(/[^0-9+\-\s()]/g, '');
                      setFormData({ ...formData, phone: phoneValue });
                      // Clear error when user starts typing
                      if (fieldErrors.phone) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.phone;
                          return newErrors;
                        });
                      }
                    }}
                    onBlur={() => {
                      if (formData.phone && formData.phone.trim()) {
                        const validation = validatePhone(formData.phone);
                        if (!validation.valid) {
                          setFieldErrors(prev => ({ ...prev, phone: validation.error || 'Invalid phone number' }));
                        }
                      }
                    }}
                    placeholder="+91 9876543210"
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-sky-50/50 hover:bg-sky-50 transition-all duration-300 group-hover:border-sky-200 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md ${fieldErrors.phone
                      ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                      : 'border-sky-100 focus:ring-sky-400 focus:border-sky-400'
                      }`}
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                      <X className="h-3 w-3" />
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div className="group animate-on-scroll" style={{ animationDelay: '0.4s' }}>
                  <label htmlFor="birthDate" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 transform transition-all duration-200 group-hover:translate-x-1">
                    Date of Birth
                  </label>
                  <input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      const today = new Date().toISOString().split('T')[0];
                      // Prevent future dates
                      if (selectedDate > today) {
                        setFieldErrors(prev => ({ ...prev, birthDate: 'Future dates are not allowed' }));
                        return;
                      }
                      setFormData({ ...formData, birthDate: selectedDate });
                      if (fieldErrors.birthDate) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.birthDate;
                          return newErrors;
                        });
                      }
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-sky-50/50 hover:bg-sky-50 transition-all duration-300 group-hover:border-sky-200 focus:scale-[1.02] focus:shadow-md ${fieldErrors.birthDate
                      ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                      : 'border-sky-100 focus:ring-sky-400 focus:border-sky-400'
                      }`}
                  />
                  {fieldErrors.birthDate && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                      <X className="h-3 w-3" />
                      {fieldErrors.birthDate}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Location Information Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-visible transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1 relative z-0 mb-2">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3 relative z-10">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                Address
              </h2>
            </div>

            <div className="p-4 sm:p-6 relative z-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="group animate-on-scroll" style={{ animationDelay: '0.1s' }}>
                  <label htmlFor="state" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 transform transition-all duration-200 group-hover:translate-x-1">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 transform transition-all duration-200 group-hover:scale-110 group-hover:rotate-12" />
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '', center: '' })}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-blue-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-blue-50/50 hover:bg-blue-50 transition-all duration-300 group-hover:border-blue-200 focus:scale-[1.02] focus:shadow-md appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTYgOUwxMiAxNUwxOCA5IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGlub2pvaW49InJvdW5kIi8+Cjwvc3ZnPg==')] bg-[length:16px] sm:bg-[length:20px] bg-[right_0.75rem_center] sm:bg-[right_1rem_center] bg-no-repeat cursor-pointer"
                  >
                    <option value="">📍 Select State</option>
                    {states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div className="group animate-on-scroll" style={{ animationDelay: '0.2s' }}>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="city" className="block text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2 transform transition-all duration-200 group-hover:translate-x-1">
                      <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 transform transition-all duration-200 group-hover:scale-110 group-hover:rotate-12" />
                      City <span className="text-red-500">*</span>
                    </label>
                    {formData.state && !showAddCity && (
                      <button
                        type="button"
                        onClick={() => setShowAddCity(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline transition-all"
                      >
                        <Plus className="h-3 w-3" />
                        Add New
                      </button>
                    )}
                  </div>
                  {!showAddCity ? (
                    <select
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value, center: '', centerId: '' })}
                      required
                      disabled={!formData.state || loadingCities}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-blue-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-blue-50/50 hover:bg-blue-50 transition-all duration-300 group-hover:border-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 focus:scale-[1.02] focus:shadow-md appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTYgOUwxMiAxNUwxOCA5IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGlub2pvaW49InJvdW5kIi8+Cjwvc3ZnPg==')] bg-[length:16px] sm:bg-[length:20px] bg-[right_0.75rem_center] sm:bg-[right_1rem_center] bg-no-repeat cursor-pointer"
                    >
                      <option value="">
                        {loadingCities ? '⏳ Loading...' : formData.state ? '🏙️ Select City' : '⬆️ Select State first'}
                      </option>
                      {availableCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="border-2 border-blue-200 rounded-lg sm:rounded-xl p-3 bg-blue-50 animate-fadeInUp shadow-inner">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-800">Add New City</span>
                        <button onClick={(e) => { e.preventDefault(); setShowAddCity(false); setNewCityName(''); }} className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-1 hover:bg-gray-100 transition-colors"><X className="h-3 w-3" /></button>
                      </div>
                      <input
                        type="text"
                        value={newCityName}
                        onChange={(e) => setNewCityName(e.target.value)}
                        placeholder="Enter city name..."
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2 bg-white"
                      />
                      <button
                        onClick={handleAddCity}
                        disabled={addingCity || !newCityName.trim()}
                        type="button"
                        className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {addingCity ? 'Adding...' : 'Add City'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="group animate-on-scroll" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="center" className="block text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2 transform transition-all duration-200 group-hover:translate-x-1">
                      <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 transform transition-all duration-200 group-hover:scale-110 group-hover:rotate-12" />
                      Center <span className="text-red-500">*</span>
                    </label>
                    {formData.city && !showAddCenter && (
                      <button
                        type="button"
                        onClick={() => setShowAddCenter(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline transition-all"
                      >
                        <Plus className="h-3 w-3" />
                        Add New
                      </button>
                    )}
                  </div>
                  {!showAddCenter ? (
                    <select
                      id="center"
                      value={formData.centerId || formData.center}
                      onChange={(e) => {
                        const selectedCenter = availableCenters.find(c => c.id === e.target.value || c.name === e.target.value);
                        setFormData({
                          ...formData,
                          center: selectedCenter?.name || e.target.value,
                          centerId: selectedCenter?.id || e.target.value
                        });
                      }}
                      required
                      disabled={!formData.state || !formData.city || loadingCenters}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-blue-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-blue-50/50 hover:bg-blue-50 transition-all duration-300 group-hover:border-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 focus:scale-[1.02] focus:shadow-md appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTYgOUwxMiAxNUwxOCA5IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGlub2pvaW49InJvdW5kIi8+Cjwvc3ZnPg==')] bg-[length:16px] sm:bg-[length:20px] bg-[right_0.75rem_center] sm:bg-[right_1rem_center] bg-no-repeat cursor-pointer"
                    >
                      <option value="">
                        {loadingCenters ? '⏳ Loading...' : !formData.state || !formData.city ? '⬆️ Select State and City first' : '🏛️ Select Center'}
                      </option>
                      {availableCenters.map(center => (
                        <option key={center.id} value={center.id}>{center.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="border-2 border-blue-200 rounded-lg sm:rounded-xl p-3 bg-blue-50 animate-fadeInUp shadow-inner space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-800">Add New Center</span>
                        <button onClick={(e) => { e.preventDefault(); setShowAddCenter(false); setNewCenter({ name: '', address: '', contact: '' }); }} className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-1 hover:bg-gray-100 transition-colors"><X className="h-3 w-3" /></button>
                      </div>
                      <input
                        type="text"
                        value={newCenter.name}
                        onChange={(e) => setNewCenter({ ...newCenter, name: e.target.value })}
                        placeholder="Center Name*"
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <input
                        type="text"
                        value={newCenter.address}
                        onChange={(e) => setNewCenter({ ...newCenter, address: e.target.value })}
                        placeholder="Address*"
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <input
                        type="text"
                        value={newCenter.contact}
                        onChange={(e) => setNewCenter({ ...newCenter, contact: e.target.value })}
                        placeholder="Contact (Optional)"
                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <button
                        onClick={handleAddCenter}
                        disabled={addingCenter || !newCenter.name.trim()}
                        type="button"
                        className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {addingCenter ? 'Adding...' : 'Add Center'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Spiritual Information Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-lg sm:rounded-xl shadow-md border border-purple-100 overflow-hidden relative z-10">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-3 sm:px-4 py-2 sm:py-3 relative overflow-hidden group">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 relative z-10">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                Spiritual Information
              </h2>
            </div>

            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start">
                {/* Initiated/Aspiring Field */}
                <div>
                  <label htmlFor="initiationStatus" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
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
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-purple-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-purple-50/50 hover:bg-purple-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTYgOUwxMiAxNUwxOCA5IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGlub2pvaW49InJvdW5kIi8+Cjwvc3ZnPg==')] bg-[length:16px] sm:bg-[length:20px] bg-[right_0.75rem_center] sm:bg-[right_1rem_center] bg-no-repeat cursor-pointer"
                  >
                    <option value="">Select...</option>
                    <option value="initiated">Initiated</option>
                    <option value="aspiring">Aspiring</option>
                  </select>
                </div>

                {/* Initiated Name - only shown if Initiated */}
                {formData.initiationStatus === 'initiated' && (
                  <>
                    <div>
                      <label htmlFor="initiatedName" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                        Initiated Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="initiatedName"
                        type="text"
                        value={formData.initiatedName}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          setFormData({ ...formData, initiatedName: sanitized });
                          if (fieldErrors.initiatedName) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.initiatedName;
                              return newErrors;
                            });
                          }
                        }}
                        required
                        placeholder="Enter your initiated name"
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-purple-50/50 hover:bg-purple-50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md ${fieldErrors.initiatedName
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-purple-100 focus:ring-purple-500 focus:border-purple-500'
                          }`}
                      />
                      {fieldErrors.initiatedName && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.initiatedName}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="spiritualMasterName" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                        Spiritual Master Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="spiritualMasterName"
                        type="text"
                        value={formData.spiritualMasterName}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          setFormData({ ...formData, spiritualMasterName: sanitized });
                          if (fieldErrors.spiritualMasterName) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.spiritualMasterName;
                              return newErrors;
                            });
                          }
                        }}
                        required
                        placeholder="Enter your spiritual master name"
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-purple-50/50 hover:bg-purple-50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md ${fieldErrors.spiritualMasterName
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-purple-100 focus:ring-purple-500 focus:border-purple-500'
                          }`}
                      />
                      {fieldErrors.spiritualMasterName && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.spiritualMasterName}</p>
                      )}
                    </div>
                  </>
                )}

                {/* Aspiring Spiritual Master Name - only shown if Aspiring */}
                {formData.initiationStatus === 'aspiring' && (
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label htmlFor="aspiringSpiritualMasterName" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                      Aspiring Spiritual Master Name
                    </label>
                    <input
                      id="aspiringSpiritualMasterName"
                      type="text"
                      value={formData.aspiringSpiritualMasterName}
                      onChange={(e) => {
                        const sanitized = sanitizeTextInput(e.target.value);
                        setFormData({ ...formData, aspiringSpiritualMasterName: sanitized });
                        if (fieldErrors.aspiringSpiritualMasterName) {
                          setFieldErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.aspiringSpiritualMasterName;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="Enter aspiring spiritual master name (optional)"
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-purple-50/50 hover:bg-purple-50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md ${fieldErrors.aspiringSpiritualMasterName
                        ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                        : 'border-purple-100 focus:ring-purple-500 focus:border-purple-500'
                        }`}
                    />
                    {fieldErrors.aspiringSpiritualMasterName && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.aspiringSpiritualMasterName}</p>
                    )}
                  </div>
                )}

                {/* Chanting Since and Rounds */}
                <div>
                  <label htmlFor="chantingSince" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Chanting Since <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="chantingSince"
                    type="date"
                    value={formData.chantingSince}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      const today = new Date().toISOString().split('T')[0];
                      // Prevent future dates
                      if (selectedDate > today) {
                        setFieldErrors(prev => ({ ...prev, chantingSince: 'Future dates are not allowed' }));
                        return;
                      }
                      setFormData({ ...formData, chantingSince: selectedDate });
                      if (fieldErrors.chantingSince) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.chantingSince;
                          return newErrors;
                        });
                      }
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-purple-50/50 hover:bg-purple-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md ${fieldErrors.chantingSince
                      ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                      : 'border-purple-100 focus:ring-purple-500 focus:border-purple-500'
                      }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">Future dates are not allowed</p>
                  {fieldErrors.chantingSince && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.chantingSince}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="rounds" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    How many Rounds
                  </label>
                  <input
                    id="rounds"
                    type="number"
                    min="0"
                    value={formData.rounds}
                    onChange={(e) => setFormData({ ...formData, rounds: e.target.value })}
                    placeholder="Enter number of rounds"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-purple-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-purple-50/50 hover:bg-purple-50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md"
                  />
                </div>

                {/* Ashram */}
                <div>
                  <label htmlFor="ashram" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Ashram <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="ashram"
                    value={formData.ashram}
                    onChange={(e) => setFormData({ ...formData, ashram: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-purple-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-purple-50/50 hover:bg-purple-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTYgOUwxMiAxNUwxOCA5IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGlub2pvaW49InJvdW5kIi8+Cjwvc3ZnPg==')] bg-[length:16px] sm:bg-[length:20px] bg-[right_0.75rem_center] sm:bg-[right_1rem_center] bg-no-repeat cursor-pointer"
                  >
                    <option value="">Select Ashram</option>
                    <option value="Gauranga Sabha">Gauranga Sabha</option>
                    <option value="Nityananda Sabha">Nityananda Sabha</option>
                    <option value="Grihastha Ashram">Grihastha Ashram</option>
                    <option value="Brahmachari Ashram">Brahmachari Ashram</option>
                    <option value="Not Decided">Not Decided</option>
                  </select>
                  {fieldErrors.ashram && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.ashram}</p>
                  )}
                </div>

                {/* Royal Member */}
                <div>
                  <label htmlFor="royalMember" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Royal Member <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="royalMember"
                    value={formData.royalMember}
                    onChange={(e) => setFormData({ ...formData, royalMember: e.target.value as 'yes' | 'no' | '' })}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-purple-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-purple-50/50 hover:bg-purple-50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTYgOUwxMiAxNUwxOCA5IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGlub2pvaW49InJvdW5kIi8+Cjwvc3ZnPg==')] bg-[length:16px] sm:bg-[length:20px] bg-[right_0.75rem_center] sm:bg-[right_1rem_center] bg-no-repeat cursor-pointer"
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  {fieldErrors.royalMember && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.royalMember}</p>
                  )}
                </div>

                {/* Brahmachari Counselor */}
                <div className="sm:col-span-2 lg:col-span-1 relative" style={{ zIndex: 1000 }}>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="brahmachariCounselor" className="block text-xs sm:text-sm font-semibold text-gray-700">
                      Brahmachari Counselor <span className="text-red-500">*</span>
                    </label>
                    {!showAddBrahmachariCounselor && (
                      <button
                        type="button"
                        onClick={() => setShowAddBrahmachariCounselor(true)}
                        className="text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 hover:underline transition-all"
                      >
                        <Plus className="h-3 w-3" />
                        Add New
                      </button>
                    )}
                  </div>
                  {!showAddBrahmachariCounselor ? (
                    <div className="relative" style={{ zIndex: 1000 }}>
                      <input
                        ref={brahmachariCounselorInputRef}
                        type="text"
                        id="brahmachariCounselor"
                        value={brahmachariCounselorSearch}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          setBrahmachariCounselorSearch(sanitized);
                          setCurrentCounselorType('brahmachari');

                          if (formData.brahmachariCounselor && sanitized !== formData.brahmachariCounselor) {
                            setFormData(prev => ({ ...prev, brahmachariCounselor: '' }));
                          } else if (!sanitized) {
                            setFormData(prev => ({ ...prev, brahmachariCounselor: '' }));
                          }

                          if (sanitized && brahmachariCounselorInputRef.current) {
                            const rect = brahmachariCounselorInputRef.current.getBoundingClientRect();
                            setDropdownPosition({
                              top: rect.bottom + 8,
                              left: rect.left,
                              width: rect.width,
                            });
                            setShowCounselorDropdown(true);
                          } else {
                            setShowCounselorDropdown(false);
                            setDropdownPosition(null);
                          }

                          if (fieldErrors.brahmachariCounselor) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.brahmachariCounselor;
                              return newErrors;
                            });
                          }
                        }}
                        onFocus={(e) => {
                          if (brahmachariCounselorInputRef.current) {
                            const rect = brahmachariCounselorInputRef.current.getBoundingClientRect();
                            setDropdownPosition({
                              top: rect.bottom + 8,
                              left: rect.left,
                              width: rect.width,
                            });
                          }
                          setCurrentCounselorType('brahmachari');
                          if (!brahmachariCounselorSearch && !formData.brahmachariCounselor) {
                            getCounselorsFromLocal('', 'Brahmachari Ashram').then(counselors => {
                              setAvailableBrahmachariCounselors(counselors);
                              setShowCounselorDropdown(true);
                            });
                          } else {
                            setShowCounselorDropdown(true);
                            getCounselorsFromLocal(brahmachariCounselorSearch, 'Brahmachari Ashram').then(counselors => {
                              setAvailableBrahmachariCounselors(counselors);
                            });
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowCounselorDropdown(false);
                            setDropdownPosition(null);
                            if (formData.brahmachariCounselor && formData.brahmachariCounselor.trim()) {
                              const validation = validateTextInput(formData.brahmachariCounselor, 'Brahmachari Counselor', 100);
                              if (!validation.valid) {
                                setFieldErrors(prev => ({ ...prev, brahmachariCounselor: validation.error || 'Invalid counselor name' }));
                              }
                            }
                          }, 200);
                        }}
                        placeholder={formData.brahmachariCounselor ? formData.brahmachariCounselor : "Search Brahmachari counselor by name..."}
                        required
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-purple-50/50 hover:bg-purple-50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md ${fieldErrors.brahmachariCounselor
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-purple-100 focus:ring-purple-500 focus:border-purple-500'
                          }`}
                      />
                      {fieldErrors.brahmachariCounselor && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.brahmachariCounselor}</p>
                      )}
                      {typeof window !== 'undefined' && showCounselorDropdown && dropdownPosition && currentCounselorType === 'brahmachari' && createPortal(
                        <div
                          className="fixed z-[99999] max-h-48 overflow-y-auto border-2 border-purple-300 rounded-xl bg-white shadow-2xl text-sm animate-fadeIn"
                          style={{
                            zIndex: 99999,
                            position: 'fixed',
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            width: `${Math.min(dropdownPosition.width, typeof window !== 'undefined' ? window.innerWidth - 32 : 400)}px`,
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                          }}
                        >
                          {loadingBrahmachariCounselors ? (
                            <div className="p-3 sm:p-4 text-sm text-gray-500 flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                              Loading...
                            </div>
                          ) : availableBrahmachariCounselors.length > 0 ? (
                            availableBrahmachariCounselors.map(counselor => (
                              <button
                                key={counselor.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                }}
                                onClick={() => {
                                  const sanitizedCounselor = sanitizeTextInput(counselor.name);
                                  setFormData(prev => ({
                                    ...prev,
                                    brahmachariCounselor: sanitizedCounselor,
                                    brahmachariCounselorEmail: counselor.email
                                  }));
                                  setBrahmachariCounselorSearch(sanitizedCounselor);
                                  setShowCounselorDropdown(false);
                                  setDropdownPosition(null);
                                  setCurrentCounselorType(null);
                                }}
                                className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition-all duration-200 text-xs sm:text-sm transform hover:scale-[1.02] hover:translate-x-1 hover:shadow-sm"
                              >
                                <div className="font-semibold text-gray-900">{counselor.name}</div>
                                <div className="text-xs text-purple-600 mt-0.5">📍 {counselor.city}</div>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 sm:p-4 text-xs sm:text-sm text-gray-500">No Brahmachari counselors found.</div>
                          )}
                        </div>,
                        document.body
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-purple-200 rounded-lg sm:rounded-xl p-3 bg-purple-50 animate-fadeInUp shadow-inner space-y-2 relative" style={{ zIndex: 1000 }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-800">Add New Counselor</span>
                        <button onClick={(e) => { e.preventDefault(); setShowAddBrahmachariCounselor(false); setNewBrahmachariCounselor({ name: '', mobile: '', email: '', city: '' }); }} className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-1 hover:bg-gray-100 transition-colors"><X className="h-3 w-3" /></button>
                      </div>
                      <input
                        type="text"
                        value={newBrahmachariCounselor.name}
                        onChange={(e) => setNewBrahmachariCounselor({ ...newBrahmachariCounselor, name: e.target.value })}
                        placeholder="Name*"
                        className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                      {counselorFieldErrors.name && <p className="text-xs text-red-600">{counselorFieldErrors.name}</p>}

                      <input
                        type="tel"
                        value={newBrahmachariCounselor.mobile}
                        onChange={(e) => setNewBrahmachariCounselor({ ...newBrahmachariCounselor, mobile: e.target.value })}
                        placeholder="Mobile Number*"
                        className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                      {counselorFieldErrors.mobile && <p className="text-xs text-red-600">{counselorFieldErrors.mobile}</p>}

                      <input
                        type="email"
                        value={newBrahmachariCounselor.email}
                        onChange={(e) => setNewBrahmachariCounselor({ ...newBrahmachariCounselor, email: e.target.value })}
                        placeholder="Email (lowercase)*"
                        className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                      {counselorFieldErrors.email && <p className="text-xs text-red-600">{counselorFieldErrors.email}</p>}

                      <input
                        type="text"
                        value={newBrahmachariCounselor.city}
                        onChange={(e) => setNewBrahmachariCounselor({ ...newBrahmachariCounselor, city: e.target.value })}
                        placeholder="Temple Connected To*"
                        className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                      {counselorFieldErrors.city && <p className="text-xs text-red-600">{counselorFieldErrors.city}</p>}

                      <button
                        onClick={handleAddBrahmachariCounselor}
                        disabled={addingBrahmachariCounselor}
                        type="button"
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {addingBrahmachariCounselor ? 'Adding...' : 'Add Counselor'}
                      </button>
                    </div>
                  )}
                  {formData.brahmachariCounselor && (
                    <div className="mt-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-xs text-purple-800 flex items-center gap-2">
                        <span className="font-semibold">✓ Selected:</span>
                        <span className="break-words">{formData.brahmachariCounselor}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Grihastha Counselor (Optional) */}
                <div className="sm:col-span-2 lg:col-span-1 relative" style={{ zIndex: 999 }}>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="grihasthaCounselor" className="block text-xs font-medium text-gray-700">
                      Grihastha Counselor <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    {!showAddGrihasthaCounselor && (
                      <button
                        type="button"
                        onClick={() => setShowAddGrihasthaCounselor(true)}
                        className="text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 hover:underline transition-all"
                      >
                        <Plus className="h-3 w-3" />
                        Add New
                      </button>
                    )}
                  </div>
                  {!showAddGrihasthaCounselor ? (
                    <div className="relative" style={{ zIndex: 999 }}>
                      <input
                        ref={grihasthaCounselorInputRef}
                        type="text"
                        id="grihasthaCounselor"
                        value={grihasthaCounselorSearch}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          setGrihasthaCounselorSearch(sanitized);

                          if (formData.grihasthaCounselor && sanitized !== formData.grihasthaCounselor) {
                            setFormData(prev => ({ ...prev, grihasthaCounselor: '' }));
                          } else if (!sanitized) {
                            setFormData(prev => ({ ...prev, grihasthaCounselor: '' }));
                          }

                          if (sanitized && grihasthaCounselorInputRef.current) {
                            const rect = grihasthaCounselorInputRef.current.getBoundingClientRect();
                            setDropdownPosition({
                              top: rect.bottom + 8,
                              left: rect.left,
                              width: rect.width,
                            });
                            setShowCounselorDropdown(true);
                            setCurrentCounselorType('grihastha');
                          } else {
                            setShowCounselorDropdown(false);
                            setDropdownPosition(null);
                            setCurrentCounselorType(null);
                          }
                        }}
                        onFocus={() => {
                          if (grihasthaCounselorInputRef.current) {
                            const rect = grihasthaCounselorInputRef.current.getBoundingClientRect();
                            setDropdownPosition({
                              top: rect.bottom + 8,
                              left: rect.left,
                              width: rect.width,
                            });
                          }
                          setCurrentCounselorType('grihastha');
                          if (!grihasthaCounselorSearch && !formData.grihasthaCounselor) {
                            getCounselorsFromLocal('', 'Grihastha Ashram').then(counselors => {
                              setAvailableGrihasthaCounselors(counselors);
                              setShowCounselorDropdown(true);
                            });
                          } else {
                            setShowCounselorDropdown(true);
                            getCounselorsFromLocal(grihasthaCounselorSearch, 'Grihastha Ashram').then(counselors => {
                              setAvailableGrihasthaCounselors(counselors);
                            });
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowCounselorDropdown(false);
                            setDropdownPosition(null);
                            setCurrentCounselorType(null);
                          }, 200);
                        }}
                        placeholder={formData.grihasthaCounselor ? formData.grihasthaCounselor : "Search Grihastha counselor by name..."}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-purple-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-purple-50/50 hover:bg-purple-50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md"
                      />
                      {typeof window !== 'undefined' && showCounselorDropdown && dropdownPosition && currentCounselorType === 'grihastha' && createPortal(
                        <div
                          className="fixed z-[99998] max-h-48 overflow-y-auto border-2 border-purple-300 rounded-xl bg-white shadow-2xl text-sm animate-fadeIn"
                          style={{
                            zIndex: 99998,
                            position: 'fixed',
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            width: `${Math.min(dropdownPosition.width, typeof window !== 'undefined' ? window.innerWidth - 32 : 400)}px`,
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                          }}
                        >
                          {loadingGrihasthaCounselors ? (
                            <div className="p-3 sm:p-4 text-sm text-gray-500 flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                              Loading...
                            </div>
                          ) : availableGrihasthaCounselors.length > 0 ? (
                            availableGrihasthaCounselors.map(counselor => (
                              <button
                                key={counselor.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                }}
                                onClick={() => {
                                  const sanitizedCounselor = sanitizeTextInput(counselor.name);
                                  setFormData(prev => ({
                                    ...prev,
                                    grihasthaCounselor: sanitizedCounselor,
                                    grihasthaCounselorEmail: counselor.email
                                  }));
                                  setGrihasthaCounselorSearch(sanitizedCounselor);
                                  setShowCounselorDropdown(false);
                                  setDropdownPosition(null);
                                  setCurrentCounselorType(null);
                                }}
                                className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition-all duration-200 text-xs sm:text-sm transform hover:scale-[1.02] hover:translate-x-1 hover:shadow-sm"
                              >
                                <div className="font-semibold text-gray-900">{counselor.name}</div>
                                <div className="text-xs text-purple-600 mt-0.5">📍 {counselor.city}</div>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 sm:p-4 text-xs sm:text-sm text-gray-500">No Grihastha counselors found.</div>
                          )}
                        </div>,
                        document.body
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-purple-200 rounded-lg sm:rounded-xl p-3 bg-purple-50 animate-fadeInUp shadow-inner space-y-2 relative" style={{ zIndex: 999 }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-800">Add New Counselor</span>
                        <button onClick={(e) => { e.preventDefault(); setShowAddGrihasthaCounselor(false); setNewGrihasthaCounselor({ name: '', mobile: '', email: '', city: '' }); }} className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-1 hover:bg-gray-100 transition-colors"><X className="h-3 w-3" /></button>
                      </div>
                      <input
                        type="text"
                        value={newGrihasthaCounselor.name}
                        onChange={(e) => setNewGrihasthaCounselor({ ...newGrihasthaCounselor, name: e.target.value })}
                        placeholder="Name*"
                        className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                      {counselorFieldErrors.name && <p className="text-xs text-red-600">{counselorFieldErrors.name}</p>}

                      <input
                        type="tel"
                        value={newGrihasthaCounselor.mobile}
                        onChange={(e) => setNewGrihasthaCounselor({ ...newGrihasthaCounselor, mobile: e.target.value })}
                        placeholder="Mobile Number*"
                        className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                      {counselorFieldErrors.mobile && <p className="text-xs text-red-600">{counselorFieldErrors.mobile}</p>}

                      <input
                        type="email"
                        value={newGrihasthaCounselor.email}
                        onChange={(e) => setNewGrihasthaCounselor({ ...newGrihasthaCounselor, email: e.target.value })}
                        placeholder="Email (lowercase)*"
                        className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                      {counselorFieldErrors.email && <p className="text-xs text-red-600">{counselorFieldErrors.email}</p>}

                      <input
                        type="text"
                        value={newGrihasthaCounselor.city}
                        onChange={(e) => setNewGrihasthaCounselor({ ...newGrihasthaCounselor, city: e.target.value })}
                        placeholder="Temple Connected To*"
                        className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                      />
                      {counselorFieldErrors.city && <p className="text-xs text-red-600">{counselorFieldErrors.city}</p>}

                      <button
                        onClick={handleAddGrihasthaCounselor}
                        disabled={addingGrihasthaCounselor}
                        type="button"
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {addingGrihasthaCounselor ? 'Adding...' : 'Add Counselor'}
                      </button>
                    </div>
                  )}
                  {formData.grihasthaCounselor && (
                    <div className="mt-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-xs text-purple-800 flex items-center gap-2">
                        <span className="font-semibold">✓ Selected:</span>
                        <span className="break-words">{formData.grihasthaCounselor}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Education Section Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1 relative z-10" style={{ zIndex: 10 }}>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative z-10">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    Education
                  </h2>
                  <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11">
                    Enter your higher education details (up to 5 entries)
                  </p>
                </div>
                {education.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEducation(prev => [...prev, { institution: '', field: '', year: null }]);
                    }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-300 hover:scale-110 hover:rotate-2 active:scale-95 whitespace-nowrap transform shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 transform transition-transform duration-300 group-hover:rotate-90" />
                    Add Education
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {education.map((edu, index) => (
                <div key={index} className="animate-fadeInUp group relative p-4 sm:p-5 border-2 border-amber-100 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 hover:border-amber-300 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg">
                        {index + 1}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 transform transition-all duration-200 group-hover:translate-x-1">Education Entry {index + 1}</h3>
                    </div>
                    {education.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setEducation(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 transform hover:scale-110 hover:rotate-90 active:scale-95"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        🏛️ Institution/University
                      </label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          const updated = [...education];
                          updated[index] = { ...updated[index], institution: sanitized };
                          setEducation(updated);
                          // Clear error when user starts typing
                          if (fieldErrors[`edu_${index}_institution`]) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`edu_${index}_institution`];
                              return newErrors;
                            });
                          }
                        }}
                        onBlur={() => {
                          if (edu.institution && edu.institution.trim()) {
                            const validation = validateEducationField(edu.institution, `Education ${index + 1} - Institution`);
                            if (!validation.valid) {
                              setFieldErrors(prev => ({ ...prev, [`edu_${index}_institution`]: validation.error || 'Invalid text' }));
                            }
                          }
                        }}
                        placeholder="e.g., University of Delhi"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-white hover:bg-gray-50 transition-all duration-200 ${fieldErrors[`edu_${index}_institution`]
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                          }`}
                      />
                      {fieldErrors[`edu_${index}_institution`] && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                          <X className="h-2 w-2" />
                          {fieldErrors[`edu_${index}_institution`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        🎓 Field/Degree
                      </label>
                      <input
                        type="text"
                        value={edu.field}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          const updated = [...education];
                          updated[index] = { ...updated[index], field: sanitized };
                          setEducation(updated);
                          // Clear error when user starts typing
                          if (fieldErrors[`edu_${index}_field`]) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`edu_${index}_field`];
                              return newErrors;
                            });
                          }
                        }}
                        onBlur={() => {
                          if (edu.field && edu.field.trim()) {
                            const validation = validateEducationField(edu.field, `Education ${index + 1} - Field`);
                            if (!validation.valid) {
                              setFieldErrors(prev => ({ ...prev, [`edu_${index}_field`]: validation.error || 'Invalid text' }));
                            }
                          }
                        }}
                        placeholder="e.g., B.Tech Computer Science"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-white hover:bg-gray-50 transition-all duration-200 ${fieldErrors[`edu_${index}_field`]
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                          }`}
                      />
                      {fieldErrors[`edu_${index}_field`] && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                          <X className="h-2 w-2" />
                          {fieldErrors[`edu_${index}_field`]}
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        📅 Year
                      </label>
                      <input
                        type="number"
                        value={edu.year || ''}
                        onChange={(e) => {
                          const updated = [...education];
                          updated[index] = { ...updated[index], year: e.target.value ? parseInt(e.target.value) : null };
                          setEducation(updated);
                        }}
                        placeholder="e.g., 2020"
                        min="1900"
                        max={new Date().getFullYear() + 5}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white hover:bg-gray-50 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Work Experience Section Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative z-10">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    Work Experience
                  </h2>
                  <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11">
                    Enter your professional work experience (up to 5 entries)
                  </p>
                </div>
                {workExperience.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      setWorkExperience(prev => [...prev, { company: '', position: '', startDate: null, endDate: null, current: false }]);
                    }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-300 hover:scale-110 hover:rotate-2 active:scale-95 whitespace-nowrap transform shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 transform transition-transform duration-300 group-hover:rotate-90" />
                    Add Work Experience
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {workExperience.map((work, index) => (
                <div key={index} className="animate-fadeInUp group relative p-4 sm:p-5 border-2 border-indigo-100 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg">
                        {index + 1}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 transform transition-all duration-200 group-hover:translate-x-1">Work Experience {index + 1}</h3>
                    </div>
                    {workExperience.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setWorkExperience(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 transform hover:scale-110 hover:rotate-90 active:scale-95"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 transform transition-all duration-200 group-hover:translate-x-1">
                        🏢 Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={work.company}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          const updated = [...workExperience];
                          updated[index] = { ...updated[index], company: sanitized };
                          setWorkExperience(updated);
                          // Clear error when user starts typing
                          if (fieldErrors[`work_${index}_company`]) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`work_${index}_company`];
                              return newErrors;
                            });
                          }
                        }}
                        onBlur={() => {
                          if (work.company && work.company.trim()) {
                            const validation = validateWorkField(work.company, `Work ${index + 1} - Company`);
                            if (!validation.valid) {
                              setFieldErrors(prev => ({ ...prev, [`work_${index}_company`]: validation.error || 'Invalid text' }));
                            }
                          }
                        }}
                        placeholder="e.g., Google Inc."
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-white hover:bg-indigo-50/50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md ${fieldErrors[`work_${index}_company`]
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-indigo-100 focus:ring-indigo-500 focus:border-indigo-500'
                          }`}
                      />
                      {fieldErrors[`work_${index}_company`] && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                          <X className="h-2 w-2" />
                          {fieldErrors[`work_${index}_company`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 transform transition-all duration-200 group-hover:translate-x-1">
                        💼 Position/Role
                      </label>
                      <input
                        type="text"
                        value={work.position}
                        onChange={(e) => {
                          const sanitized = sanitizeTextInput(e.target.value);
                          const updated = [...workExperience];
                          updated[index] = { ...updated[index], position: sanitized };
                          setWorkExperience(updated);
                          // Clear error when user starts typing
                          if (fieldErrors[`work_${index}_position`]) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`work_${index}_position`];
                              return newErrors;
                            });
                          }
                        }}
                        onBlur={() => {
                          if (work.position && work.position.trim()) {
                            const validation = validateWorkField(work.position, `Work ${index + 1} - Position`);
                            if (!validation.valid) {
                              setFieldErrors(prev => ({ ...prev, [`work_${index}_position`]: validation.error || 'Invalid text' }));
                            }
                          }
                        }}
                        placeholder="e.g., Software Engineer"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 rounded-lg sm:rounded-xl focus:ring-2 text-gray-900 bg-white hover:bg-indigo-50/50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md ${fieldErrors[`work_${index}_position`]
                          ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                          : 'border-indigo-100 focus:ring-indigo-500 focus:border-indigo-500'
                          }`}
                      />
                      {fieldErrors[`work_${index}_position`] && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-fadeIn">
                          <X className="h-2 w-2" />
                          {fieldErrors[`work_${index}_position`]}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 transform transition-all duration-200 group-hover:translate-x-1">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600 transform transition-all duration-200 group-hover:scale-110" />
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={work.startDate || ''}
                        onChange={(e) => {
                          const updated = [...workExperience];
                          updated[index] = { ...updated[index], startDate: e.target.value || null };
                          setWorkExperience(updated);
                        }}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-indigo-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white hover:bg-indigo-50/50 transition-all duration-300 focus:scale-[1.02] focus:shadow-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 transform transition-all duration-200 group-hover:translate-x-1">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600 transform transition-all duration-200 group-hover:scale-110" />
                        End Date
                      </label>
                      <input
                        type="date"
                        value={work.endDate || ''}
                        onChange={(e) => {
                          const updated = [...workExperience];
                          updated[index] = { ...updated[index], endDate: e.target.value || null, current: false };
                          setWorkExperience(updated);
                        }}
                        disabled={work.current}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-indigo-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white hover:bg-indigo-50/50 transition-all duration-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 focus:scale-[1.02] focus:shadow-md"
                      />
                    </div>
                    <div className="flex items-end sm:col-span-2 lg:col-span-1">
                      <label className="flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 border-2 border-indigo-100 rounded-lg sm:rounded-xl hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer w-full transition-all duration-300 bg-white transform hover:scale-[1.02]">
                        <input
                          type="checkbox"
                          checked={work.current}
                          onChange={(e) => {
                            const updated = [...workExperience];
                            updated[index] = { ...updated[index], current: e.target.checked, endDate: e.target.checked ? null : updated[index].endDate };
                            setWorkExperience(updated);
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className="text-xs sm:text-sm font-semibold text-gray-700">✓ Currently working here</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Camps Section Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3 relative z-10">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                Camps Completed
              </h2>
              <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11 relative z-10">
                Mark the camps you have successfully completed
              </p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { key: 'campDys', label: 'DYS', emoji: '🎓' },
                  { key: 'campSankalpa', label: 'Sankalpa', emoji: '🌱' },
                  { key: 'campSphurti', label: 'Sphurti', emoji: '⚡' },
                  { key: 'campUtkarsh', label: 'Utkarsh', emoji: '🚀' },
                  { key: 'campFaithAndDoubt', label: 'Faith and Doubt', emoji: '🤔' },
                  { key: 'campSrcgdWorkshop', label: 'SRCGD Workshop', emoji: '🎯' },
                  { key: 'campNistha', label: 'Nistha', emoji: '💎' },
                  { key: 'campAshray', label: 'Ashray', emoji: '🛡️' },
                ].map((camp, index) => (
                  <label
                    key={camp.key}
                    className={`group flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[camp.key as keyof typeof formData] as boolean
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg ring-2 ring-emerald-200 scale-105'
                      : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md'
                      }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <input
                      type="checkbox"
                      checked={formData[camp.key as keyof typeof formData] as boolean}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          [camp.key]: e.target.checked,
                        }));
                      }}
                      className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                    />
                    <span className={`text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-2 flex-1 transform transition-all duration-200 group-hover:translate-x-1 ${formData[camp.key as keyof typeof formData] as boolean
                      ? 'text-emerald-800'
                      : 'text-gray-700 group-hover:text-emerald-700'
                      }`}>
                      <span className="text-base sm:text-lg transform transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">{camp.emoji}</span>
                      {camp.label}
                    </span>
                    {formData[camp.key as keyof typeof formData] as boolean && (
                      <span className="ml-auto text-emerald-600 text-sm sm:text-base flex-shrink-0 animate-scaleIn transform transition-all duration-300">
                        ✓
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SP Books Study Course Section Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3 relative z-10">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                SP Books Study Course
              </h2>
              <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11 relative z-10">
                Track your progress through the systematic study course
              </p>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Third Semester */}
              <div className="animate-on-scroll relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 rounded-xl sm:rounded-2xl border-2 border-blue-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-blue-200/30 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-cyan-200/30 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 transform transition-all duration-300 hover:scale-105">
                      <span className="px-2 sm:px-3 py-1 bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">3rd</span>
                      <span className="text-sm sm:text-base lg:text-lg">Third Semester</span>
                    </h3>
                    <span className="px-2 sm:px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap transform transition-all duration-300 hover:scale-110">
                      📚 3.5 hrs/week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { key: 'spbookThirdSsr15', label: 'Science of Self Realisation (Chapters 1-5)' },
                      { key: 'spbookThirdComingBack', label: 'Coming Back' },
                      { key: 'spbookThirdPqpa', label: 'Perfect Questions and Perfect Answers' },
                      { key: 'spbookThirdMatchlessGift', label: 'Matchless Gift' },
                      { key: 'spbookThirdRajaVidya', label: 'Raja Vidya' },
                      { key: 'spbookThirdElevationKc', label: 'Elevation to KC' },
                      { key: 'spbookThirdBeyondBirthDeath', label: 'Beyond Birth and Death' },
                      { key: 'spbookThirdKrishnaReservoir', label: 'Krishna – the reservoir of all Pleasure' },
                    ].map((book, index) => (
                      <label
                        key={book.key}
                        className={`group flex items-start space-x-2 p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'border-blue-500 bg-blue-100 shadow-lg ring-2 ring-blue-200 scale-105'
                          : 'border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50 hover:shadow-md'
                          }`}
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData[book.key as keyof typeof formData] as boolean}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [book.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-0.5 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className={`text-xs font-medium flex-1 leading-relaxed transform transition-all duration-200 group-hover:translate-x-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'text-blue-900'
                          : 'text-gray-700 group-hover:text-blue-800'
                          }`}>
                          {book.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fourth Semester */}
              <div className="animate-on-scroll relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 rounded-xl sm:rounded-2xl border-2 border-green-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-green-200/30 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-emerald-200/30 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 transform transition-all duration-300 hover:scale-105">
                      <span className="px-2 sm:px-3 py-1 bg-green-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">4th</span>
                      <span className="text-sm sm:text-base lg:text-lg">Fourth Semester</span>
                    </h3>
                    <span className="px-2 sm:px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap transform transition-all duration-300 hover:scale-110">
                      📚 4 hrs/week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { key: 'spbookFourthSsr68', label: 'Science of Self Realisation (Chapters 6-8)' },
                      { key: 'spbookFourthLawsOfNature', label: 'Laws of Nature' },
                      { key: 'spbookFourthDharma', label: 'Dharma' },
                      { key: 'spbookFourthSecondChance', label: 'Second chance book' },
                      { key: 'spbookFourthIsopanishad110', label: 'Isopanishad Mantra (Mantra 1-10)' },
                      { key: 'spbookFourthQueenKuntiVideo', label: 'Teachings of Queen Kunti (see SP Video)' },
                      { key: 'spbookFourthEnlightenmentNatural', label: 'Enlightenment by Natural Path' },
                      { key: 'spbookFourthKrishnaBook121', label: 'Krishna Book (Chapters 1-21)' },
                    ].map((book, index) => (
                      <label
                        key={book.key}
                        className={`group flex items-start space-x-2 p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'border-green-500 bg-green-100 shadow-lg ring-2 ring-green-200 scale-105'
                          : 'border-green-200 bg-white hover:border-green-400 hover:bg-green-50 hover:shadow-md'
                          }`}
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData[book.key as keyof typeof formData] as boolean}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [book.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2 mt-0.5 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className={`text-xs font-medium flex-1 leading-relaxed transform transition-all duration-200 group-hover:translate-x-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'text-green-900'
                          : 'text-gray-700 group-hover:text-green-800'
                          }`}>
                          {book.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fifth Semester */}
              <div className="animate-on-scroll relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 rounded-xl sm:rounded-2xl border-2 border-purple-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-purple-200/30 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-violet-200/30 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 transform transition-all duration-300 hover:scale-105">
                      <span className="px-2 sm:px-3 py-1 bg-purple-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">5th</span>
                      <span className="text-sm sm:text-base lg:text-lg">Fifth Semester</span>
                    </h3>
                    <span className="px-2 sm:px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap transform transition-all duration-300 hover:scale-110">
                      📚 4.5 hrs/week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { key: 'spbookFifthLifeFromLife', label: 'Life comes from Life' },
                      { key: 'spbookFifthPrahladTeachings', label: 'Teachings of Prahlad maharaja' },
                      { key: 'spbookFifthJourneySelfDiscovery', label: 'Journey of Self Discovery' },
                      { key: 'spbookFifthQueenKuntiHearing', label: 'Teachings of Queen Kunti (only hearing RSP classes)' },
                      { key: 'spbookFifthLordKapila', label: 'Teachings of Lord Kapila' },
                      { key: 'spbookFifthNectar16', label: 'Nectar of Instruction (Text 1-6)' },
                      { key: 'spbookFifthGita16', label: 'Bhagavad gita As It Is (Chapters 1-6)' },
                      { key: 'spbookFifthKrishnaBook2428', label: 'Krishna Book (Chapters 24-28)' },
                    ].map((book, index) => (
                      <label
                        key={book.key}
                        className={`group flex items-start space-x-2 p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'border-purple-500 bg-purple-100 shadow-lg ring-2 ring-purple-200 scale-105'
                          : 'border-purple-200 bg-white hover:border-purple-400 hover:bg-purple-50 hover:shadow-md'
                          }`}
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData[book.key as keyof typeof formData] as boolean}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [book.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 mt-0.5 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className={`text-xs font-medium flex-1 leading-relaxed transform transition-all duration-200 group-hover:translate-x-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'text-purple-900'
                          : 'text-gray-700 group-hover:text-purple-800'
                          }`}>
                          {book.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sixth Semester */}
              <div className="animate-on-scroll relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 rounded-xl sm:rounded-2xl border-2 border-amber-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-amber-200/30 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-yellow-200/30 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 transform transition-all duration-300 hover:scale-105">
                      <span className="px-2 sm:px-3 py-1 bg-amber-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">6th</span>
                      <span className="text-sm sm:text-base lg:text-lg">Sixth Semester</span>
                    </h3>
                    <span className="px-2 sm:px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap transform transition-all duration-300 hover:scale-110">
                      📚 5 hrs/week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { key: 'spbookSixthNectar711', label: 'Nectar of Instruction (Text 7-11)' },
                      { key: 'spbookSixthPathPerfection', label: 'Path of Perfection' },
                      { key: 'spbookSixthCivilisationTranscendence', label: 'Civilisation and Transcendence' },
                      { key: 'spbookSixthHareKrishnaChallenge', label: 'Hare Krishna Challenge' },
                      { key: 'spbookSixthGita712', label: 'Bhagavad gita As It Is (Chapters 7-12)' },
                      { key: 'spbookSixthSb1stCanto16', label: 'Srimad Bhagavatam 1st canto (Chapters 1-6)' },
                      { key: 'spbookSixthKrishnaBook3559', label: 'Krishna Book (Chapters 35-59)' },
                    ].map((book, index) => (
                      <label
                        key={book.key}
                        className={`group flex items-start space-x-2 p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'border-amber-500 bg-amber-100 shadow-lg ring-2 ring-amber-200 scale-105'
                          : 'border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-50 hover:shadow-md'
                          }`}
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData[book.key as keyof typeof formData] as boolean}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [book.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500 focus:ring-2 mt-0.5 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className={`text-xs font-medium flex-1 leading-relaxed transform transition-all duration-200 group-hover:translate-x-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'text-amber-900'
                          : 'text-gray-700 group-hover:text-amber-800'
                          }`}>
                          {book.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Seventh Semester */}
              <div className="animate-on-scroll relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100 rounded-xl sm:rounded-2xl border-2 border-indigo-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-indigo-200/30 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-blue-200/30 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 transform transition-all duration-300 hover:scale-105">
                      <span className="px-2 sm:px-3 py-1 bg-indigo-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">7th</span>
                      <span className="text-sm sm:text-base lg:text-lg">Seventh Semester</span>
                    </h3>
                    <span className="px-2 sm:px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap transform transition-all duration-300 hover:scale-110">
                      📚 5 hrs/week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { key: 'spbookSeventhGita1318', label: 'Bhagavad gita As It Is (Chapters 13-18)' },
                      { key: 'spbookSeventhSb1stCanto713', label: 'Srimad Bhagavatam 1st canto (Chapters 7-13)' },
                      { key: 'spbookSeventhKrishnaBook6378', label: 'Krishna Book (Chapters 63-78)' },
                    ].map((book, index) => (
                      <label
                        key={book.key}
                        className={`group flex items-start space-x-2 p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'border-indigo-500 bg-indigo-100 shadow-lg ring-2 ring-indigo-200 scale-105'
                          : 'border-indigo-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md'
                          }`}
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData[book.key as keyof typeof formData] as boolean}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [book.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 mt-0.5 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className={`text-xs font-medium flex-1 leading-relaxed transform transition-all duration-200 group-hover:translate-x-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'text-indigo-900'
                          : 'text-gray-700 group-hover:text-indigo-800'
                          }`}>
                          {book.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Eighth Semester */}
              <div className="animate-on-scroll relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 rounded-xl sm:rounded-2xl border-2 border-rose-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-rose-200/30 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 bg-pink-200/30 rounded-full -ml-8 -mb-8 sm:-ml-12 sm:-mb-12 animate-float" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 transform transition-all duration-300 hover:scale-105">
                      <span className="px-2 sm:px-3 py-1 bg-rose-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transform transition-all duration-300 hover:scale-110 hover:rotate-3">8th</span>
                      <span className="text-sm sm:text-base lg:text-lg">Eighth Semester</span>
                    </h3>
                    <span className="px-2 sm:px-3 py-1 bg-rose-600 text-white text-xs font-semibold rounded-full shadow-md whitespace-nowrap transform transition-all duration-300 hover:scale-110">
                      📚 5 hrs/week
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { key: 'spbookEighthSb1stCanto1419', label: 'Srimad Bhagavatam 1st canto (Chapters 14-19)' },
                      { key: 'spbookEighthKrishnaBook7889', label: 'Krishna Book (Chapters 78-89)' },
                    ].map((book, index) => (
                      <label
                        key={book.key}
                        className={`group flex items-start space-x-2 p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'border-rose-500 bg-rose-100 shadow-lg ring-2 ring-rose-200 scale-105'
                          : 'border-rose-200 bg-white hover:border-rose-400 hover:bg-rose-50 hover:shadow-md'
                          }`}
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <input
                          type="checkbox"
                          checked={formData[book.key as keyof typeof formData] as boolean}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [book.key]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 border-gray-300 rounded focus:ring-rose-500 focus:ring-2 mt-0.5 cursor-pointer flex-shrink-0 transform transition-all duration-200 checked:scale-110"
                        />
                        <span className={`text-xs font-medium flex-1 leading-relaxed transform transition-all duration-200 group-hover:translate-x-1 ${formData[book.key as keyof typeof formData] as boolean
                          ? 'text-rose-900'
                          : 'text-gray-700 group-hover:text-rose-800'
                          }`}>
                          {book.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Languages Section Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative z-10">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    Languages
                  </h2>
                  <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11">
                    Enter languages you know (up to 5 entries)
                  </p>
                </div>
                {languages.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      setLanguages(prev => [...prev, { name: '' }]);
                    }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-300 hover:scale-110 hover:rotate-2 active:scale-95 whitespace-nowrap transform shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 transform transition-transform duration-300 group-hover:rotate-90" />
                    Add Language
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {languages.map((lang, index) => (
                <div key={`lang-${index}`} className="animate-fadeInUp group relative p-4 sm:p-5 border-2 border-blue-100 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg">
                        {index + 1}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 transform transition-all duration-200 group-hover:translate-x-1">Language {index + 1}</h3>
                    </div>
                    {languages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setLanguages(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 transform hover:scale-110 hover:rotate-90 active:scale-95"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 transform transition-all duration-200 group-hover:translate-x-1">
                      🌐 Language Name
                    </label>
                    <input
                      type="text"
                      value={lang?.name ?? ''}
                      onChange={(e) => {
                        const sanitized = sanitizeTextInput(e.target.value);
                        setLanguages(prev => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], name: sanitized };
                          return updated;
                        });
                      }}
                      placeholder="e.g., English, Hindi, Sanskrit"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-blue-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white hover:bg-blue-50/50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Section Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative z-10">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    Skills
                  </h2>
                  <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11">
                    Enter your skills (up to 5 entries)
                  </p>
                </div>
                {skills.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSkills(prev => [...prev, { name: '' }]);
                    }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-300 hover:scale-110 hover:rotate-2 active:scale-95 whitespace-nowrap transform shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 transform transition-transform duration-300 group-hover:rotate-90" />
                    Add Skill
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {skills.map((skill, index) => (
                <div key={`skill-${index}`} className="animate-fadeInUp group relative p-4 sm:p-5 border-2 border-purple-100 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 hover:border-purple-300 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg">
                        {index + 1}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 transform transition-all duration-200 group-hover:translate-x-1">Skill {index + 1}</h3>
                    </div>
                    {skills.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSkills(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 transform hover:scale-110 hover:rotate-90 active:scale-95"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 transform transition-all duration-200 group-hover:translate-x-1">
                      💼 Skill Name
                    </label>
                    <input
                      type="text"
                      value={skill?.name ?? ''}
                      onChange={(e) => {
                        const sanitized = sanitizeTextInput(e.target.value);
                        setSkills(prev => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], name: sanitized };
                          return updated;
                        });
                      }}
                      placeholder="e.g., Programming, Teaching, Cooking"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-purple-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white hover:bg-purple-50/50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Services Rendered Section Card with Animations */}
          <div className="animate-on-scroll bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 sm:px-6 py-3 sm:py-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative z-10">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-sm transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    Services Rendered
                  </h2>
                  <p className="text-white/90 text-xs sm:text-sm mt-2 ml-8 sm:ml-11">
                    Enter services you have rendered (up to 5 entries)
                  </p>
                </div>
                {services.length < 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      setServices([...services, { name: '' }]);
                    }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all duration-300 hover:scale-110 hover:rotate-2 active:scale-95 whitespace-nowrap transform shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 transform transition-transform duration-300 group-hover:rotate-90" />
                    Add Service
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {services.map((service, index) => (
                <div key={`service-${index}`} className="animate-fadeInUp group relative p-4 sm:p-5 border-2 border-green-100 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-300 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg">
                        {index + 1}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 transform transition-all duration-200 group-hover:translate-x-1">Service {index + 1}</h3>
                    </div>
                    {services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setServices(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 transform hover:scale-110 hover:rotate-90 active:scale-95"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 transform transition-all duration-200 group-hover:translate-x-1">
                      🙏 Service Name
                    </label>
                    <input
                      type="text"
                      value={service?.name ?? ''}
                      onChange={(e) => {
                        const sanitized = sanitizeTextInput(e.target.value);
                        setServices(prev => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], name: sanitized };
                          return updated;
                        });
                      }}
                      placeholder="e.g., Temple Service, Kitchen Service, Book Distribution"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-green-100 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white hover:bg-green-50/50 transition-all duration-300 placeholder:text-gray-400 focus:scale-[1.02] focus:shadow-md"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button - Devotional Colors with Enhanced Animations */}
          <div className="flex justify-center pt-4 sm:pt-6 animate-on-scroll">
            <button
              type="submit"
              disabled={saving}
              className="group relative flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-white sm:bg-gradient-to-r sm:from-amber-500 sm:via-orange-400 sm:to-amber-600 text-blue-900 sm:text-white lg:text-blue-900 lg:font-bold rounded-lg sm:rounded-xl font-bold text-sm sm:text-base lg:text-lg shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden w-full sm:w-auto border-2 border-blue-600 sm:border-amber-300 ripple-effect"
            >
              <div className="absolute inset-0 sm:bg-gradient-to-r sm:from-amber-600 sm:to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-30"></div>
              <Save className="h-5 w-5 sm:h-6 sm:w-6 relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 drop-shadow-sm" />
              <span className="relative z-10 drop-shadow-sm text-center w-full">
                {saving ? (
                  <span className="flex items-center justify-center gap-2 w-full">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs sm:text-sm lg:text-base font-semibold">Saving Changes...</span>
                  </span>
                ) : (
                  <span className="text-xs sm:text-sm lg:text-base transform transition-all duration-300 group-hover:scale-105 font-semibold">Save All Changes</span>
                )}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Fixed Toast Notifications */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-4 w-full max-w-md pointer-events-none p-4">
        {error && (
          <div className="pointer-events-auto bg-white border-l-4 border-red-500 text-gray-800 px-6 py-4 rounded-xl shadow-2xl flex items-start gap-4 animate-slideInRight ring-1 ring-black/5">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-bold text-red-800 text-lg mb-1">Error</h3>
              <p className="text-sm text-gray-600 leading-relaxed break-words">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {success && (
          <div className="pointer-events-auto bg-white border-l-4 border-green-500 text-gray-800 px-6 py-4 rounded-xl shadow-2xl flex items-start gap-4 animate-slideInRight ring-1 ring-black/5">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-bold text-green-800 text-lg mb-1">Success</h3>
              <p className="text-sm text-gray-600 leading-relaxed break-words">{success}</p>
            </div>
            <button onClick={() => setSuccess('')} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Sticky Save Button - Floating Action Button Style */}
      <div className={`fixed bottom-6 right-6 z-40 transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${isDirty ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-32 opacity-0 scale-75 pointer-events-none'}`}>
        <button
          type="button"
          onClick={(e) => handleSubmit({ preventDefault: () => { } } as React.FormEvent)}
          disabled={saving}
          className="flex items-center gap-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-full shadow-2xl hover:shadow-[0_10px_30px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 font-bold text-sm sm:text-lg border-2 border-white/20 backdrop-blur-sm group"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <div className="relative">
              <Save className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-amber-600 animate-pulse"></span>
            </div>
          )}
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}
