import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { logSecurityAudit, encryptSensitiveLog, maskEmail } from './securityEncryption';

export const logActivity = async (
  userId: string | undefined, 
  userEmail: string | undefined | null, 
  action: string, 
  module: string,
  targetId?: string,
  details?: any,
  isSensitive: boolean = false
) => {
  if (!userId) return;
  try {
    const isSensitiveAction = 
      isSensitive ||
      action.includes('LOGIN') || 
      action.includes('REGISTER') || 
      action.includes('PASSWORD') || 
      action.includes('ROLE') ||
      action.includes('DELETE') ||
      action.includes('PERMISSION') ||
      module === 'Auth' || 
      module === 'Settings';

    let encryptedPayload: string | null = null;
    let integrityHash: string | null = null;

    if (isSensitiveAction && details) {
      const encrypted = encryptSensitiveLog({
        userId,
        userEmail,
        action,
        module,
        status: action.includes('FAILED') ? 'FAILED' : 'SUCCESS',
        metadata: details
      });
      encryptedPayload = encrypted.cipherPayload;
      integrityHash = encrypted.integrityHash;
    }

    // 1. Write to standard activity_logs
    await addDoc(collection(db, 'activity_logs'), {
      userId,
      userEmail: isSensitiveAction ? maskEmail(userEmail) : userEmail,
      action,
      module,
      targetId: targetId || null,
      details: isSensitiveAction ? null : (details || null),
      encryptedDetails: encryptedPayload,
      integrityHash,
      isEncrypted: Boolean(encryptedPayload),
      timestamp: serverTimestamp()
    });

    // 2. Also log to dedicated encrypted security audit trail if high security
    if (isSensitiveAction) {
      await logSecurityAudit({
        userId,
        userEmail,
        action,
        module,
        status: action.includes('FAILED') ? 'FAILED' : 'SUCCESS',
        metadata: details
      });
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
