import { collection, addDoc, query, where, getDocs, orderBy, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './config';

export interface Center {
  id: string;
  name: string;
  state: string;
  city: string;
  address?: string;
  contact?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const addCenter = async (center: Omit<Center, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }
  
  try {
    // Remove undefined values (Firestore doesn't allow undefined)
    const centerData: any = {
      name: center.name,
      state: center.state,
      city: center.city,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Only add optional fields if they have values
    if (center.address) {
      centerData.address = center.address;
    }
    if (center.contact) {
      centerData.contact = center.contact;
    }
    
    const docRef = await addDoc(collection(db, 'centers'), centerData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding center:', error);
    throw error;
  }
};

export const getCentersByLocation = async (state?: string, city?: string): Promise<Center[]> => {
  if (!db) {
    console.error('Firebase is not initialized');
    return [];
  }
  
  try {
    let q;
    if (state && city) {
      // Try with orderBy first, fallback to without if index not ready
      try {
        q = query(
          collection(db, 'centers'),
          where('state', '==', state),
          where('city', '==', city),
          orderBy('name')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Center[];
      } catch (indexError: any) {
        // If index error, query without orderBy and sort in memory
        if (indexError.code === 'failed-precondition') {
          q = query(
            collection(db, 'centers'),
            where('state', '==', state),
            where('city', '==', city)
          );
          const querySnapshot = await getDocs(q);
          const centers = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Center[];
          return centers.sort((a, b) => a.name.localeCompare(b.name));
        }
        throw indexError;
      }
    } else if (state) {
      try {
        q = query(
          collection(db, 'centers'),
          where('state', '==', state),
          orderBy('name')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Center[];
      } catch (indexError: any) {
        if (indexError.code === 'failed-precondition') {
          q = query(
            collection(db, 'centers'),
            where('state', '==', state)
          );
          const querySnapshot = await getDocs(q);
          const centers = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Center[];
          return centers.sort((a, b) => a.name.localeCompare(b.name));
        }
        throw indexError;
      }
    } else {
      q = query(collection(db, 'centers'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Center[];
    }
  } catch (error) {
    console.error('Error fetching centers:', error);
    return [];
  }
};

export const getAllCenters = async (): Promise<Center[]> => {
  if (!db) {
    console.error('Firebase is not initialized');
    return [];
  }
  
  try {
    const q = query(collection(db, 'centers'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Center[];
  } catch (error) {
    console.error('Error fetching all centers:', error);
    return [];
  }
};

export const updateCenter = async (centerId: string, updates: Partial<Center>) => {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }
  
  try {
    // Remove undefined values (Firestore doesn't allow undefined)
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    // Only include fields that are being updated and not undefined
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.state !== undefined) updateData.state = updates.state;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.address !== undefined) {
      updateData.address = updates.address || null;
    }
    if (updates.contact !== undefined) {
      updateData.contact = updates.contact || null;
    }
    
    await updateDoc(doc(db, 'centers', centerId), updateData);
  } catch (error) {
    console.error('Error updating center:', error);
    throw error;
  }
};

export const deleteCenter = async (centerId: string) => {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }
  
  try {
    await deleteDoc(doc(db, 'centers', centerId));
  } catch (error) {
    console.error('Error deleting center:', error);
    throw error;
  }
};
