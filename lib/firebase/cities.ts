import { collection, addDoc, query, where, getDocs, orderBy, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './config';

export interface City {
  id: string;
  name: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
}

export const addCity = async (city: Omit<City, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }
  
  try {
    // Check if city already exists
    const existingQuery = query(
      collection(db, 'cities'),
      where('name', '==', city.name),
      where('state', '==', city.state)
    );
    const existing = await getDocs(existingQuery);
    
    if (!existing.empty) {
      throw new Error('City already exists');
    }
    
    // Remove undefined values (Firestore doesn't allow undefined)
    const cityData: any = {
      name: city.name,
      state: city.state,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const docRef = await addDoc(collection(db, 'cities'), cityData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding city:', error);
    throw error;
  }
};

export const getCitiesByState = async (state: string): Promise<City[]> => {
  if (!db) {
    console.error('Firebase is not initialized');
    return [];
  }
  
  try {
    // Try with orderBy first, fallback to without if index not ready
    try {
      const q = query(
        collection(db, 'cities'),
        where('state', '==', state),
        orderBy('name')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as City[];
    } catch (indexError: any) {
      // If index error, query without orderBy and sort in memory
      if (indexError.code === 'failed-precondition') {
        const q = query(
          collection(db, 'cities'),
          where('state', '==', state)
        );
        const querySnapshot = await getDocs(q);
        const cities = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as City[];
        return cities.sort((a, b) => a.name.localeCompare(b.name));
      }
      throw indexError;
    }
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
};

export const getAllCities = async (): Promise<City[]> => {
  if (!db) {
    console.error('Firebase is not initialized');
    return [];
  }
  
  try {
    const q = query(collection(db, 'cities'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as City[];
  } catch (error) {
    console.error('Error fetching all cities:', error);
    return [];
  }
};

export const deleteCity = async (cityId: string) => {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }
  
  try {
    await deleteDoc(doc(db, 'cities', cityId));
  } catch (error) {
    console.error('Error deleting city:', error);
    throw error;
  }
};
