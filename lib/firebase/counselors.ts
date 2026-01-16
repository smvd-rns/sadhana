import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';
import { User } from '@/types';
import { normalizeRoleFromFirestore } from '@/lib/utils/roles';

/**
 * Get all users who have a specific counselor email in their hierarchy
 * Note: Users store counselor NAME in hierarchy, not email, so we need to:
 * 1. Find the counselor by email to get their name
 * 2. Find users where hierarchy.brahmachariCounselor or hierarchy.grihasthaCounselor matches the name
 */
export const getUsersByCounselorEmail = async (counselorEmail: string): Promise<User[]> => {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    // First, get the counselor by email to find their name
    const counselorResponse = await fetch('/api/counselors/get');
    if (!counselorResponse.ok) {
      throw new Error('Failed to fetch counselors');
    }
    const counselors = await counselorResponse.json();
    const counselor = Array.isArray(counselors) 
      ? counselors.find((c: any) => c.email && c.email.toLowerCase() === counselorEmail.toLowerCase())
      : null;

    if (!counselor || !counselor.name) {
      return []; // Counselor not found
    }

    const counselorName = counselor.name;

    // Query all users and filter by counselor name
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    
    const users: User[] = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // Check if user has this counselor name in their hierarchy
      const userBrahmachariCounselor = data.hierarchy?.brahmachariCounselor;
      const userGrihasthaCounselor = data.hierarchy?.grihasthaCounselor;
      
      // Match by counselor name (case-insensitive)
      if ((userBrahmachariCounselor && userBrahmachariCounselor.toLowerCase() === counselorName.toLowerCase()) ||
          (userGrihasthaCounselor && userGrihasthaCounselor.toLowerCase() === counselorName.toLowerCase())) {
        const normalizedRole = normalizeRoleFromFirestore(data.role);
        users.push({
          id: doc.id,
          ...data,
          role: normalizedRole,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as User);
      }
    });

    return users;
  } catch (error) {
    console.error('Error fetching users by counselor email:', error);
    throw error;
  }
};
