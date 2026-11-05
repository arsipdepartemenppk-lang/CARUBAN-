import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Download, Trash2, Edit2, 
  Calendar, CheckCircle, Clock, X, Eye, FileDown, Upload, Camera
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { DocumentScanner } from '../components/DocumentScanner';
import { uploadMedia } from '../utils/uploadUtils';
import { formatDisplayDate } from '../utils/dateUtils';

export interface SuratMasukItem {
  id: string;
  nomorSurat: string;
  tanggalSurat: string;
  tanggalTerima: string;
  asalSurat: string;
  perihal: string;
  disposisi?: string;
  status: 'Diterima' | 'Diproses' | 'Diarsipkan';
  fileUrl?: string;
  createdAt?: string;
}

export const SuratMasuk: React.FC = () => {
  const { user } = useFirebase();
  const { showToast } = useToast();
  const [suratList, setSuratList] = useState<SuratMasukItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState<{
    nomorSurat: string;
    tanggalSurat: string;
    tanggalTerima: string;
    asalSurat: string;
    perihal: string;
    disposisi: string;
    status: SuratMasukItem['status'];
    fileUrl: string;
  }>({
    nomorSurat: '',
    tanggalSurat: new Date().toISOString().slice(0, 10),
    tanggalTerima: new Date().toISOString().slice(0, 10),
    asalSurat: '',
    perihal: '',
    disposisi: 'Ketua Cabang / Sekretaris',
    status: 'Diterima',
    fileUrl: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'suratMasuk'), orderBy('tanggalTerima', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SuratMasukItem));
      setSuratList(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching suratMasuk:', err);
      showToast('Gagal memuat surat masuk', 'error');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomorSurat.trim() || !formData.asalSurat.trim()) {
      showToast('Nomor surat dan asal surat wajib diisi', 'error');
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'suratMasuk', editingId), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        showToast('Data surat masuk diperbarui', 'success');
      } else {
        await addDoc(collection(db, 'suratMasuk'), {
          ...formData,
          createdAt: new Date().toISOString(),
          createdBy: user?.uid || 'system'
        });
        showToast('Surat masuk baru berhasil dicatat', 'success');
      }
      setIsModalOpen(false);
      setEditingId(null);
    } catch (err: any) {
      showToast('Gagal menyimpan: ' + err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'suratMasuk', deleteConfirmId));
      showToast('Surat berhasil dihapus', 'success');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };

  const handleScanUpload = async (blob: Blob) => {
    if (!user) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadMedia(blob, 'surat_masuk', user.uid, (progress) => {
        setUploadProgress(progress);
      });
      setFormData(prev => ({ ...prev, fileUrl: url }));
      showToast('Scan dokumen berhasil diunggah', 'success');
    } catch (err: any) {
      showToast('Gagal mengunggah scan: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleExport = () => {
    const exportData = suratList.map(s => ({
      'Nomor Surat': s.nomorSurat,
      'Tanggal Surat': s.tanggalSurat,
      'Tanggal Terima': s.tanggalTerima,
      'Asal Surat / Pengirim': s.asalSurat,
      'Perihal': s.perihal,
      'Disposisi': s.disposisi || '-',
      'Status': s.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Surat Masuk');
    XLSX.writeFile(wb, `Buku_Agenda_Surat_Masuk_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Buku agenda surat masuk diunduh', 'success');
  };

  const filtered = suratList.filter(s => 
    s.nomorSurat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.asalSurat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.perihal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Agenda Persuratan
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <FileText className="text-indigo-400" />
            Buku Agenda Surat Masuk
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Pencatatan dan arsip digital seluruh surat masuk ke PC IPNU Kabupaten Cirebon.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all shadow-sm"
          >
            <Download size={16} className="text-indigo-400" />
            Export Excel
          </button>

          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                nomorSurat: '',
                tanggalSurat: new Date().toISOString().slice(0, 10),
                tanggalTerima: new Date().toISOString().slice(0, 10),
                asalSurat: '',
                perihal: '',
                disposisi: 'Ketua Cabang / Sekretaris',
                status: 'Diterima',
                fileUrl: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus size={16} /> Catat Surat Masuk
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-main)] shadow-sm">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Cari nomor surat, pengirim, atau perihal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-main)] bg-[var(--bg-app)]/50 text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-black">
                <th className="py-4 px-6">Nomor & Tanggal</th>
                <th className="py-4 px-6">Asal Surat / Pengirim</th>
                <th className="py-4 px-6">Perihal</th>
                <th className="py-4 px-6">Status & Disposisi</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat arsip surat masuk...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                    Tidak ada surat masuk yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--bg-app)]/40 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-[11px]">
                        {s.nomorSurat}
                      </span>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                        <Calendar size={11} /> Terima: {formatDisplayDate(s.tanggalTerima)}
                      </p>
                    </td>

                    <td className="py-4 px-6 font-bold text-[var(--text-main)]">
                      {s.asalSurat}
                    </td>

                    <td className="py-4 px-6 text-[var(--text-main)]">
                      <p className="line-clamp-2">{s.perihal}</p>
                    </td>

                    <td className="py-4 px-6">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase",
                        s.status === 'Diarsipkan' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        s.status === 'Diproses' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      )}>
                        {s.status}
                      </span>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">{s.disposisi}</p>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.fileUrl && (
                          <a
                            href={s.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-[var(--bg-app)] hover:text-emerald-400 text-xs font-bold text-[var(--text-muted)] transition-colors"
                            title="Lihat Berkas"
                          >
                            <Eye size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setEditingId(s.id);
                            setFormData({
                              nomorSurat: s.nomorSurat,
                              tanggalSurat: s.tanggalSurat,
                              tanggalTerima: s.tanggalTerima,
                              asalSurat: s.asalSurat,
                              perihal: s.perihal,
                              disposisi: s.disposisi || '',
                              status: s.status,
                              fileUrl: s.fileUrl || ''
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-[var(--bg-app)] hover:text-indigo-400 text-xs font-bold text-[var(--text-muted)] transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(s.id)}
                          className="p-2 rounded-xl bg-[var(--bg-app)] hover:text-rose-400 text-xs font-bold text-[var(--text-muted)] transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-xl p-6 md:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[var(--border-main)]">
                <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                  <FileText className="text-indigo-400" />
                  {editingId ? 'Edit Surat Masuk' : 'Pencatatan Surat Masuk Baru'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Nomor Surat Asli</label>
                  <input
                    type="text"
                    required
                    value={formData.nomorSurat}
                    onChange={(e) => setFormData({ ...formData, nomorSurat: e.target.value })}
                    placeholder="Contoh: 015/PAC-IPNU/SR/IV/2026"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Tanggal Surat</label>
                    <input
                      type="date"
                      required
                      value={formData.tanggalSurat}
                      onChange={(e) => setFormData({ ...formData, tanggalSurat: e.target.value })}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Tanggal Diterima</label>
                    <input
                      type="date"
                      required
                      value={formData.tanggalTerima}
                      onChange={(e) => setFormData({ ...formData, tanggalTerima: e.target.value })}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Asal Surat / Instansi Pengirim</label>
                  <input
                    type="text"
                    required
                    value={formData.asalSurat}
                    onChange={(e) => setFormData({ ...formData, asalSurat: e.target.value })}
                    placeholder="Contoh: PAC IPNU Kecamatan Sumber / Dinas Pendidikan"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Perihal / Isi Ringkas</label>
                  <textarea
                    rows={2}
                    required
                    value={formData.perihal}
                    onChange={(e) => setFormData({ ...formData, perihal: e.target.value })}
                    placeholder="Contoh: Permohonan Pengesahan Struktur Kepengurusan PAC"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Disposisi</label>
                    <input
                      type="text"
                      value={formData.disposisi}
                      onChange={(e) => setFormData({ ...formData, disposisi: e.target.value })}
                      placeholder="Ketua / Sekretaris / Tim Kaderisasi"
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Diterima">Diterima</option>
                      <option value="Diproses">Diproses</option>
                      <option value="Diarsipkan">Diarsipkan</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Lampiran Digital (Scan)</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[var(--border-main)] text-[var(--text-muted)] hover:border-indigo-500 hover:text-indigo-400 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      <Camera size={16} /> {formData.fileUrl ? 'Ganti Scan' : 'Scan Dokumen'}
                    </button>
                    {formData.fileUrl && (
                      <div className="w-12 h-12 rounded-xl border border-[var(--border-main)] overflow-hidden bg-black/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle size={20} />
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div className="mt-2 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-main)]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95"
                  >
                    Simpan Surat
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Hapus Surat Masuk"
        message="Yakin ingin menghapus arsip surat masuk ini?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
      <DocumentScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onUpload={handleScanUpload}
        title="Scan Surat Masuk"
      />
    </div>
  );
};

export default SuratMasuk;
