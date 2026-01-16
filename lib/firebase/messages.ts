import { collection, addDoc, query, where, getDocs, orderBy, limit, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './config';
import { Message } from '@/types';

export const sendMessage = async (message: Omit<Message, 'id' | 'createdAt' | 'readBy'>) => {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }
  
  try {
    const docRef = await addDoc(collection(db, 'messages'), {
      ...message,
      readBy: [],
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getUserMessages = async (userId: string, limitCount: number = 50) => {
  if (!db) {
    console.error('Firebase is not initialized');
    return [];
  }
  
  try {
    const q = query(
      collection(db, 'messages'),
      where('recipientIds', 'array-contains', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Message[];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

export const markMessageAsRead = async (messageId: string, userId: string) => {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }
  
  try {
    await updateDoc(doc(db, 'messages', messageId), {
      readBy: arrayUnion(userId),
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

export const getGroupMessages = async (groupId: string, limitCount: number = 50) => {
  if (!db) {
    console.error('Firebase is not initialized');
    return [];
  }
  
  try {
    const q = query(
      collection(db, 'messages'),
      where('recipientGroups', 'array-contains', groupId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Message[];
  } catch (error) {
    console.error('Error fetching group messages:', error);
    return [];
  }
};
