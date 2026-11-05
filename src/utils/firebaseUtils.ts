import { retry } from './errorHandling';
import { OperationType, handleFirestoreError as baseHandleFirestoreError } from '../firebase';

export { OperationType };

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null = null, auth?: any): never {
  try {
    baseHandleFirestoreError(error, operationType, path, auth);
  } catch (baseError: any) {
    const errInfo = JSON.parse(baseError.message);
    
    let userFriendlyMessage = 'Terjadi kesalahan saat mengakses database.';
    
    if (errInfo.error.includes('quota exceeded')) {
      userFriendlyMessage = 'Kuota database telah habis (Quota Exceeded). Silakan coba lagi nanti atau hubungi admin.';
      console.warn('Firestore Quota Exceeded. Please check Firebase billing/limits.');
    } else if (errInfo.error.includes('offline') || errInfo.error.includes('network')) {
      userFriendlyMessage = 'Koneksi ke database terputus. Pastikan internet Anda stabil.';
    } else if (errInfo.error.includes('permission-denied') || errInfo.error.includes('insufficient permissions')) {
      userFriendlyMessage = 'Anda tidak memiliki izin untuk melakukan operasi ini.';
    }

    const finalError = new Error(JSON.stringify({ ...errInfo, userFriendlyMessage }));
    throw finalError;
  }
  throw new Error('Unknown Firestore Error');
}

/**
 * Automatically retries a Firestore operation if it fails due to network issues.
 */
export async function safeFirestoreOp<T>(
  op: () => Promise<T>,
  operationType: OperationType,
  path: string | null = null,
  auth?: any
): Promise<T> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('offline: Browser is currently offline');
    }
    return await retry(op, 3, 1000);
  } catch (error) {
    return handleFirestoreError(error, operationType, path, auth);
  }
}
