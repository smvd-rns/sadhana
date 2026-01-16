import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { User, UserRole } from '@/types';
import { roleToNumber, normalizeRoleFromFirestore } from '@/lib/utils/roles';

export const signUp = async (
  email: string,
  password: string,
  name: string,
  role: UserRole | UserRole[],
  hierarchy: any
) => {
  if (!auth || !db) {
    throw new Error('Firebase is not initialized');
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    
    // Ensure role is always an array
    const rolesArray = Array.isArray(role) ? role : [role];
    
    // Convert roles to numbers for Firestore storage
    const roleNumbers = roleToNumber(rolesArray);
    
    const userData: Omit<User, 'id'> = {
      email,
      name,
      role: rolesArray, // Keep original for TypeScript type
      hierarchy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to Firestore with role as numbers
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      name,
      role: roleNumbers, // Save as numbers
      hierarchy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const signIn = async (email: string, password: string) => {
  if (!auth) {
    throw new Error('Firebase is not initialized');
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const logout = async () => {
  if (!auth) {
    throw new Error('Firebase is not initialized');
  }
  
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = (): Promise<FirebaseUser | null> => {
  if (!auth) {
    return Promise.resolve(null);
  }
  
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const getUserData = async (userId: string): Promise<User | null> => {
  if (!db) {
    console.error('Firebase is not initialized');
    return null;
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      // Convert role numbers back to role names
      const normalizedRole = normalizeRoleFromFirestore(data.role);
      return { 
        id: userDoc.id, 
        ...data,
        role: normalizedRole,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as User;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};
