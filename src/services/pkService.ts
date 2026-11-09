import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firebaseUtils';
import { auth } from '../firebase';

export interface MasterPK {
  id: string;
  pkId: string;
  namaPK: string;
  alamat: string;
  zona: string;
  koorzon: string;
  status: 'Aktif' | 'Non Aktif' | 'Vakum';
  organisasi: 'IPNU' | 'IPPNU';
  kecamatan: string;
  namaKetua: string;
  noHp: string;
  emailKomisariat: string;
  tanggalBerdiri: string;
  jumlahAnggota: number;
  jumlahKunjungan?: number;
  statusVisitasi: 'Visitasi' | 'Unvisited';
  priority: 'High' | 'Medium' | 'Low';
  taskType: 'Regular Visit' | 'Special Task';
  excellentRating?: number;
  lat?: number;
  lng?: number;
  logoUrl?: string;
}

const COLLECTION_NAME = 'pks';

export const pkService = {
  getPKsQuery: () => query(collection(db, COLLECTION_NAME), orderBy('pkId', 'asc')),
  
  addPK: async (data: Omit<MasterPK, 'id'>, userId: string) => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        createdAt: new Date().toISOString(),
        createdBy: userId
      });

      // Synchronize into pimpinan collection
      try {
        const pimpinanQuery = query(collection(db, 'pimpinan'));
        const pimpinanSnap = await getDocs(pimpinanQuery);
        const existingPimpinan = pimpinanSnap.docs.find(d => {
          const item = d.data();
          return item.jenis === 'PK' && (item.namaLembaga === data.namaPK || item.pkDocId === docRef.id || item.pkId === data.pkId);
        });

        if (!existingPimpinan) {
          await addDoc(collection(db, 'pimpinan'), {
            namaLembaga: data.namaPK,
            jenis: 'PK',
            namaKetua: data.namaKetua || '',
            noHp: data.noHp || '',
            email: data.emailKomisariat || '',
            alamatDomisili: data.alamat || '',
            masaKhidmat: '2024-2026',
            statusPimpinan: data.status || 'Aktif',
            organisasi: data.organisasi || 'IPNU',
            kecamatan: data.kecamatan || '',
            zona: data.zona || '',
            koorzon: data.koorzon || '',
            pkDocId: docRef.id,
            pkId: data.pkId || '',
            jumlahAnggota: data.jumlahAnggota || 0,
            syncedFrom: 'pks',
            createdAt: new Date().toISOString(),
            createdBy: userId
          });
        }
      } catch (syncErr) {
        console.warn('Sync to pimpinan warning:', syncErr);
      }

      return docRef;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME, auth);
      throw error;
    }
  },

  updatePK: async (id: string, data: Partial<MasterPK>, userId: string) => {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      });

      // Synchronize update into pimpinan collection
      try {
        const pimpinanQuery = query(collection(db, 'pimpinan'));
        const pimpinanSnap = await getDocs(pimpinanQuery);
        const matchingDoc = pimpinanSnap.docs.find(d => {
          const item = d.data();
          return item.jenis === 'PK' && (item.pkDocId === id || (data.namaPK && item.namaLembaga === data.namaPK));
        });

        if (matchingDoc) {
          const updatePayload: any = {
            updatedAt: new Date().toISOString()
          };
          if (data.namaPK) updatePayload.namaLembaga = data.namaPK;
          if (data.namaKetua !== undefined) updatePayload.namaKetua = data.namaKetua;
          if (data.noHp !== undefined) updatePayload.noHp = data.noHp;
          if (data.emailKomisariat !== undefined) updatePayload.email = data.emailKomisariat;
          if (data.alamat !== undefined) updatePayload.alamatDomisili = data.alamat;
          if (data.status !== undefined) updatePayload.statusPimpinan = data.status;
          if (data.kecamatan !== undefined) updatePayload.kecamatan = data.kecamatan;
          if (data.zona !== undefined) updatePayload.zona = data.zona;
          if (data.koorzon !== undefined) updatePayload.koorzon = data.koorzon;
          if (data.jumlahAnggota !== undefined) updatePayload.jumlahAnggota = data.jumlahAnggota;

          await updateDoc(doc(db, 'pimpinan', matchingDoc.id), updatePayload);
        }
      } catch (syncErr) {
        console.warn('Sync update to pimpinan warning:', syncErr);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`, auth);
      throw error;
    }
  },

  deletePK: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));

      // Optionally delete or unlink from pimpinan collection
      try {
        const pimpinanQuery = query(collection(db, 'pimpinan'));
        const pimpinanSnap = await getDocs(pimpinanQuery);
        const matchingDoc = pimpinanSnap.docs.find(d => {
          const item = d.data();
          return item.jenis === 'PK' && (item.pkDocId === id || item.syncedFrom === 'pks');
        });
        if (matchingDoc) {
          await deleteDoc(doc(db, 'pimpinan', matchingDoc.id));
        }
      } catch (syncErr) {
        console.warn('Sync delete to pimpinan warning:', syncErr);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`, auth);
      throw error;
    }
  },

  generatePkId: async (namaPK: string, zona: string) => {
    const q = query(collection(db, COLLECTION_NAME));
    const snapshot = await getDocs(q);
    const pksInZona = snapshot.docs.filter(doc => doc.data().zona === zona);
    const count = pksInZona.length + 1;
    const cleanNama = namaPK.replace(/\s+/g, '').toUpperCase();
    const cleanZona = zona.replace(/\s+/g, '').toUpperCase();
    return `${cleanNama}_${cleanZona}_${String(count).padStart(3, '0')}`;
  }
};
