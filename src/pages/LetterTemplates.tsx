import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../components/Toast';

interface Template {
  id: string;
  name: string;
  type: string;
  body: string;
}

export const LetterTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: '', body: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchTemplates = async () => {
      const snapshot = await getDocs(collection(db, 'letterTemplates'));
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Template)));
    };
    fetchTemplates();
  }, []);

  const handleSave = async () => {
    if (editingId) {
      await updateDoc(doc(db, 'letterTemplates', editingId), formData);
      setTemplates(templates.map(t => t.id === editingId ? { ...t, ...formData } : t));
    } else {
      const docRef = await addDoc(collection(db, 'letterTemplates'), formData);
      setTemplates([...templates, { id: docRef.id, ...formData }]);
    }
    setIsModalOpen(false);
    setFormData({ name: '', type: '', body: '' });
    setEditingId(null);
    showToast('Template berhasil disimpan', 'success');
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'letterTemplates', id));
    setTemplates(templates.filter(t => t.id !== id));
    showToast('Template berhasil dihapus', 'success');
  };

  return (
    <div className="p-8 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)]">
      <h1 className="text-3xl font-black mb-8">Letter Templates</h1>
      <button onClick={() => setIsModalOpen(true)} className="bg-purple-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 mb-6">
        <Plus size={20} /> Tambah Template
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(t => (
          <div key={t.id} className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-main)]">
            <h3 className="font-bold text-lg">{t.name}</h3>
            <p className="text-[var(--text-muted)] text-sm mb-4">{t.type}</p>
            <div className="flex gap-2">
              <button onClick={() => { setEditingId(t.id); setFormData(t); setIsModalOpen(true); }} className="p-2 bg-[var(--bg-app)] rounded-lg border border-[var(--border-main)]"><Edit2 size={16} /></button>
              <button onClick={() => handleDelete(t.id)} className="p-2 bg-rose-900/20 text-rose-500 rounded-lg"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-6 rounded-3xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-[var(--text-main)]">{editingId ? 'Edit Template' : 'Tambah Template'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X /></button>
            </div>
            <input type="text" placeholder="Nama Template" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-3 mb-4 text-[var(--text-main)]" />
            <input type="text" placeholder="Tipe" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-3 mb-4 text-[var(--text-main)]" />
            <textarea placeholder="Isi Template" value={formData.body} onChange={(e) => setFormData({...formData, body: e.target.value})} className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-3 mb-4 h-32 text-[var(--text-main)]" />
            <button onClick={handleSave} className="w-full bg-purple-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-white">
              <Save size={20} /> Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LetterTemplates;
