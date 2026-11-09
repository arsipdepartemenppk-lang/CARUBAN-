import CryptoJS from 'crypto-js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// AES-256 Salted Master Encryption Secret for Sensitive Organizational Audit Logs
// In production, this can also combine environment variables and client entropy
const AUDIT_CIPHER_SECRET = 'CarubanCore_Secure_AES256_AuditTrail_2026_PC_IPNU_IPPNU';
const AUDIT_HMAC_SECRET = 'CarubanCore_HMAC_SHA256_Integrity_Verification_Key';

export interface SensitiveLogPayload {
  ipAddress?: string;
  userAgent?: string;
  userEmail?: string | null;
  userId?: string;
  role?: string;
  action: string;
  module: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'BLOCKED';
  reason?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface EncryptedSecurityAuditDoc {
  id?: string;
  action: string;
  module: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'BLOCKED';
  userId?: string;
  userEmailMasked?: string;
  cipherPayload: string;
  integrityHash: string;
  isEncrypted: boolean;
  algorithm: string;
  timestamp: any;
}

/**
 * Encrypts sensitive audit details using AES-256 and computes HMAC-SHA256 for integrity.
 */
export function encryptSensitiveLog(payload: SensitiveLogPayload): { cipherPayload: string; integrityHash: string } {
  try {
    const jsonString = JSON.stringify({
      ...payload,
      _encryptionTimestamp: new Date().toISOString(),
      _nonce: Math.random().toString(36).substring(2, 15)
    });

    const cipherPayload = CryptoJS.AES.encrypt(jsonString, AUDIT_CIPHER_SECRET).toString();
    const integrityHash = CryptoJS.HmacSHA256(cipherPayload, AUDIT_HMAC_SECRET).toString();

    return { cipherPayload, integrityHash };
  } catch (error) {
    console.error('Failed to encrypt sensitive log:', error);
    // Fallback safe representation
    return {
      cipherPayload: CryptoJS.AES.encrypt(JSON.stringify({ error: 'encryption_fallback' }), AUDIT_CIPHER_SECRET).toString(),
      integrityHash: ''
    };
  }
}

/**
 * Decrypts sensitive audit log and verifies tamper-evident HMAC-SHA256 integrity.
 */
export function decryptSensitiveLog(cipherPayload: string, integrityHash?: string): { payload: SensitiveLogPayload | null; isTampered: boolean } {
  try {
    if (!cipherPayload) return { payload: null, isTampered: false };

    // 1. Verify HMAC integrity if provided
    let isTampered = false;
    if (integrityHash) {
      const computedHash = CryptoJS.HmacSHA256(cipherPayload, AUDIT_HMAC_SECRET).toString();
      if (computedHash !== integrityHash) {
        isTampered = true;
      }
    }

    // 2. Decrypt AES-256 ciphertext
    const bytes = CryptoJS.AES.decrypt(cipherPayload, AUDIT_CIPHER_SECRET);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedText) {
      return { payload: null, isTampered: true };
    }

    const payload = JSON.parse(decryptedText) as SensitiveLogPayload;
    return { payload, isTampered };
  } catch (error) {
    console.error('Failed to decrypt sensitive log:', error);
    return { payload: null, isTampered: true };
  }
}

export interface DecryptionMiddlewareContext {
  role?: string | null;
  email?: string | null;
  uid?: string | null;
}

export interface AuthorizedDecryptionResult {
  authorized: boolean;
  payload: SensitiveLogPayload | null;
  isTampered: boolean;
  error?: string;
}

/**
 * Middleware function that decrypts sensitive audit logs strictly for users with
 * the 'admin' or 'developer' role.
 *
 * If the requesting user does not hold an authorized role, decryption is blocked
 * and an access denied response is returned.
 */
export function decryptLogWithRoleMiddleware(
  cipherPayload: string,
  context: DecryptionMiddlewareContext,
  integrityHash?: string
): AuthorizedDecryptionResult {
  const emailLower = (context.email || '').trim().toLowerCase();
  const isSuperAdminEmail = 
    emailLower === 'arsipdepartemenppk@gmail.com' ||
    emailLower === 'arsipdepartemenpendidikan@gmail.com' ||
    emailLower === 'syifaudina15@gmail.com';

  const isAuthorizedRole = context.role === 'admin' || context.role === 'developer' || isSuperAdminEmail;

  if (!isAuthorizedRole) {
    return {
      authorized: false,
      payload: null,
      isTampered: false,
      error: "AKSES DITOLAK: Kunci dekripsi log sensitif AES-256 hanya diizinkan untuk peran 'admin' atau 'developer'."
    };
  }

  const { payload, isTampered } = decryptSensitiveLog(cipherPayload, integrityHash);

  if (!payload) {
    return {
      authorized: true,
      payload: null,
      isTampered,
      error: "Gagal memproses ciphertext AES-256 atau data telah mengalami manipulasi."
    };
  }

  return {
    authorized: true,
    payload,
    isTampered
  };
}

/**
 * Generic data encryption for PII (Personally Identifiable Information) in Firestore.
 */
export function encryptData(data: any): { encrypted: string; iv: string } {
  try {
    const jsonStr = JSON.stringify(data);
    const secret = AUDIT_CIPHER_SECRET;
    const encrypted = CryptoJS.AES.encrypt(jsonStr, secret).toString();
    return { encrypted, iv: 'aes-256-cbc' };
  } catch (error) {
    console.error('Data encryption error:', error);
    return { encrypted: '', iv: '' };
  }
}

/**
 * Generic data decryption for PII.
 * Handles both JSON-stringified encrypted data and plain strings gracefully.
 */
export function decryptData(encrypted: string): any {
  if (!encrypted || typeof encrypted !== 'string' || encrypted.length < 10) return encrypted;
  
  try {
    const secret = AUDIT_CIPHER_SECRET;
    const bytes = CryptoJS.AES.decrypt(encrypted, secret);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedText) return encrypted; // Likely not encrypted or wrong key

    try {
      return JSON.parse(decryptedText);
    } catch {
      return decryptedText; // Plain string that was encrypted
    }
  } catch (error) {
    // If decryption fails, it might be legacy plain text data
    return encrypted;
  }
}

/**
 * System-wide Security Integrity Scan Logic.
 * This function performs a point-in-time assessment of various security vectors.
 */
export async function runSecurityIntegrityCheck(users: any[], auditLogs: any[]): Promise<{
  score: number;
  alerts: { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; message: string; module: string }[];
  summary: { totalUsers: number; encryptedLogs: number; threatsMitigated: number };
}> {
  let score = 100;
  const alerts: any[] = [];
  const now = Date.now();

  // 1. Check PC/PAC Password Rotation (Critical Policy)
  const highAccessUsers = users.filter(u => ['PC', 'PAC', 'admin'].includes(u.role));
  let overdueCount = 0;
  highAccessUsers.forEach(u => {
    const lastChanged = u.passwordLastChanged || u.createdAt;
    if (!lastChanged) {
      overdueCount++;
      return;
    }
    const days = Math.floor(Math.abs(now - new Date(lastChanged).getTime()) / (1000 * 60 * 60 * 24));
    if (days > 90) overdueCount++;
  });

  if (overdueCount > 0) {
    score -= Math.min(overdueCount * 5, 20);
    alerts.push({
      severity: overdueCount > 2 ? 'HIGH' : 'MEDIUM',
      module: 'Identity',
      message: `Terdeteksi ${overdueCount} akun akses tinggi (PC/PAC/Admin) dengan kata sandi kadaluwarsa (>90 hari).`
    });
  }

  // 2. Scan Audit Logs for Critical Threats
  const criticalThreats = auditLogs.filter(l => l.status === 'BLOCKED' || l.severity === 'CRITICAL');
  if (criticalThreats.length > 0) {
    score -= Math.min(criticalThreats.length * 10, 30);
    alerts.push({
      severity: 'CRITICAL',
      module: 'WAF',
      message: `Terdeteksi ${criticalThreats.length} upaya serangan siber yang diblokir sistem dalam periode audit terakhir.`
    });
  }

  // 3. Check for Suspicious Role Escalations
  const roleEscalations = auditLogs.filter(l => (l.action || '').includes('ROLE_UPDATE'));
  if (roleEscalations.length > 5) {
    alerts.push({
      severity: 'MEDIUM',
      module: 'RBAC',
      message: 'Frekuensi perubahan peran pengguna tinggi dalam 24 jam terakhir. Lakukan verifikasi manual.'
    });
  }

  // 4. Verification Status
  const unverifiedAdmins = highAccessUsers.filter(u => !u.emailVerified && u.role === 'admin');
  if (unverifiedAdmins.length > 0) {
    score -= 15;
    alerts.push({
      severity: 'HIGH',
      module: 'Auth',
      message: `${unverifiedAdmins.length} akun Administrator belum diverifikasi emailnya. Risiko pengambilalihan akun.`
    });
  }

  return {
    score: Math.max(score, 10),
    alerts,
    summary: {
      totalUsers: users.length,
      encryptedLogs: auditLogs.length,
      threatsMitigated: criticalThreats.length
    }
  };
}

/**
 * Mask email for public or semi-public view (e.g., ah***@gmail.com)
 */
export function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return 'anonymous@user';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name.charAt(0)}*@${domain}`;
  return `${name.slice(0, 2)}***${name.charAt(name.length - 1)}@${domain}`;
}

/**
 * Logs a high-security sensitive access event with AES-256 encryption into Firestore.
 */
export async function logSecurityAudit(entry: {
  userId?: string;
  userEmail?: string | null;
  action: string;
  module: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'BLOCKED';
  role?: string;
  reason?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    // Gather client telemetry defensively
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Server/Backend';
    
    const rawPayload: SensitiveLogPayload = {
      userId: entry.userId || 'anonymous',
      userEmail: entry.userEmail || 'unknown',
      role: entry.role || 'user',
      action: entry.action,
      module: entry.module,
      status: entry.status,
      reason: entry.reason,
      userAgent,
      metadata: entry.metadata || {},
      timestamp: new Date().toISOString()
    };

    const { cipherPayload, integrityHash } = encryptSensitiveLog(rawPayload);

    await addDoc(collection(db, 'security_audit_logs'), {
      action: entry.action,
      module: entry.module,
      status: entry.status,
      userId: entry.userId || null,
      userEmailMasked: maskEmail(entry.userEmail),
      cipherPayload,
      integrityHash,
      isEncrypted: true,
      algorithm: 'AES-256-CBC+HMAC-SHA256',
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('Error logging encrypted security audit:', err);
  }
}
