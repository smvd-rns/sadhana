export type UserRole =
  | 'super_admin'
  | 'zonal_admin'
  | 'state_admin'
  | 'city_admin'
  | 'center_admin'
  | 'bc_voice_manager' // BC Voice Manager
  | 'voice_manager' // Voice Manager
  | 'senior_counselor'
  | 'counselor'
  | 'student'
  | 1 // student
  | 2 // counselor
  | 3 // voice_manager
  | 4 // bc_voice_manager
  | 5 // city_admin
  | 6 // state_admin
  | 7 // zonal_admin
  | 8; // super_admin

export type SpiritualLevel = 'beginner' | 'intermediate' | 'advanced';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole | UserRole[]; // Support both single role (backward compatible) and multiple roles
  phone?: string;
  profileImage?: string;
  birthDate?: string;
  hierarchy: HierarchyLocation;
  // Camp completion fields
  campDys?: boolean;
  campSankalpa?: boolean;
  campSphurti?: boolean;
  campUtkarsh?: boolean;
  campFaithAndDoubt?: boolean;
  campSrcgdWorkshop?: boolean;
  campNistha?: boolean;
  campAshray?: boolean;
  // SP Books Study Course fields
  spbookThirdSsr15?: boolean;
  spbookThirdComingBack?: boolean;
  spbookThirdPqpa?: boolean;
  spbookThirdMatchlessGift?: boolean;
  spbookThirdRajaVidya?: boolean;
  spbookThirdElevationKc?: boolean;
  spbookThirdBeyondBirthDeath?: boolean;
  spbookThirdKrishnaReservoir?: boolean;
  spbookFourthSsr68?: boolean;
  spbookFourthLawsOfNature?: boolean;
  spbookFourthDharma?: boolean;
  spbookFourthSecondChance?: boolean;
  spbookFourthIsopanishad110?: boolean;
  spbookFourthQueenKuntiVideo?: boolean;
  spbookFourthEnlightenmentNatural?: boolean;
  spbookFourthKrishnaBook121?: boolean;
  spbookFifthLifeFromLife?: boolean;
  spbookFifthPrahladTeachings?: boolean;
  spbookFifthJourneySelfDiscovery?: boolean;
  spbookFifthQueenKuntiHearing?: boolean;
  spbookFifthLordKapila?: boolean;
  spbookFifthNectar16?: boolean;
  spbookFifthGita16?: boolean;
  spbookFifthKrishnaBook2428?: boolean;
  spbookSixthNectar711?: boolean;
  spbookSixthPathPerfection?: boolean;
  spbookSixthCivilisationTranscendence?: boolean;
  spbookSixthHareKrishnaChallenge?: boolean;
  spbookSixthGita712?: boolean;
  spbookSixthSb1stCanto16?: boolean;
  spbookSixthKrishnaBook3559?: boolean;
  spbookSeventhGita1318?: boolean;
  spbookSeventhSb1stCanto713?: boolean;
  spbookSeventhKrishnaBook6378?: boolean;
  spbookEighthSb1stCanto1419?: boolean;
  spbookEighthKrishnaBook7889?: boolean;
  // Education fields (up to 5 entries)
  education?: EducationEntry[];
  // Work experience fields (up to 5 entries)
  workExperience?: WorkExperienceEntry[];
  // Language fields (up to 5 entries)
  languages?: LanguageEntry[];
  // Skills fields (up to 5 entries)
  skills?: SkillEntry[];
  // Services rendered fields (up to 5 entries)
  services?: ServiceEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EducationEntry {
  institution: string;
  field: string;
  year: number | null;
}

export interface WorkExperienceEntry {
  company: string;
  position: string;
  startDate: string | null; // ISO date string or null
  endDate: string | null; // ISO date string or null, null if current
  current: boolean; // true if currently working here
}

export interface LanguageEntry {
  name: string;
}

export interface SkillEntry {
  name: string;
}

export interface ServiceEntry {
  name: string;
}

export interface HierarchyLocation {
  zone?: string; // Geographic zone (for Zone Managers)
  state?: string;
  city?: string;
  center?: string;
  centerId?: string; // Center ID for accurate matching
  counselor?: string;
  counselorGroup?: string;
  brahmachariCounselor?: string;
  brahmachariCounselorEmail?: string;
  grihasthaCounselor?: string;
  grihasthaCounselorEmail?: string;
  // Fields for admin role assignments (which area they manage)
  assignedZone?: string; // For Zone Managers (role 7)
  assignedState?: string; // For State Managers (role 6)
  assignedCity?: string; // For City Managers (role 5)
  // Spiritual fields
  initiationStatus?: string;
  initiatedName?: string;
  spiritualMasterName?: string;
  aspiringSpiritualMasterName?: string;
  chantingSince?: string;
  rounds?: number;
  ashram?: string;
  royalMember?: boolean | string; // Allow string 'yes'/'no' for form handling
}

export interface SadhanaReport {
  id: string;
  userId: string;
  date: Date | string; // Date object or ISO string
  japa: number; // marks (0-10 per day, max 70 per week)
  hearing: number; // marks (0-10 per day, max 70 per week)
  reading: number; // marks (0-10 per day, max 70 per week)
  bookName?: string;
  toBed: number; // time or number
  wakeUp: number; // time or number
  dailyFilling: number;
  daySleep: number;
  bodyPercent: number; // calculated weekly (Mon-Sun): (toBed + wakeUp + dailyFilling + daySleep) / 280 * 100
  soulPercent: number; // calculated weekly (Mon-Sun): (japa + hearing + reading) / 210 * 100
  submittedAt: Date;
  updatedAt?: Date;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientIds: string[];
  recipientGroups?: string[];
  hierarchyLevel?: {
    zone?: string;
    state?: string;
    city?: string;
    center?: string;
    counselorGroup?: string;
  };
  subject: string;
  content: string;
  attachments?: string[];
  priority: 'normal' | 'urgent';
  category: 'spiritual' | 'administrative' | 'events';
  readBy: string[];
  createdAt: Date;
  scheduledFor?: Date;
  isBroadcast?: boolean;
  senderRole?: number;
  pinnedBy?: string[];
}

export interface Group {
  id: string;
  name: string;
  type: 'geographic' | 'institutional' | 'mentorship' | 'special_interest';
  hierarchy: HierarchyLocation;
  memberIds: string[];
  adminIds: string[];
  createdAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location?: string;
  hierarchyLevel: HierarchyLocation;
  registeredUsers: string[];
  attendance?: string[];
  createdAt: Date;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'scripture' | 'lecture' | 'study_material' | 'guideline';
  url: string;
  spiritualLevel?: SpiritualLevel;
  tags: string[];
  createdAt: Date;
}

export interface ProgressMetrics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  chantingRoundsTotal: number;
  morningProgramAttendance: number;
  scriptureReadingHours: number;
  streak: number;
  milestones: string[];
  lastUpdated: Date;
}

export interface CounselorRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  counselorEmail: string;
  message?: string; // User's self-description message
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
}

export interface BCVoiceManagerRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject?: string; // Subject to distinguish from counselor requests
  message?: string; // User's self-description message
  requestedCenters?: string[]; // Array of center IDs/names requested by user
  approvedCenters?: string[]; // Array of center IDs/names approved by admin
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
}
