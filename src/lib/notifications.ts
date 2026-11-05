import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type NotificationTarget = 'all' | 'admin' | 'PC' | 'PK' | 'user';

export const sendNotification = async (
  title: string,
  message: string,
  targetRole: NotificationTarget = 'all',
  targetUserId?: string
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      title,
      message,
      targetRole,
      targetUserId: targetUserId || null,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
