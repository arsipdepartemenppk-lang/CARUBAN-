import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { MasterPK } from './pkService';
import { decryptData, encryptData } from '../utils/securityEncryption';
import { logActivity } from '../utils/activityLogger';

export interface SyncReport {
  success: boolean;
  timestamp: string;
  pksToPimpinanCount: number;
  pimpinanToPksCount: number;
  memberCountsUpdated: number;
  totalMembers: number;
  totalPKs: number;
  totalPimpinan: number;
  details: string[];
}

/**
 * Normalizes text for comparison (removes redundant punctuation and extra spaces)
 */
export const normalizeOrgName = (name?: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(pk|pimpinan komisariat|pr|pimpinan ranting|pac|pimpinan anak cabang)\s+/gi, '')
    .replace(/[.,\-_/()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Decrypts a member record if it was encrypted
 */
const decryptMember = (data: any) => {
  if (!data._isEncrypted) return data;
  const decrypted = { ...data };
  const PI_FIELDS = ['namaLengkap', 'noHp', 'email', 'alamatLengkap', 'alamatSekolah', 'tempatKaderisasi', 'tanggalLahir'];
  PI_FIELDS.forEach(field => {
    if (data[field]) {
      try {
        decrypted[field] = decryptData(data[field]);
      } catch {
        // Fallback if not decryptable
      }
    }
  });
  return decrypted;
};

/**
 * Decrypts a pimpinan record if it was encrypted
 */
const decryptPimpinan = (data: any) => {
  if (!data._isEncrypted) return data;
  const item = { ...data };
  ['namaKetua', 'noHp', 'email', 'alamatDomisili', 'namaLembaga'].forEach(f => {
    if (data[f]) {
      try {
        item[f] = decryptData(data[f]);
      } catch {
        // Fallback
      }
    }
  });
  return item;
};

/**
 * Comprehensive two-way sync across:
 * 1. Data Anggota (members)
 * 2. Data Master PK (pks)
 * 3. Database Pimpinan (pimpinan)
 */
export const syncAllData = async (user?: { uid?: string; email?: string }): Promise<SyncReport> => {
  const details: string[] = [];
  let pksToPimpinanCount = 0;
  let pimpinanToPksCount = 0;
  let memberCountsUpdated = 0;

  try {
    // 1. Fetch current collections
    const [pksSnap, pimpinanSnap, membersSnap] = await Promise.all([
      getDocs(collection(db, 'pks')),
      getDocs(collection(db, 'pimpinan')),
      getDocs(collection(db, 'members'))
    ]);

    const pks = pksSnap.docs.map(d => ({ id: d.id, ...d.data() } as MasterPK));
    const pimpinans = pimpinanSnap.docs.map(d => ({ id: d.id, ...decryptPimpinan(d.data()) } as any));
    const members = membersSnap.docs.map(d => ({ id: d.id, ...decryptMember(d.data()) } as any));

    details.push(`Membaca ${pks.length} Master PK, ${pimpinans.length} Pimpinan, dan ${members.length} Anggota.`);

    // 2. Synchronize Master PK -> Database Pimpinan
    for (const pk of pks) {
      const normPk = normalizeOrgName(pk.namaPK);
      const existingPimpinan = pimpinans.find(p => 
        p.jenis === 'PK' && (
          normalizeOrgName(p.namaLembaga) === normPk ||
          p.pkDocId === pk.id ||
          (p.pkId && pk.pkId && p.pkId === pk.pkId)
        )
      );

      // Real count of members belonging to this PK
      const matchingMembers = members.filter(m => {
        const normMemberSchool = normalizeOrgName(m.namaSekolah || m.namaPK || '');
        const isMatchSchool = normMemberSchool && (
          normMemberSchool === normPk || 
          normMemberSchool.includes(normPk) || 
          normPk.includes(normMemberSchool)
        );
        const isMatchId = m.pkId && (m.pkId === pk.id || m.pkId === pk.pkId);
        return isMatchSchool || isMatchId;
      });

      const actualMemberCount = matchingMembers.length;

      // Update jumlahAnggota in pks if different
      if (pk.jumlahAnggota !== actualMemberCount) {
        await updateDoc(doc(db, 'pks', pk.id), {
          jumlahAnggota: actualMemberCount,
          lastSyncedAt: new Date().toISOString()
        });
        memberCountsUpdated++;
      }

      if (!existingPimpinan) {
        // Create in pimpinan
        const newPimpinanData: any = {
          namaLembaga: pk.namaPK,
          jenis: 'PK',
          namaKetua: pk.namaKetua || '',
          noHp: pk.noHp || '',
          email: pk.emailKomisariat || '',
          alamatDomisili: pk.alamat || '',
          masaKhidmat: '2024-2026',
          statusPimpinan: pk.status || 'Aktif',
          organisasi: pk.organisasi || 'IPNU',
          kecamatan: pk.kecamatan || '',
          zona: pk.zona || '',
          koorzon: pk.koorzon || '',
          pkDocId: pk.id,
          pkId: pk.pkId || '',
          jumlahAnggota: actualMemberCount,
          syncedFrom: 'pks',
          createdAt: new Date().toISOString(),
          createdBy: user?.uid || 'system_sync'
        };

        // Encrypt sensitive fields
        ['namaKetua', 'noHp', 'email', 'alamatDomisili', 'namaLembaga'].forEach(f => {
          if (newPimpinanData[f]) {
            const { encrypted } = encryptData(newPimpinanData[f]);
            newPimpinanData[f] = encrypted;
          }
        });
        newPimpinanData._isEncrypted = true;

        await addDoc(collection(db, 'pimpinan'), newPimpinanData);
        pksToPimpinanCount++;
        details.push(`Komisariat "${pk.namaPK}" disinkronkan ke Database Pimpinan.`);
      } else {
        // Update existing pimpinan with fresh PK info and member count
        const updatePayload: any = {
          pkDocId: pk.id,
          pkId: pk.pkId || '',
          zona: pk.zona || existingPimpinan.zona || '',
          koorzon: pk.koorzon || existingPimpinan.koorzon || '',
          kecamatan: pk.kecamatan || existingPimpinan.kecamatan || '',
          statusPimpinan: pk.status || existingPimpinan.statusPimpinan || 'Aktif',
          jumlahAnggota: actualMemberCount,
          lastSyncedAt: new Date().toISOString()
        };

        if (pk.namaKetua && (!existingPimpinan.namaKetua || existingPimpinan.namaKetua === '-')) {
          const { encrypted } = encryptData(pk.namaKetua);
          updatePayload.namaKetua = encrypted;
          updatePayload._isEncrypted = true;
        }

        await updateDoc(doc(db, 'pimpinan', existingPimpinan.id), updatePayload);
      }
    }

    // 3. Synchronize Database Pimpinan (PK) -> Master PK
    for (const p of pimpinans) {
      if (p.jenis === 'PK') {
        const normPim = normalizeOrgName(p.namaLembaga);
        const existingPK = pks.find(pk => 
          normalizeOrgName(pk.namaPK) === normPim ||
          pk.id === p.pkDocId ||
          (p.pkId && pk.pkId && pk.pkId === p.pkId)
        );

        if (!existingPK) {
          // Create in Master PK
          const cleanNama = (p.namaLembaga || 'PK').replace(/\s+/g, '').toUpperCase().slice(0, 10);
          const cleanZona = (p.zona || 'ZONA1').replace(/\s+/g, '').toUpperCase();
          const generatedPkId = `${cleanNama}_${cleanZona}_SYNC${Math.floor(100 + Math.random() * 900)}`;

          // Real count of members belonging to this PK
          const matchingMembers = members.filter(m => {
            const normMemberSchool = normalizeOrgName(m.namaSekolah || m.namaPK || '');
            return normMemberSchool && (
              normMemberSchool === normPim || 
              normMemberSchool.includes(normPim) || 
              normPim.includes(normMemberSchool)
            );
          });

          const newPKRef = await addDoc(collection(db, 'pks'), {
            pkId: p.pkId || generatedPkId,
            namaPK: p.namaLembaga,
            alamat: p.alamatDomisili || '',
            zona: p.zona || 'Zona 1',
            koorzon: p.koorzon || 'Koorzon 1',
            status: p.statusPimpinan || 'Aktif',
            organisasi: p.organisasi || 'IPNU',
            kecamatan: p.kecamatan || '',
            namaKetua: p.namaKetua || '',
            noHp: p.noHp || '',
            emailKomisariat: p.email || '',
            tanggalBerdiri: '2024-01-01',
            jumlahAnggota: matchingMembers.length,
            statusVisitasi: 'Unvisited',
            priority: 'Medium',
            taskType: 'Regular Visit',
            lat: -6.7372,
            lng: 108.5507,
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || 'system_sync'
          });

          // Link back to pimpinan
          await updateDoc(doc(db, 'pimpinan', p.id), {
            pkDocId: newPKRef.id,
            pkId: p.pkId || generatedPkId,
            jumlahAnggota: matchingMembers.length,
            lastSyncedAt: new Date().toISOString()
          });

          pimpinanToPksCount++;
          details.push(`Pimpinan PK "${p.namaLembaga}" disinkronkan ke Master PK.`);
        }
      } else if (p.jenis === 'PR') {
        // Sync real member count for PR
        const normPR = normalizeOrgName(p.namaLembaga);
        const prMembers = members.filter(m => {
          const t = (m.statusPimpinan || m.tingkat || '').toUpperCase();
          if (t !== 'PR') return false;
          const alamat = (m.alamatLengkap || '').toLowerCase();
          const kec = (m.kecamatan || '').toLowerCase();
          return alamat.includes(normPR) || (p.kecamatan && kec === p.kecamatan.toLowerCase());
        });
        if (p.jumlahAnggota !== prMembers.length) {
          await updateDoc(doc(db, 'pimpinan', p.id), {
            jumlahAnggota: prMembers.length,
            lastSyncedAt: new Date().toISOString()
          });
          memberCountsUpdated++;
        }
      } else if (p.jenis === 'PAC') {
        // Sync real member count for PAC
        const pacMembers = members.filter(m => {
          const t = (m.statusPimpinan || m.tingkat || '').toUpperCase();
          const kec = (m.kecamatan || m.alamatLengkap || '').toLowerCase();
          const pKec = (p.kecamatan || p.namaLembaga || '').toLowerCase();
          return t === 'PAC' || (pKec && kec.includes(pKec));
        });
        if (p.jumlahAnggota !== pacMembers.length) {
          await updateDoc(doc(db, 'pimpinan', p.id), {
            jumlahAnggota: pacMembers.length,
            lastSyncedAt: new Date().toISOString()
          });
          memberCountsUpdated++;
        }
      }
    }

    // Log the synchronization action
    if (user?.uid) {
      await logActivity(user.uid, user.email, 'SYNC_DATA', 'Database', 'all', {
        pksToPimpinanCount,
        pimpinanToPksCount,
        memberCountsUpdated
      });
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      pksToPimpinanCount,
      pimpinanToPksCount,
      memberCountsUpdated,
      totalMembers: members.length,
      totalPKs: pks.length + pimpinanToPksCount,
      totalPimpinan: pimpinans.length + pksToPimpinanCount,
      details
    };
  } catch (error: any) {
    console.error('Error during data synchronization:', error);
    throw error;
  }
};

/**
 * Helper to update member count on a specific PK in real-time
 */
export const syncMemberCountForPK = async (pkIdentifier: string) => {
  try {
    const [pksSnap, membersSnap] = await Promise.all([
      getDocs(collection(db, 'pks')),
      getDocs(collection(db, 'members'))
    ]);

    const pks = pksSnap.docs.map(d => ({ id: d.id, ...d.data() } as MasterPK));
    const members = membersSnap.docs.map(d => ({ id: d.id, ...decryptMember(d.data()) } as any));

    const targetPK = pks.find(p => p.id === pkIdentifier || p.pkId === pkIdentifier || normalizeOrgName(p.namaPK) === normalizeOrgName(pkIdentifier));
    if (!targetPK) return;

    const normTarget = normalizeOrgName(targetPK.namaPK);
    const count = members.filter(m => {
      const normSchool = normalizeOrgName(m.namaSekolah || '');
      return (normSchool && (normSchool === normTarget || normSchool.includes(normTarget))) || m.pkId === targetPK.id;
    }).length;

    await updateDoc(doc(db, 'pks', targetPK.id), {
      jumlahAnggota: count,
      lastSyncedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to sync single PK member count:', err);
  }
};
