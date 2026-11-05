import React, { useState } from 'react';
import { 
  Info, ShieldCheck, LogIn, LayoutDashboard, 
  Mail, Users, BarChart3, Download, Home, FileText, CheckCircle, 
  Calendar, MessageSquare, Building, Map, GraduationCap, 
  Book, Brain, Trophy, Settings, Smartphone, AlertTriangle, Phone,
  UserCheck, Edit3, ListChecks 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { useToast } from '../components/Toast';

const Panduan: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('pendahuluan');

  const roles = [
    {
      title: 'Administrator (Admin)',
      icon: ShieldCheck,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      description: 'Memiliki kontrol penuh atas seluruh sistem dan data.',
      access: [
        'Mengelola semua pengguna dan menetapkan role (Admin, PC, PK, Anggota).',
        'Mengakses dan mengedit semua data master (PK, Anggota, Surat).',
        'Melihat seluruh statistik dan laporan organisasi.',
        'Mengelola pengaturan sistem dan keamanan.'
      ]
    },
    {
      title: 'Pimpinan Cabang (PC)',
      icon: Building,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: 'Pengurus tingkat cabang yang memantau seluruh komisariat.',
      access: [
        'Melihat data anggota dari seluruh Pimpinan Komisariat (PK).',
        'Memverifikasi surat dan memantau administrasi tingkat cabang.',
        'Mengelola Modul Core dan Evaluasi untuk kaderisasi.',
        'Melihat laporan dan statistik gabungan seluruh PK.'
      ]
    },
    {
      title: 'Pimpinan Komisariat (PK)',
      icon: Map,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      description: 'Pengurus tingkat komisariat yang mengelola anggotanya sendiri.',
      access: [
        'Menambah, mengedit, dan memverifikasi anggota di komisariatnya.',
        'Mengelola surat masuk dan keluar khusus tingkat komisariat.',
        'Melaporkan data visitasi dan perkembangan kader di lingkupnya.',
        'Melihat statistik khusus untuk komisariatnya sendiri.'
      ]
    },
    {
      title: 'Anggota Biasa',
      icon: Users,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      description: 'Pengguna umum yang tergabung dalam organisasi.',
      access: [
        'Mengakses dan memperbarui profil pribadi.',
        'Menggunakan fitur ibadah (Amaliah & Al-Quran).',
        'Membaca Modul Core dan mengikuti Evaluasi.',
        'Berkomunikasi melalui Chat E2EE dan melihat Leaderboard.'
      ]
    }
  ];

  const formGuides = [
    {
      title: 'Formulir Pendaftaran / Tambah Anggota',
      description: 'Digunakan untuk memasukkan data anggota baru ke dalam sistem.',
      fields: [
        { name: 'Nomor Induk Anggota (NIA)', instruction: 'Format: 32.09.YY.XXXX. Terdiri dari angka dan tanda titik.' },
        { name: 'Nama Lengkap', instruction: 'Isi dengan nama lengkap sesuai identitas resmi tanpa gelar.' },
        { name: 'Tempat & Tanggal Lahir', instruction: 'Pilih tanggal dari kalender yang disediakan. Tempat lahir diisi dengan nama kota/kabupaten.' },
        { name: 'Foto Profil', instruction: 'Unggah pas foto formal. Format yang didukung: JPG, PNG. Ukuran maksimal 2MB. Sistem akan otomatis mengkompresi foto.' },
        { name: 'Titik Koordinat (Lokasi)', instruction: 'Gunakan tombol "Pilih di Peta" atau masukkan koordinat untuk menandai domisili anggota secara akurat.' },
        { name: 'Minat & Bakat', instruction: 'Pilih satu atau lebih minat dari pilihan untuk pemetaan potensi kader.' }
      ]
    },
    {
      title: 'Formulir Surat Masuk & Keluar',
      description: 'Digunakan untuk pengarsipan administrasi persuratan.',
      fields: [
        { name: 'Nomor Surat', instruction: 'Ketik nomor surat secara lengkap sesuai dengan fisik surat (contoh: 01/PC/A.I/IX/2026).' },
        { name: 'Tanggal Surat & Diterima', instruction: 'Tanggal Surat adalah tanggal yang tertera di fisik surat. Tanggal Diterima adalah tanggal surat tersebut sampai ke sekretariat.' },
        { name: 'Klasifikasi', instruction: 'Pilih tingkat urgensi: Biasa (info umum), Segera (butuh respon cepat), atau Penting (dokumen krusial/rahasia).' },
        { name: 'File Lampiran', instruction: 'Unggah hasil scan surat. Format PDF atau DOCX. Maksimal 5MB.' }
      ]
    },
    {
      title: 'Formulir Data Visitasi',
      description: 'Digunakan oleh pengurus (PC/PK) untuk melaporkan hasil kunjungan.',
      fields: [
        { name: 'Tujuan Visitasi', instruction: 'Pilih PK yang dikunjungi dari daftar dropdown.' },
        { name: 'Tanggal & Waktu', instruction: 'Tentukan kapan visitasi dilaksanakan.' },
        { name: 'Catatan Evaluasi', instruction: 'Isi dengan hasil temuan, diskusi, atau rekomendasi dari visitasi tersebut. Jelaskan secara detail.' },
        { name: 'Dokumentasi (Media)', instruction: 'Unggah foto-foto kegiatan visitasi. Anda dapat mengunggah beberapa foto sekaligus.' }
      ]
    }
  ];

  const menuGuides = [
    {
      title: 'Beranda (Executive Dashboard)',
      icon: Home,
      content: 'Dashboard interaktif yang berfungsi sebagai pusat komando dan ruang sosial internal.',
      features: [
        'Ringkasan Eksekutif: Menampilkan metrik kunci seperti total anggota, jumlah surat, dan agenda terdekat.',
        'Manajemen Publikasi: Berbagi teks, gambar, maupun video internal.',
        'Interaksi Sosial Terukur: Fitur Like, Komentar, dan simpan postingan.',
        'Fitur Stories: Publikasi cerita 24 jam dengan opsi musik pengiring.'
      ]
    },
    {
      title: 'Manajemen Data Anggota',
      icon: Users,
      content: 'Sistem Pengelolaan Basis Data komprehensif untuk mendata dan menganalisis demografi seluruh anggota organisasi.',
      features: [
        'Registrasi Komprehensif: Formulir penambahan anggota dengan validasi data ketat dan pas foto.',
        'Pencarian & Filter Lanjutan: Filter berdasarkan status, wilayah domisili, jenjang kaderisasi, atau minat bakat.',
        'KTA Digital: Download Kartu Tanda Anggota (KTA) resmi berformat PDF berstandar cetak.',
        'Ekspor Data Fleksibel: Ekstraksi basis data ke dalam format Excel/CSV atau PDF.'
      ]
    },
    {
      title: 'Administrasi Surat Masuk & Keluar',
      icon: Mail,
      content: 'Modul Tata Usaha Digital yang mentransformasi proses pengarsipan menjadi sistem manajemen dokumen elektronik.',
      features: [
        'Pencatatan Terstruktur: Input detail surat meliputi nomor registrasi, tanggal, pengirim/tujuan, dan perihal.',
        'Manajemen Lampiran Digital: Fasilitas unggah dokumen fisik hasil pindai dengan fitur pratinjau langsung.',
        'Sistem Klasifikasi & Prioritas: Kategorisasi surat dan pengingat deadline tindak lanjut.',
        'Impor Massal: Dukungan impor data sekaligus menggunakan template Excel.'
      ]
    },
    {
      title: 'Manajemen Agenda & Kalender',
      icon: Calendar,
      content: 'Sistem penjadwalan terpadu untuk merencanakan dan mempublikasikan seluruh kegiatan organisasi.',
      features: [
        'Penjadwalan Detail: Parameter judul kegiatan, deskripsi, lokasi, koordinat peta, dan waktu pengingat.',
        'Tampilan Kalender Interaktif: Antarmuka kalender terpadu.',
        'Sinkronisasi Google Calendar: Kemampuan menghubungkan akun Google untuk ekspor acara kalender otomatis.'
      ]
    },
    {
      title: 'Chat E2EE (Komunikasi Aman)',
      icon: MessageSquare,
      content: 'Platform perpesanan instan internal dengan keamanan End-to-End Encryption.',
      features: [
        'Perpesanan Privat & Grup: Fasilitas komunikasi terenkripsi end-to-end.',
        'Dukungan Multimedia: Berbagi gambar, video, berkas suara, dan lokasi peta.',
        'Pesan Sementara & Arsip Otomatis: Opsi menghapus atau mengarsipkan pesan otomatis.'
      ]
    }
  ];

  const troubleshooting = [
    { q: 'Lupa Kata Sandi?', a: 'Gunakan fitur "Lupa Kata Sandi?" di halaman login untuk menerima tautan reset kata sandi ke email Anda, atau hubungi administrator.' },
    { q: 'Gagal Mengunggah File/Foto?', a: 'Pastikan ukuran file tidak melebihi batas (maksimal 2MB untuk foto, 5MB untuk dokumen) dan format file didukung (JPG, PNG, PDF).' },
    { q: 'Aplikasi Terasa Lambat?', a: 'Muat ulang (refresh) halaman. Caruban Core mendukung offline caching melalui Service Worker.' },
    { q: 'Pesan Chat Tidak Masuk?', a: 'Pastikan Anda terhubung ke internet. Kunci enkripsi E2EE disinkronkan otomatis saat membuka halaman chat.' }
  ];

  const downloadManualBook = () => {
    try {
      showToast('Menyiapkan dokumen PDF...', 'info');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('MANUAL BOOK - CARUBAN CORE', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Sistem Informasi Manajemen Organisasi PC IPNU IPPNU Kab. Cirebon', pageWidth / 2, 30, { align: 'center' });
      
      let y = 50;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('I. Hak Akses & Role Pengguna', 14, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      roles.forEach(r => {
        doc.setFont('helvetica', 'bold');
        doc.text(`• ${r.title}:`, 14, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        r.access.forEach(a => {
          doc.text(`  - ${a}`, 18, y);
          y += 5;
        });
        y += 3;
      });

      doc.save('Manual_Book_Caruban_Core.pdf');
      showToast('Manual book berhasil diunduh', 'success');
    } catch (e) {
      console.error(e);
      showToast('Gagal mengunduh manual book', 'error');
    }
  };

  return (
    <div className="p-6 pb-24 md:pb-12 min-h-screen font-sans bg-[var(--bg-app)] text-[var(--text-main)]">
      <div className="mb-8 pt-12 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Panduan Penggunaan</h1>
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mt-2">Buku Petunjuk (Manual Book) Aplikasi Caruban Core</p>
        </div>
        <button
          onClick={downloadManualBook}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-[var(--accent-primary)] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-[var(--accent-primary)]/20 w-full md:w-auto"
        >
          <Download size={20} />
          Unduh PDF Manual
        </button>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 pb-2">
        {[
          { id: 'pendahuluan', label: 'Pendahuluan', icon: Info },
          { id: 'roles', label: 'Role & Akses', icon: UserCheck },
          { id: 'forms', label: 'Panduan Form', icon: Edit3 },
          { id: 'menu', label: 'Panduan Menu', icon: LayoutDashboard },
          { id: 'troubleshooting', label: 'Bantuan', icon: AlertTriangle }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'bg-[var(--accent-primary)] text-white shadow-md' 
                : 'bg-[var(--bg-card)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-[var(--border-main)]'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--bg-card)] rounded-[32px] border border-[var(--border-main)] shadow-sm p-6 md:p-10">
        {activeTab === 'pendahuluan' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
              <Info className="text-[var(--accent-primary)]" /> Tentang Aplikasi
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-lg">
              <strong>Caruban Core</strong> adalah sistem informasi manajemen organisasi terpadu yang dirancang untuk mendigitalkan dan mempermudah seluruh aspek operasional PC IPNU IPPNU Kabupaten Cirebon.
            </p>
          </motion.div>
        )}

        {activeTab === 'roles' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
              <UserCheck className="text-[var(--accent-primary)]" /> Hak Akses & Role Pengguna
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {roles.map((role, index) => (
                <div key={index} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${role.bgColor} ${role.color}`}>
                      <role.icon size={24} />
                    </div>
                    <h3 className="font-bold text-xl">{role.title}</h3>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 italic mb-4">{role.description}</p>
                  <ul className="space-y-2">
                    {role.access.map((acc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{acc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'forms' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
              <Edit3 className="text-[var(--accent-primary)]" /> Panduan Pengisian Formulir
            </h2>
            <div className="space-y-8">
              {formGuides.map((form, index) => (
                <div key={index} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <h3 className="font-bold text-xl mb-2 text-[var(--accent-primary)]">{form.title}</h3>
                  <p className="text-zinc-500 mb-6">{form.description}</p>
                  <div className="space-y-4">
                    {form.fields.map((field, i) => (
                      <div key={i} className="flex flex-col md:flex-row gap-2 md:gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-4 last:border-0 last:pb-0">
                        <div className="md:w-1/3 font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                          <ListChecks size={16} className="text-emerald-500" /> {field.name}
                        </div>
                        <div className="md:w-2/3 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                          {field.instruction}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'menu' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
              <LayoutDashboard className="text-[var(--accent-primary)]" /> Petunjuk Penggunaan Menu
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {menuGuides.map((guide, index) => (
                <div key={index} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
                      <guide.icon size={20} />
                    </div>
                    <h3 className="font-bold text-lg">{guide.title}</h3>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-4 italic">
                    {guide.content}
                  </p>
                  <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl">
                    <ul className="space-y-1.5">
                      {guide.features.map((feat, i) => (
                        <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                          <span className="text-[var(--accent-primary)] mt-0.5">•</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'troubleshooting' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
              <AlertTriangle className="text-amber-500" /> Manajemen Masalah (FAQ)
            </h2>
            <div className="space-y-4">
              {troubleshooting.map((item, index) => (
                <div key={index} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <h3 className="font-bold text-lg mb-2 flex items-start gap-2">
                    <span className="text-[var(--accent-primary)]">Q:</span> {item.q}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">A:</span> {item.a}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-8 border-t border-[var(--border-main)]">
              <p className="text-zinc-500 text-sm">Hubungi support: <strong>arsipdepartemenppk@gmail.com</strong></p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Panduan;
