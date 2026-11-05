import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface BugReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: any;
  userId?: string;
  userEmail?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: any;
}

export async function reportBug(error: any, severity: BugReport['severity'] = 'medium', context?: any) {
  try {
    const report: BugReport = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
      userId: auth.currentUser?.uid,
      userEmail: auth.currentUser?.email || undefined,
      severity,
      context
    };
    console.warn('Reporting bug to system...', report);
    
    await addDoc(collection(db, 'system_bugs'), report);
    return true;
  } catch (reportError) {
    console.error('Failed to report bug:', reportError);
    return false;
  }
}

/**
 * Automatically catches and reports errors in a promise.
 */
export function withBugReporting<T>(
  promise: Promise<T>,
  severity: BugReport['severity'] = 'medium',
  context?: any
): Promise<T> {
  return promise.catch((error) => {
    reportBug(error, severity, context);
    throw error;
  });
}
