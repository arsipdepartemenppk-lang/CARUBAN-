import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const logActivity = async (
  userId: string | undefined, 
  userEmail: string | undefined | null, 
  action: string, 
  module: string,
  targetId?: string,
  details?: any
) => {
  if (!userId) return;
  try {
    await addDoc(collection(db, 'activity_logs'), {
      userId,
      userEmail,
      action,
      module,
      targetId: targetId || null,
      details: details || null,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
