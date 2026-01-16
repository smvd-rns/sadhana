import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { User, UserRole } from '@/types';
import { roleToNumber, normalizeRoleFromFirestore } from '@/lib/utils/roles';

export const getUsersByRole = async (role: UserRole) => {
  if (!db) {
    console.error('Firebase is not initialized');
    return [];
  }
  
  try {
    // Convert role to number for query
    const roleNumber = roleToNumber(role);
    const roleNumberArray = Array.isArray(roleNumber) ? roleNumber : [roleNumber];
    
    // Query for users with this role number (checking both single number and array)
    const allUsers: User[] = [];
    for (const num of roleNumberArray) {
      // Try single number match
      const q1 = query(collection(db, 'users'), where('role', '==', num));
      const snapshot1 = await getDocs(q1);
      snapshot1.docs.forEach(doc => {
        const data = doc.data();
        const normalizedRole = normalizeRoleFromFirestore(data.role);
        allUsers.push({
          id: doc.id,
          ...data,
          role: normalizedRole,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as User);
      });
      
      // Try array contains match
      const q2 = query(collection(db, 'users'), where('role', 'array-contains', num));
      const snapshot2 = await getDocs(q2);
      snapshot2.docs.forEach(doc => {
        const data = doc.data();
        const normalizedRole = normalizeRoleFromFirestore(data.role);
        // Avoid duplicates
        if (!allUsers.find(u => u.id === doc.id)) {
          allUsers.push({
            id: doc.id,
            ...data,
            role: normalizedRole,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as User);
        }
      });
    }
    
    return allUsers;
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }
};

export const getUsersByHierarchy = async (hierarchy: any) => {
  if (!db) {
    console.error('Firebase is not initialized');
    return [];
  }
  
  try {
    const constraints: any[] = [];
    
    if (hierarchy.state) {
      constraints.push(where('hierarchy.state', '==', hierarchy.state));
    }
    if (hierarchy.city) {
      constraints.push(where('hierarchy.city', '==', hierarchy.city));
    }
    if (hierarchy.center) {
      constraints.push(where('hierarchy.center', '==', hierarchy.center));
    }

    if (constraints.length === 0) {
      const querySnapshot = await getDocs(collection(db, 'users'));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const normalizedRole = normalizeRoleFromFirestore(data.role);
        return {
          id: doc.id,
          ...data,
          role: normalizedRole,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as User;
      });
    }

    const q = query(collection(db, 'users'), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const normalizedRole = normalizeRoleFromFirestore(data.role);
      return {
        id: doc.id,
        ...data,
        role: normalizedRole,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as User;
    });
  } catch (error) {
    console.error('Error fetching users by hierarchy:', error);
    return [];
  }
};

export const updateUser = async (userId: string, updates: Partial<User>) => {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }
  
  try {
    // Convert role to number if it's being updated
    const firestoreUpdates: any = { ...updates };
    if (updates.role !== undefined) {
      firestoreUpdates.role = roleToNumber(updates.role);
    }
    
    await updateDoc(doc(db, 'users', userId), {
      ...firestoreUpdates,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};
