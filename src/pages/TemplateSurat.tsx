import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Edit2, Download, Printer, Copy, Check, Eye, 
  Sparkles, Shield, Bookmark, Search, RefreshCw, Send, ChevronRight,
  Layers, Users, CheckCircle, FileCheck
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { useToast } from '../components/Toast';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface LetterTemplate {
  id: string;
  name: string;
  type: string;
  organisasi: 'IPNU' | 'IPPNU' | 'BERSAMA';
  category: 'Internal' | 'Eksternal' | 'SK' | 'Mandat';
  indeks: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08';
  subject?: string;
  body: string;
  createdAt?: string;
}

const DEFAULT_TEMPLATES: Omit<LetterTemplate, 'id'>[] = [
  {
    name: 'Surat Undangan Rapat / Kegiatan (IPNU)',
    type: 'Undangan',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    subject: 'Undangan Rapat Koordinasi Cabang (Rakorcab)',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: -
Perihal: Undangan Rapat Koordinasi

Kepada Yang Terhormat,
Rekan Ketua Pimpinan Anak Cabang & Pimpinan Komisariat IPNU Se-Kabupaten Cirebon
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh

Bismillahirrohmanirrohim
Salam silaturrahim teriring doa kami sampaikan, semoga Rekan senantiasa dalam lindungan Allah SWT serta sukses dalam menjalankan aktifitas sehari-hari. Aamiin.

Sehubungan dengan akan dilaksanakannya agenda Rapat Koordinasi Pimpinan Cabang IPNU Kabupaten Cirebon, maka dengan ini kami mengundang Rekan-rekan untuk dapat hadir pada:

Hari/Tanggal: [HARI_TANGGAL]
Waktu: [WAKTU] WIB s/d Selesai
Tempat: [TEMPAT]
Agenda: [AGENDA]

Mengingat pentingnya agenda tersebut, kami sangat mengharapkan kehadiran Rekan tepat pada waktunya.

Demikian surat undangan ini kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.

Wallahul Muwaffiq Ila Aqwamith Thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Undangan Rapat / Kegiatan (IPPNU)',
    type: 'Undangan',
    organisasi: 'IPPNU',
    category: 'Internal',
    indeks: '03',
    subject: 'Undangan Rapat Pleno PC IPPNU',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: -
Perihal: Undangan Rapat Pleno

Kepada Yang Terhormat,
Rekanita Pengurus Pimpinan Anak Cabang & Pimpinan Komisariat IPPNU Se-Kabupaten Cirebon
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh

Bismillahirrohmanirrohim
Salam silaturrahim teriring doa kami sampaikan, semoga Rekanita senantiasa dalam naungan rahmat dan hidayah Allah SWT serta diberi kemudahan dalam berkhidmah di IPPNU. Aamiin.

Bersama ini Pimpinan Cabang Ikatan Pelajar Putri Nahdlatul Ulama (IPPNU) Kabupaten Cirebon mengundang Rekanita untuk hadir pada:

Hari/Tanggal: [HARI_TANGGAL]
Waktu: [WAKTU] WIB s/d Selesai
Tempat: [TEMPAT]
Agenda: [AGENDA]

Demikian undangan ini kami sampaikan. Atas kehadiran dan kerjasamanya dihaturkan banyak terima kasih.

Wallahul Muwaffiq Ila Aqwamith Thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Bersama IPNU - IPPNU (Kegiatan / Rakorcab)',
    type: 'Undangan',
    organisasi: 'BERSAMA',
    category: 'Internal',
    indeks: '03',
    subject: 'Undangan Rapat Koordinasi Gabungan IPNU - IPPNU',
    body: `Nomor: [NOMOR_LENGKAP_BERSAMA]
Lampiran: 1 (Satu) Lembar
Perihal: Undangan Rapat Gabungan IPNU & IPPNU

Kepada Yang Terhormat,
Rekan & Rekanita Ketua PAC serta PK IPNU - IPPNU Se-Kabupaten Cirebon
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh

Bismillahirrohmanirrohim
Puji syukur kehadirat Allah SWT yang senantiasa melimpahkan taufiq dan hidayah-Nya. Shalawat serta salam semoga senantiasa tercurah kepada Baginda Nabi Agung Muhammad SAW, keluarga, sahabat, dan para pengikutnya hingga akhir zaman.

Dalam rangka konsolidasi organisasi dan persiapan agenda kaderisasi terpadu di lingkungan Pelajar NU Kabupaten Cirebon, kami Pimpinan Cabang IPNU dan Pimpinan Cabang IPPNU Kabupaten Cirebon mengundang Rekan dan Rekanita untuk hadir pada:

Hari/Tanggal: [HARI_TANGGAL]
Waktu: [WAKTU] WIB s/d Selesai
Tempat: [TEMPAT]
Agenda: [AGENDA]

Mengingat strategisnya agenda konsolidasi bersama ini, kehadiran Rekan dan Rekanita sekalian merupakan amanah kebersamaan yang sangat kami harapkan.

Demikian surat undangan ini kami buat, atas perhatian dan kehadiran rekan-rekanita kami haturkan terima kasih.

Wallahul Muwaffiq Ila Aqwamith Thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Mandat Delegasi Resmi (IPNU)',
    type: 'Mandat',
    organisasi: 'IPNU',
    category: 'Mandat',
    indeks: '02',
    subject: 'Surat Mandat Utusan Kegiatan',
    body: `SURAT MANDAT
Nomor: [NOMOR_LENGKAP]

Bismillahirrohmanirrohim

Pimpinan Cabang Ikatan Pelajar Nahdlatul Ulama Kabupaten Cirebon, dengan ini memberikan mandat penuh kepada:

Nama: [NAMA_DELEGASI]
NIA: [NIA]
Jabatan: [JABATAN]
Alamat: [ALAMAT]

Untuk bertindak sebagai Utusan / Delegasi Resmi PC IPNU Kabupaten Cirebon dalam rangka mengikuti kegiatan [NAMA_KEGIATAN] yang diselenggarakan pada:

Hari/Tanggal: [HARI_TANGGAL]
Waktu: [WAKTU] WIB s/d Selesai
Tempat: [TEMPAT]

Demikian surat mandat ini diberikan agar dapat dilaksanakan dengan penuh dedikasi dan tanggung jawab demi kejayaan Islam Ahlussunnah wal Jama'ah dan kemajuan organisasi IPNU.

Wallahul Muwaffiq Ila Aqwamith Thariq`,
  },
  {
    name: 'Surat Mandat Delegasi Resmi (IPPNU)',
    type: 'Mandat',
    organisasi: 'IPPNU',
    category: 'Mandat',
    indeks: '02',
    subject: 'Surat Mandat Utusan Kegiatan',
    body: `SURAT MANDAT
Nomor: [NOMOR_LENGKAP]

Bismillahirrohmanirrohim

Pimpinan Cabang Ikatan Pelajar Putri Nahdlatul Ulama Kabupaten Cirebon, dengan ini memberikan mandat kehormatan kepada:

Nama: [NAMA_DELEGASI]
NIA: [NIA]
Jabatan: [JABATAN]
Alamat: [ALAMAT]

Untuk bertindak sebagai Utusan / Delegasi Resmi PC IPPNU Kabupaten Cirebon dalam rangka mengikuti kegiatan [NAMA_KEGIATAN] yang diselenggarakan pada:

Hari/Tanggal: [HARI_TANGGAL]
Waktu: [WAKTU] WIB s/d Selesai
Tempat: [TEMPAT]

Demikian surat mandat ini diberikan untuk dipergunakan sebagaimana mestinya dan dilaksanakan dengan sungguh-sungguh.

Wallahul Muwaffiq Ila Aqwamith Thariq`,
  },
  {
    name: 'Surat Keterangan Aktif (IPNU / IPPNU)',
    type: 'Keterangan',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '07',
    subject: 'Surat Keterangan Aktif Organisasi',
    body: `SURAT KETERANGAN AKTIF
Nomor: [NOMOR_LENGKAP]

Bismillahirrohmanirrohim

Yang bertanda tangan di bawah ini Pimpinan Cabang Ikatan Pelajar Nahdlatul Ulama Kabupaten Cirebon, menerangkan dengan sesungguhnya bahwa:

Nama: [NAMA_DELEGASI]
NIA: [NIA]
Jabatan: [JABATAN]
Alamat: [ALAMAT]

Adalah benar-benar kader / pengurus aktif pada jajaran kepengurusan Pimpinan Cabang IPNU Kabupaten Cirebon masa khidmat 2024–2026, memiliki rekam jejak loyalitas yang baik, serta berdedikasi tinggi terhadap persyarikatan Nahdlatul Ulama.

Surat keterangan ini diterbitkan dengan sebenarnya untuk dipergunakan sebagai kelengkapan administrasi [AGENDA].

Demikian surat keterangan ini kami buat agar dapat dipergunakan sebagaimana mestinya.

Wallahul Muwaffiq Ila Aqwamith Thariq`,
  }
];

export const TemplateSurat: React.FC = () => {
  const { user } = useFirebase();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganisasi, setSelectedOrganisasi] = useState<'ALL' | 'IPNU' | 'IPPNU' | 'BERSAMA'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Administrative Numbering Controls (Berdasarkan Pedoman Persuratan PP IPNU & IPPNU)
  const [selectedOrgChoice, setSelectedOrgChoice] = useState<'IPNU' | 'IPPNU' | 'BERSAMA'>('IPNU');
  const [nomorUrut, setNomorUrut] = useState('048');
  const [klasifikasi, setKlasifikasi] = useState<'A' | 'B'>('A'); // A = Internal, B = Eksternal
  const [indeksSurat, setIndeksSurat] = useState('03'); // 01=SK, 02=Mandat, 03=Undangan, 04=Permohonan, 06=Rekomendasi, 07=Keterangan
  const [namaPihak, setNamaPihak] = useState('Ahmad Fauzi');
  const [niaPihak, setNiaPihak] = useState('10.20.001.0048');
  const [jabatanPihak, setJabatanPihak] = useState('Wakil Ketua Bidang Kaderisasi');
  const [alamatPihak, setAlamatPihak] = useState('Kecamatan Sumber, Kab. Cirebon');
  const [namaKegiatan, setNamaKegiatan] = useState('Latihan Kader Muda (LAKMUD) Raya');
  const [tanggalKegiatan, setTanggalKegiatan] = useState('Sabtu - Ahad, 24 - 25 Mei 2026');
  const [waktuKegiatan, setWaktuKegiatan] = useState('08.00');
  const [tempatKegiatan, setTempatKegiatan] = useState('Gedung PCNU Kabupaten Cirebon, Jl. R. Dewi Sartika No. 09 Sumber');
  const [agendaSurat, setAgendaSurat] = useState('Konsolidasi & Bedah Pedoman Kaderisasi');

  // Custom Signatories Form State
  const [ketuaIpnu, setKetuaIpnu] = useState('Rekan Syamsul Hidayat');
  const [sekretarisIpnu, setSekretarisIpnu] = useState('Rekan M. Wildan');
  const [ketuaIppnu, setKetuaIppnu] = useState('Rekanita Siti Fatimah');
  const [sekretarisIppnu, setSekretarisIppnu] = useState('Rekanita Nurul Azizah');

  // Custom Template Modal Form
  const [formData, setFormData] = useState({
    name: '',
    type: 'Undangan',
    organisasi: 'IPNU' as 'IPNU' | 'IPPNU' | 'BERSAMA',
    category: 'Internal' as 'Internal' | 'Eksternal' | 'SK' | 'Mandat',
    indeks: '03' as '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08',
    subject: '',
    body: ''
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'letterTemplates'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const dbTemplates = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LetterTemplate));
      const combined = [
        ...DEFAULT_TEMPLATES.map((t, idx) => ({ id: `default-${idx}`, ...t })),
        ...dbTemplates
      ];
      setTemplates(combined);
      if (!selectedTemplate && combined.length > 0) {
        setSelectedTemplate(combined[0]);
        setSelectedOrgChoice(combined[0].organisasi);
      }
    }, (err) => {
      console.warn('Load letter templates notice:', err);
      const defaults = DEFAULT_TEMPLATES.map((t, idx) => ({ id: `default-${idx}`, ...t }));
      setTemplates(defaults);
      if (!selectedTemplate) {
        setSelectedTemplate(defaults[0]);
        setSelectedOrgChoice(defaults[0].organisasi);
      }
    });

    return () => unsub();
  }, []);

  // Compute Standard Roman Month & Year
  const getRomanMonth = () => {
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romanMonths[new Date().getMonth()];
  };
  const currentYear = new Date().getFullYear().toString();

  // Generate Official Pedoman Persuratan Numbers:
  // IPNU: [No]/PC/A/[Indeks]/10.20/[Bulan Romawi]/[Tahun] (10 = Wilayah Jabar, 20 = Cabang Kab. Cirebon)
  // IPPNU: [No]/PC/A/PP-IPPNU/[Indeks]/10.20/[Bulan Romawi]/[Tahun]
  const computedIpnuNumber = `${nomorUrut}/PC/${klasifikasi}/${indeksSurat}/10.20/${getRomanMonth()}/${currentYear}`;
  const computedIppnuNumber = `${nomorUrut}/PC/${klasifikasi}/PP-IPPNU/${indeksSurat}/10.20/${getRomanMonth()}/${currentYear}`;
  const computedBersamaNumber = `IPNU: ${computedIpnuNumber}\nIPPNU: ${computedIppnuNumber}`;

  const getComputedLetterBody = () => {
    if (!selectedTemplate) return '';
    let body = selectedTemplate.body;

    const fullNumber = selectedOrgChoice === 'IPNU' 
      ? computedIpnuNumber 
      : selectedOrgChoice === 'IPPNU' 
      ? computedIppnuNumber 
      : `${computedIpnuNumber} / ${computedIppnuNumber}`;

    body = body.replace(/\[NOMOR_LENGKAP\]/g, fullNumber);
    body = body.replace(/\[NOMOR_LENGKAP_BERSAMA\]/g, computedBersamaNumber);
    body = body.replace(/\[NAMA_DELEGASI\]/g, namaPihak || '....................');
    body = body.replace(/\[NIA\]/g, niaPihak || '....................');
    body = body.replace(/\[JABATAN\]/g, jabatanPihak || '....................');
    body = body.replace(/\[ALAMAT\]/g, alamatPihak || '....................');
    body = body.replace(/\[NAMA_KEGIATAN\]/g, namaKegiatan || '....................');
    body = body.replace(/\[HARI_TANGGAL\]/g, tanggalKegiatan || '....................');
    body = body.replace(/\[WAKTU\]/g, waktuKegiatan || '08.00');
    body = body.replace(/\[TEMPAT\]/g, tempatKegiatan || '....................');
    body = body.replace(/\[AGENDA\]/g, agendaSurat || '....................');

    return body;
  };

  const handleCopy = () => {
    const text = getComputedLetterBody();
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Teks surat resmi berhasil disalin ke clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSelectTemplate = (t: LetterTemplate) => {
    setSelectedTemplate(t);
    setSelectedOrgChoice(t.organisasi);
    setIndeksSurat(t.indeks || '03');
  };

  const filteredTemplates = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        t.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchOrg = selectedOrganisasi === 'ALL' || t.organisasi === selectedOrganisasi;
    return matchSearch && matchOrg;
  });

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Pedoman Persuratan PP IPNU & PP IPPNU
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300">
              Kode Wilayah: 10.20 (Cirebon)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)]">
            Generator Surat Resmi IPNU & IPPNU
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Format baku persuratan dan administrasi resmi PC IPNU, PC IPPNU, serta Surat Bersama Kabupaten Cirebon.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all active:scale-95 shadow-sm"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Tersalin' : 'Salin Surat'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-900/30 active:scale-95 transition-all"
          >
            <Printer size={15} /> Cetak / Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template List & Selection */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-main)] space-y-3 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Cari template surat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl py-2.5 pl-10 pr-4 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Organisasi */}
            <div className="flex gap-1.5 p-1 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-main)] text-[10px] font-black uppercase">
              {(['ALL', 'IPNU', 'IPPNU', 'BERSAMA'] as const).map(org => (
                <button
                  key={org}
                  onClick={() => setSelectedOrganisasi(org)}
                  className={cn(
                    "flex-1 py-1.5 rounded-xl transition-all",
                    selectedOrganisasi === org 
                      ? "bg-emerald-600 text-white shadow-sm" 
                      : "text-[var(--text-muted)] hover:text-white"
                  )}
                >
                  {org === 'ALL' ? 'Semua' : org}
                </button>
              ))}
            </div>

            {/* Template Items List */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
              {filteredTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1 relative group",
                    selectedTemplate?.id === t.id
                      ? "bg-emerald-600/10 border-emerald-500/40 text-[var(--text-main)] shadow-sm"
                      : "bg-[var(--bg-app)]/50 border-[var(--border-main)] text-[var(--text-muted)] hover:border-emerald-500/20 hover:text-[var(--text-main)]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                      t.organisasi === 'IPNU' ? "bg-emerald-500/20 text-emerald-400" :
                      t.organisasi === 'IPPNU' ? "bg-teal-500/20 text-teal-300" :
                      "bg-amber-500/20 text-amber-300"
                    )}>
                      {t.organisasi} • {t.type}
                    </span>
                    <span className="text-[9px] text-zinc-500">Kode {t.indeks}</span>
                  </div>
                  <h4 className="font-bold text-xs leading-tight text-[var(--text-main)] mt-1">
                    {t.name}
                  </h4>
                  {t.subject && (
                    <p className="text-[10px] text-zinc-500 truncate">{t.subject}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Form Pengaturan Nomor & Standar Persuratan */}
          <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-main)] space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[var(--border-main)] pb-3">
              <Shield size={16} className="text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                Parameter Format Nomor Baku PP
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">
                  Pilihan Badan Organisasi
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['IPNU', 'IPPNU', 'BERSAMA'] as const).map(org => (
                    <button
                      key={org}
                      type="button"
                      onClick={() => setSelectedOrgChoice(org)}
                      className={cn(
                        "py-2 px-1 text-[10px] font-black uppercase rounded-xl border transition-all text-center",
                        selectedOrgChoice === org
                          ? "bg-emerald-600 text-white border-emerald-500"
                          : "bg-[var(--bg-app)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-white"
                      )}
                    >
                      {org}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">No. Urut</label>
                  <input
                    type="text"
                    value={nomorUrut}
                    onChange={(e) => setNomorUrut(e.target.value)}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-2.5 py-1.5 text-xs text-center font-mono font-bold text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Klasifikasi</label>
                  <select
                    value={klasifikasi}
                    onChange={(e) => setKlasifikasi(e.target.value as 'A' | 'B')}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-2 py-1.5 text-xs text-center font-bold text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="A">A (Internal)</option>
                    <option value="B">B (Eksternal)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Indeks</label>
                  <select
                    value={indeksSurat}
                    onChange={(e) => setIndeksSurat(e.target.value)}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-2 py-1.5 text-xs text-center font-bold text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="01">01 (SK)</option>
                    <option value="02">02 (Mandat)</option>
                    <option value="03">03 (Undangan)</option>
                    <option value="04">04 (Permohonan)</option>
                    <option value="05">05 (Pemberitahuan)</option>
                    <option value="06">06 (Rekomendasi)</option>
                    <option value="07">07 (Keterangan)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Number Preview */}
              <div className="p-3 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-main)]">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-0.5">Nomor Terbentuk:</span>
                <p className="font-mono text-[11px] font-black text-emerald-400 break-all leading-tight">
                  {selectedOrgChoice === 'IPNU' ? computedIpnuNumber : selectedOrgChoice === 'IPPNU' ? computedIppnuNumber : computedBersamaNumber}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Editor & Official Document Preview */}
        <div className="lg:col-span-8 space-y-6">
          {/* Customization Variable Inputs */}
          <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-main)] space-y-3 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)] border-b border-[var(--border-main)] pb-2 flex items-center gap-2">
              <Edit2 size={14} className="text-emerald-400" />
              Variabel Konten Surat
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Nama Penerima / Delegasi</label>
                <input
                  type="text"
                  value={namaPihak}
                  onChange={(e) => setNamaPihak(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">NIA (Nomor Induk Anggota)</label>
                <input
                  type="text"
                  value={niaPihak}
                  onChange={(e) => setNiaPihak(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Jabatan / Penugasan</label>
                <input
                  type="text"
                  value={jabatanPihak}
                  onChange={(e) => setJabatanPihak(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Hari & Tanggal Pelaksanaan</label>
                <input
                  type="text"
                  value={tanggalKegiatan}
                  onChange={(e) => setTanggalKegiatan(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Tempat / Lokasi</label>
                <input
                  type="text"
                  value={tempatKegiatan}
                  onChange={(e) => setTempatKegiatan(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Letter Document Preview Sheet (Printed Standard Layout) */}
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] overflow-hidden shadow-2xl">
            {/* Top Sheet Bar */}
            <div className="p-3.5 bg-[var(--bg-app)]/80 border-b border-[var(--border-main)] flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                <FileCheck size={16} className="text-emerald-400" />
                Lembar Pratinjau Surat Resmi A4 (Standar PP)
              </span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Format: {selectedOrgChoice}
              </span>
            </div>

            {/* Printable White Sheet Container */}
            <div className="p-6 md:p-12 bg-white text-black font-serif overflow-x-auto min-h-[750px]" ref={printRef}>
              <div className="max-w-[700px] mx-auto space-y-6">
                {/* 1. KOP SURAT RESMI SESUAI ORGANISASI */}
                {selectedOrgChoice === 'IPNU' && (
                  <div className="flex items-center justify-between border-b-4 border-double border-emerald-900 pb-3 text-center">
                    <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                      <img 
                        src="https://res.cloudinary.com/dxsbefd16/image/upload/q_auto/f_auto/v1775730419/Logo_CARUBAN_CORE_dengan_motif_Mega_Mendung-removebg-preview_gszxaq.png" 
                        alt="Logo IPNU" 
                        className="w-16 h-16 object-contain"
                      />
                    </div>
                    <div className="flex-1 px-4">
                      <h2 className="text-sm font-bold tracking-widest text-emerald-950 uppercase font-sans">
                        PIMPINAN CABANG
                      </h2>
                      <h1 className="text-xl font-black tracking-tight text-emerald-900 uppercase font-sans">
                        IKATAN PELAJAR NAHDLATUL ULAMA
                      </h1>
                      <h3 className="text-sm font-black tracking-wider text-emerald-800 uppercase font-sans">
                        KABUPATEN CIREBON
                      </h3>
                      <p className="text-[10px] font-sans text-gray-700 mt-1 leading-tight">
                        Sekretariat: Gedung PCNU Kab. Cirebon Jl. R. Dewi Sartika No. 09 Sumber - Cirebon 45611<br />
                        Email: pcipnucirebon@gmail.com | Website: caruban-core.web.id
                      </p>
                    </div>
                    <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border border-dashed border-emerald-800/40 flex items-center justify-center text-[11px] font-sans font-black text-emerald-800">
                        IPNU
                      </div>
                    </div>
                  </div>
                )}

                {selectedOrgChoice === 'IPPNU' && (
                  <div className="flex items-center justify-between border-b-4 border-double border-teal-900 pb-3 text-center">
                    <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border border-teal-600 flex items-center justify-center text-[11px] font-sans font-black text-teal-800 bg-teal-50">
                        IPPNU
                      </div>
                    </div>
                    <div className="flex-1 px-4">
                      <h2 className="text-sm font-bold tracking-widest text-teal-950 uppercase font-sans">
                        PIMPINAN CABANG
                      </h2>
                      <h1 className="text-xl font-black tracking-tight text-teal-900 uppercase font-sans">
                        IKATAN PELAJAR PUTRI NAHDLATUL ULAMA
                      </h1>
                      <h3 className="text-sm font-black tracking-wider text-teal-800 uppercase font-sans">
                        KABUPATEN CIREBON
                      </h3>
                      <p className="text-[10px] font-sans text-gray-700 mt-1 leading-tight">
                        Sekretariat: Gedung PCNU Kab. Cirebon Jl. R. Dewi Sartika No. 09 Sumber - Cirebon 45611<br />
                        Email: pcippnucirebon@gmail.com | Motto: Belajar, Berjuang, Bertaqwa
                      </p>
                    </div>
                    <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border border-dashed border-teal-800/40 flex items-center justify-center text-[10px] font-sans font-bold text-teal-800">
                        CIREBON
                      </div>
                    </div>
                  </div>
                )}

                {selectedOrgChoice === 'BERSAMA' && (
                  <div className="flex items-center justify-between border-b-4 border-double border-emerald-950 pb-3 text-center">
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center border border-emerald-600 rounded-full font-sans font-black text-xs text-emerald-800 bg-emerald-50">
                      IPNU
                    </div>
                    <div className="flex-1 px-3">
                      <h2 className="text-xs font-bold tracking-wider text-gray-900 uppercase font-sans">
                        PIMPINAN CABANG
                      </h2>
                      <h1 className="text-base font-black tracking-tight text-emerald-900 uppercase font-sans leading-tight">
                        IKATAN PELAJAR NAHDLATUL ULAMA<br />
                        IKATAN PELAJAR PUTRI NAHDLATUL ULAMA
                      </h1>
                      <h3 className="text-xs font-black tracking-wider text-emerald-800 uppercase font-sans mt-0.5">
                        KABUPATEN CIREBON
                      </h3>
                      <p className="text-[9.5px] font-sans text-gray-700 mt-1 leading-tight">
                        Sekretariat Bersama: Gedung PCNU Kab. Cirebon Jl. R. Dewi Sartika No. 09 Sumber 45611
                      </p>
                    </div>
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center border border-teal-600 rounded-full font-sans font-black text-xs text-teal-800 bg-teal-50">
                      IPPNU
                    </div>
                  </div>
                )}

                {/* 2. BODY KONTEN SURAT */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-gray-900 pt-2">
                  {getComputedLetterBody()}
                </div>

                {/* 3. TANDA TANGAN (SIGNATURES) SESUAI STANDAR PP */}
                {selectedOrgChoice === 'IPNU' && (
                  <div className="pt-10 grid grid-cols-2 text-center text-xs font-sans">
                    <div>
                      <p className="text-gray-600">Pimpinan Cabang IPNU Kab. Cirebon</p>
                      <p className="font-bold text-gray-900 mt-1">Ketua,</p>
                      <div className="h-16 flex items-center justify-center text-gray-300 italic text-[11px]">
                        (Tanda Tangan & Cap)
                      </div>
                      <p className="font-bold text-gray-900 underline uppercase">{ketuaIpnu}</p>
                      <p className="text-[10px] text-gray-600">NIA. 10.20.001.0001</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Pimpinan Cabang IPNU Kab. Cirebon</p>
                      <p className="font-bold text-gray-900 mt-1">Sekretaris,</p>
                      <div className="h-16 flex items-center justify-center text-gray-300 italic text-[11px]">
                        (Tanda Tangan)
                      </div>
                      <p className="font-bold text-gray-900 underline uppercase">{sekretarisIpnu}</p>
                      <p className="text-[10px] text-gray-600">NIA. 10.20.001.0002</p>
                    </div>
                  </div>
                )}

                {selectedOrgChoice === 'IPPNU' && (
                  <div className="pt-10 grid grid-cols-2 text-center text-xs font-sans">
                    <div>
                      <p className="text-gray-600">Pimpinan Cabang IPPNU Kab. Cirebon</p>
                      <p className="font-bold text-gray-900 mt-1">Ketua,</p>
                      <div className="h-16 flex items-center justify-center text-gray-300 italic text-[11px]">
                        (Tanda Tangan & Cap)
                      </div>
                      <p className="font-bold text-gray-900 underline uppercase">{ketuaIppnu}</p>
                      <p className="text-[10px] text-gray-600">NIA. 10.20.002.0001</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Pimpinan Cabang IPPNU Kab. Cirebon</p>
                      <p className="font-bold text-gray-900 mt-1">Sekretaris,</p>
                      <div className="h-16 flex items-center justify-center text-gray-300 italic text-[11px]">
                        (Tanda Tangan)
                      </div>
                      <p className="font-bold text-gray-900 underline uppercase">{sekretarisIppnu}</p>
                      <p className="text-[10px] text-gray-600">NIA. 10.20.002.0002</p>
                    </div>
                  </div>
                )}

                {selectedOrgChoice === 'BERSAMA' && (
                  <div className="pt-8 space-y-6 text-center text-xs font-sans">
                    <p className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                      PIMPINAN CABANG IPNU & IPPNU KABUPATEN CIREBON
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {/* IPNU Signatures */}
                      <div className="border border-emerald-900/20 p-3 rounded-xl bg-emerald-50/20">
                        <span className="text-[10px] font-black text-emerald-800 uppercase block mb-1">
                          Pimpinan Cabang IPNU
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <p className="font-bold">Ketua,</p>
                            <div className="h-12 flex items-center justify-center text-gray-300 italic text-[10px]">
                              (Ttd & Cap)
                            </div>
                            <p className="font-bold underline text-[10px] uppercase">{ketuaIpnu}</p>
                          </div>
                          <div>
                            <p className="font-bold">Sekretaris,</p>
                            <div className="h-12 flex items-center justify-center text-gray-300 italic text-[10px]">
                              (Ttd)
                            </div>
                            <p className="font-bold underline text-[10px] uppercase">{sekretarisIpnu}</p>
                          </div>
                        </div>
                      </div>

                      {/* IPPNU Signatures */}
                      <div className="border border-teal-900/20 p-3 rounded-xl bg-teal-50/20">
                        <span className="text-[10px] font-black text-teal-800 uppercase block mb-1">
                          Pimpinan Cabang IPPNU
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <p className="font-bold">Ketua,</p>
                            <div className="h-12 flex items-center justify-center text-gray-300 italic text-[10px]">
                              (Ttd & Cap)
                            </div>
                            <p className="font-bold underline text-[10px] uppercase">{ketuaIppnu}</p>
                          </div>
                          <div>
                            <p className="font-bold">Sekretaris,</p>
                            <div className="h-12 flex items-center justify-center text-gray-300 italic text-[10px]">
                              (Ttd)
                            </div>
                            <p className="font-bold underline text-[10px] uppercase">{sekretarisIppnu}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TemplateSurat;
