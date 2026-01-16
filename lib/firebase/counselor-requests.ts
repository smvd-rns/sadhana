import { collection, query, where, getDocs, doc, addDoc, updateDoc, getDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from './config';
import { CounselorRequest } from '@/types';

// Helper function to wait for Firebase to be initialized
const waitForFirebase = async (maxRetries = 20, delay = 100): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    if (db) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
};

export const createCounselorRequest = async (
  userId: string,
  userEmail: string,
  userName: string,
  counselorEmail: string,
  message?: string
): Promise<string> => {
  const isReady = await waitForFirebase();
  if (!isReady || !db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    // Check if there's already a pending request for this user
    const existingQuery = query(
      collection(db, 'counselorRequests'),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      throw new Error('You already have a pending counselor request');
    }

    const docRef = await addDoc(collection(db, 'counselorRequests'), {
      userId,
      userEmail,
      userName,
      counselorEmail,
      message: message || '',
      status: 'pending',
      requestedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error: any) {
    console.error('Error creating counselor request:', error);
    throw error;
  }
};

export const getCounselorRequestByUserId = async (userId: string): Promise<CounselorRequest | null> => {
  const isReady = await waitForFirebase();
  if (!isReady || !db) {
    return null; // Return null instead of throwing error
  }

  try {
    const q = query(
      collection(db, 'counselorRequests'),
      where('userId', '==', userId),
      orderBy('requestedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      requestedAt: data.requestedAt?.toDate() || new Date(),
      reviewedAt: data.reviewedAt?.toDate(),
    } as CounselorRequest;
  } catch (error) {
    console.error('Error fetching counselor request:', error);
    throw error;
  }
};

export const getAllCounselorRequests = async (status?: 'pending' | 'approved' | 'rejected'): Promise<CounselorRequest[]> => {
  const isReady = await waitForFirebase();
  if (!isReady || !db) {
    return []; // Return empty array instead of throwing error
  }

  try {
    let q;
    if (status) {
      q = query(
        collection(db, 'counselorRequests'),
        where('status', '==', status),
        orderBy('requestedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'counselorRequests'),
        orderBy('requestedAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        requestedAt: data.requestedAt?.toDate() || new Date(),
        reviewedAt: data.reviewedAt?.toDate(),
      } as CounselorRequest;
    });
  } catch (error) {
    console.error('Error fetching counselor requests:', error);
    throw error;
  }
};

export const updateCounselorRequestStatus = async (
  requestId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  notes?: string
): Promise<void> => {
  const isReady = await waitForFirebase();
  if (!isReady || !db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    await updateDoc(doc(db, 'counselorRequests', requestId), {
      status,
      reviewedBy,
      reviewedAt: serverTimestamp(),
      notes: notes || '',
    });
  } catch (error) {
    console.error('Error updating counselor request:', error);
    throw error;
  }
};

export const checkIfEmailIsCounselor = async (email: string): Promise<boolean> => {
  try {
    // Fetch all counselors and check if email matches
    const response = await fetch('/api/counselors/get');
    if (!response.ok) {
      return false;
    }
    const counselors = await response.json();
    if (!Array.isArray(counselors)) {
      return false;
    }
    // Check if any counselor has this email (case-insensitive)
    return counselors.some(counselor => 
      counselor.email && counselor.email.toLowerCase() === email.toLowerCase()
    );
  } catch (error) {
    console.error('Error checking counselor email:', error);
    return false;
  }
};
