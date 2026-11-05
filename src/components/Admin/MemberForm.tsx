import React, { useState } from 'react';
import { useFirebase } from '../FirebaseProvider';
import { collection, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/firebaseUtils';
import { auth } from '../../firebase';

export default function MemberForm() {
  const { db, user } = useFirebase();
  const [namaLengkap, setNamaLengkap] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'members'), {
        uid: user.uid,
        namaLengkap,
        createdAt: new Date().toISOString()
      });
      alert('Anggota berhasil disimpan');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'members', auth);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Form Anggota</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          type="text" 
          value={namaLengkap} 
          onChange={e => setNamaLengkap(e.target.value)} 
          placeholder="Nama Lengkap" 
          className="w-full p-2 border rounded" 
        />
        <button type="submit" className="w-full bg-emerald-600 text-white p-2 rounded">Simpan</button>
      </form>
    </div>
  );
}
