import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

export const incrementUserPoints = async (userId: string, points: number) => {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      poinSkill: increment(points)
    });
  } catch (error) {
    console.error('Error incrementing points:', error);
  }
};
