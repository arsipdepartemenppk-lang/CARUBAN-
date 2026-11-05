import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import { useToast } from '../components/Toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function ZakatFitrah() {
  const [jiwa, setJiwa] = useState(1);
  const [hargaBeras, setHargaBeras] = useState(15000);
  const { showToast } = useToast();

  const totalZakat = jiwa * 2.5 * hargaBeras;

  const handleSaveToKas = async () => {
    try {
      await addDoc(collection(db, 'kas_transaksi'), {
        tanggal: serverTimestamp(),
        keterangan: `Zakat Fitrah ${jiwa} jiwa`,
        jenis: 'masuk',
        nominal: totalZakat,
        saldoSetelah: 0
      });
      showToast('Zakat Fitrah berhasil dicatat ke Kas', 'success');
    } catch (error) {
      console.error('Error saving to Kas:', error);
      showToast('Gagal mencatat ke Kas', 'error');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto pt-20 bg-[var(--bg-app)] text-[var(--text-main)] min-h-screen">
      <h1 className="text-3xl font-black uppercase tracking-tighter mb-8">Kalkulator Zakat Fitrah</h1>
      
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-8 space-y-6">
        <div>
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Jumlah Jiwa</label>
          <input type="number" value={jiwa} onChange={(e) => setJiwa(parseInt(e.target.value) || 0)} className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl p-4 mt-1" />
        </div>

        <div>
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Harga Beras per Kg (Rp)</label>
          <input type="number" value={hargaBeras} onChange={(e) => setHargaBeras(parseInt(e.target.value) || 0)} className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl p-4 mt-1" />
        </div>
        
        <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
          <p className="text-sm font-bold text-emerald-600">Total Zakat Fitrah: Rp {totalZakat.toLocaleString('id-ID')}</p>
        </div>

        <button onClick={handleSaveToKas} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
          <Wallet size={20} />
          Catat ke Kas
        </button>
      </div>
    </div>
  );
}
