import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface NotificationData {
  userId?: string; // If undefined, it's a global notification
  message: string;
  type: NotificationType;
  link?: string;
  title: string;
}

export const sendNotification = async (data: NotificationData) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...data,
      createdAt: serverTimestamp(),
      read: false,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
