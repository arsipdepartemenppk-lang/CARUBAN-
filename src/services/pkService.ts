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
      return await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        createdAt: new Date().toISOString(),
        createdBy: userId
      });
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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`, auth);
      throw error;
    }
  },

  deletePK: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
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
