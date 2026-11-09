import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Edit2, Download, Printer, Copy, Check, Eye, 
  Sparkles, Shield, Bookmark, Search, RefreshCw, Send, ChevronRight,
  Layers, Users, CheckCircle, FileCheck, BookOpen, X, PenTool, Calendar, MapPin, Hash, Building,
  Award, AlertTriangle, HelpCircle, CheckCircle2, UserCheck
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { useToast } from '../components/Toast';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { LOGO_IPNU, LOGO_IPPNU } from '../utils/pdfUtils';
import { SignaturePadModal } from '../components/SignaturePadModal';
import { PDFPreviewModal } from '../components/PDFPreviewModal';
import { 
  KECAMATAN_CIREBON, 
  DESA_PER_KECAMATAN, 
  SEKOLAH_PER_KECAMATAN, 
  getAllDesaList, 
  getAllSekolahList,
  SchoolEntry 
} from '../data/cirebonWilayahData';

export interface LetterTemplate {
  id: string;
  name: string;
  type: string;
  organisasi: 'IPNU' | 'IPPNU' | 'BERSAMA';
  category: 'Internal' | 'Eksternal' | 'Kepanitiaan' | 'Dokumen' | 'SK' | 'Mandat';
  indeks: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08';
  subject?: string;
  body: string;
  requiresSKAuthority?: boolean; // True if template is SK issuing (only PC/Admin)
  targetRole?: 'PR' | 'PK' | 'PAC' | 'PC' | 'ALL';
  tingkatWewenang?: ('PC' | 'PAC' | 'PR' | 'PK')[]; // strict allowed tiers for authority
  isRapat?: boolean; // Marker for meeting templates from Cabang to Ranting & Sekolah
  keteranganWewenang?: string; // Guidance note for hierarchy rule
  createdAt?: string;
}

const DEFAULT_TEMPLATES: Omit<LetterTemplate, 'id'>[] = [
  // ==========================================
  // KATEGORI 1: SURAT INTERNAL ORGANISASI (KODE INDEKS: A)
  // ==========================================
  {
    name: 'Surat Keputusan (SK) Pengesahan Kepengurusan',
    type: 'Keputusan',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '01',
    requiresSKAuthority: true,
    targetRole: 'PC',
    tingkatWewenang: ['PC'],
    keteranganWewenang: 'Kewenangan mutlak Pimpinan Cabang (PC). PAC, PR, dan PK tidak berwenang menerbitkan SK Pengesahan.',
    subject: 'PENGESAHAN KEPENGURUSAN PAC/PK/PR IPNU',
    body: `SURAT KEPUTUSAN
Nomor: [NOMOR_LENGKAP]

Tentang:
PENGESAHAN KEPENGURUSAN [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH]
MASA KHIDMAT 2024-2026

Bismillahirrohmanirrohim

Pimpinan Cabang Ikatan Pelajar Nahdlatul Ulama Kabupaten Cirebon, setelah:

MEMPERHATIKAN : Hasil Rapat Anggota / Konferensi [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] tanggal [HARI_TANGGAL].
MENIMBANG     : Bahwa demi kelancaran dan ketertiban roda organisasi, maka dipandang perlu untuk mengesahkan Susunan Pengurus [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] Masa Khidmat 2024-2026.
MENGINGAT     : 1. Peraturan Dasar (PD) dan Peraturan Rumah Tangga (PRT) IPNU.
                2. Peraturan Organisasi (PO) IPNU tentang Tata Cara Pengesahan Kepengurusan.

MEMUTUSKAN

MENETAPKAN :
Pertama    : Mengesahkan Susunan Pengurus [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] Masa Khidmat 2024-2026 sebagaimana terlampir.
Kedua      : Mengamanatkan kepada Pengurus untuk melaksanakan tugas-tugas organisasi dengan penuh rasa tanggung jawab demi kejayaan IPNU.
Ketiga     : Surat Keputusan ini berlaku sejak tanggal ditetapkan sampai berakhirnya masa khidmat, dan apabila terdapat kekeliruan di kemudian hari akan diadakan perbaikan sebagaimana mestinya.

Ditetapkan di : [KOTA]
Pada Tanggal  : [TANGGAL_HIJRIYAH] / [TANGGAL_MASEHI]

PIMPINAN CABANG
IKATAN PELAJAR NAHDLATUL ULAMA
KABUPATEN CIREBON`,
  },
  {
    name: 'Surat Rekomendasi Pengesahan (SRP) Kepengurusan',
    type: 'Rekomendasi',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '06',
    tingkatWewenang: ['PAC', 'PR', 'PK'],
    keteranganWewenang: 'Diterbitkan oleh PK/PR ditujukan ke PAC, atau oleh PAC ditujukan ke PC untuk permohonan SK.',
    subject: 'PERMOHONAN REKOMENDASI PENGESAHAN KEPENGURUSAN',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim
Salam silaturrahim teriring doa kami sampaikan, semoga Bapa/Ibu/Rekan senantiasa dalam naungan rahmat dan hidayah Allah SWT serta sukses dalam menjalankan aktivitas sehari-hari. Aamiin.

Sehubungan dengan telah selesainya pelaksanaan Rapat Anggota / Konferensi [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] serta tersusunnya jajaran kepengurusan baru Masa Khidmat 2024-2026, maka dengan ini kami mengajukan Permohonan Rekomendasi Pengesahan Kepengurusan kepada Pimpinan di atasnya.

Sebagai bahan pertimbangan, bersama ini kami lampirkan:
1. Berita Acara Pemilihan Ketua & Rapat Formatur
2. Susunan Pengurus Lengkap Masa Khidmat 2024-2026
3. Surat Pernyataan Kesediaan Berkhidmah

Demikian surat permohonan rekomendasi ini kami buat, atas perhatian dan pertimbangannya kami sampaikan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Pengantar Berkas LPJ / Administrasi',
    type: 'Pengantar',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '05',
    tingkatWewenang: ['PC', 'PAC', 'PR', 'PK'],
    subject: 'SURAT PENGANTAR PENYERAHAN BERKAS LPJ / ADMINISTRASI',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Dengan hormat, bersama ini kami sampaikan berkas Laporan Pertanggungjawaban (LPJ) / Dokumen Administrasi Resmi dari [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] untuk dipergunakan sebagaimana mestinya:

No | Jenis Berkas / Dokumen | Jumlah | Keterangan
1. | Berkas LPJ Kegiatan [AGENDA] | 1 Eksemplar | Asli & Terverifikasi
2. | Lampiran Berita Acara & Lampiran Keuangan | 1 Berkas | Lengkap

Demikian surat pengantar ini kami sampaikan, atas perhatian dan penerimaannya kami haturkan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Instruksi Organisasi (Turba / Program)',
    type: 'Instruksi',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '05',
    targetRole: 'PAC',
    tingkatWewenang: ['PC', 'PAC'],
    keteranganWewenang: 'Hanya PC (ke PAC/PR/PK) dan PAC (ke PR/PK) yang berwenang mengeluarkan instruksi struktural.',
    subject: 'SURAT INSTRUKSI PELAKSANAAN PROGRAM / TURBA',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Seluruh Pimpinan [TINGKAT_PIMPINAN] IPNU Se-[NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Salam silaturrahim teriring doa kami sampaikan, semoga Rekan-rekan senantiasa dalam naungan taufiq dan hidayah Allah SWT.

Berdasarkan hasil Keputusan Rapat Pleno [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH], maka dengan ini kami menginstruksikan kepada seluruh jajaran pimpinan di bawahnya untuk:

1. Melaksanakan agenda [AGENDA] serentak pada tanggal [HARI_TANGGAL].
2. Memasang atribut dan bendera IPNU di wilayah masing-masing.
3. Melaporkan hasil pelaksanaan program kepada sekretariat pimpinan paling lambat 3 hari pasca kegiatan.

Demikian surat instruksi ini disampaikan untuk dilaksanakan dengan penuh rasa tanggung jawab.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Edaran Internal Organisasi',
    type: 'Edaran',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '05',
    subject: 'SURAT EDARAN PENATAAN ADMINISTRASI & ANGGOTA',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Pengurus & Kader IPNU [NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Diberitahukan kepada seluruh jajaran pengurus dan anggota IPNU [NAMA_WILAYAH], dalam rangka peningkatan ketertiban administrasi dan pemutakhiran data anggota Caruban CORE, bersama ini disampaikan beberapa poin penting:

1. Seluruh kader wajib melakukan registrasi ulang NIA melalui aplikasi Caruban CORE.
2. Pelaksanaan pendaftaran peserta Makesta/Lakmud dilakukan secara digital melalui fitur pendaftaran terpadu.
3. Edaran ini berlaku sejak tanggal diterbitkan.

Demikian edaran ini disampaikan untuk dipedomani bersama.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Tugas Lapangan / Pendampingan (ST)',
    type: 'Tugas',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '02',
    subject: 'SURAT TUGAS PENDAMPINGAN LAPANGAN',
    body: `SURAT TUGAS
Nomor: [NOMOR_LENGKAP]

Bismillahirrohmanirrohim

Pimpinan [TINGKAT_PIMPINAN] Ikatan Pelajar Nahdlatul Ulama [NAMA_WILAYAH], dengan ini menugaskan kepada:

Nama    : [PENERIMA_TUJUAN]
NIA     : [NIA]
Jabatan : [JABATAN]

Untuk melaksanakan Tugas Lapangan / Pendampingan Organisasi dalam rangka [AGENDA] yang diselenggarakan pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]

Demikian surat tugas ini diberikan agar dilaksanakan dengan sungguh-sungguh dan melaporkan hasilnya setelah tugas selesai.

Wallahul Muwaffiq Ila Aqwamith Thariq`,
  },
  {
    name: 'Surat Mandat Delegasi Resmi (SM - IPNU)',
    type: 'Mandat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '02',
    subject: 'SURAT MANDAT DELEGASI RESMI',
    body: `SURAT MANDAT
Nomor: [NOMOR_LENGKAP]

Bismillahirrohmanirrohim

Pimpinan [TINGKAT_PIMPINAN] Ikatan Pelajar Nahdlatul Ulama [NAMA_WILAYAH], dengan ini memberikan mandat penuh kepada:

Nama    : [PENERIMA_TUJUAN]
NIA     : [NIA]
Jabatan : [JABATAN]
Alamat  : [ALAMAT_TUJUAN]

Untuk bertindak sebagai Utusan / Delegasi Resmi dalam rangka mengikuti kegiatan [PERIHAL] yang diselenggarakan pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]

Demikian surat mandat ini diberikan agar dapat dilaksanakan dengan penuh dedikasi dan tanggung jawab demi kejayaan Islam Ahlussunnah wal Jama'ah dan kemajuan organisasi IPNU.

Wallahul Muwaffiq Ila Aqwamith Thariq`,
  },
  {
    name: 'Surat Mandat Delegasi Resmi (SM - IPPNU)',
    type: 'Mandat',
    organisasi: 'IPPNU',
    category: 'Internal',
    indeks: '02',
    subject: 'SURAT MANDAT DELEGASI RESMI',
    body: `SURAT MANDAT
Nomor: [NOMOR_LENGKAP]

Bismillahirrohmanirrohim

Pimpinan [TINGKAT_PIMPINAN] Ikatan Pelajar Putri Nahdlatul Ulama [NAMA_WILAYAH], dengan ini memberikan mandat kehormatan kepada:

Nama    : [PENERIMA_TUJUAN]
NIA     : [NIA]
Jabatan : [JABATAN]
Alamat  : [ALAMAT_TUJUAN]

Untuk bertindak sebagai Utusan / Delegasi Resmi dalam rangka mengikuti kegiatan [PERIHAL] yang diselenggarakan pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]

Demikian surat mandat ini diberikan untuk dipergunakan sebagaimana mestinya dan dilaksanakan dengan sungguh-sungguh.

Wallahul Muwaffiq Ila Aqwamith Thariq`,
  },
  {
    name: 'Surat Keterangan Aktif Organisasi (SKt)',
    type: 'Keterangan',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '07',
    subject: 'SURAT KETERANGAN AKTIF ORGANISASI',
    body: `SURAT KETERANGAN AKTIF
Nomor: [NOMOR_LENGKAP]

Bismillahirrohmanirrohim

Yang bertanda tangan di bawah ini Pimpinan [TINGKAT_PIMPINAN] Ikatan Pelajar Nahdlatul Ulama [NAMA_WILAYAH], menerangkan dengan sesungguhnya bahwa:

Nama    : [PENERIMA_TUJUAN]
NIA     : [NIA]
Jabatan : [JABATAN]
Alamat  : [ALAMAT_TUJUAN]

Adalah benar-benar kader / pengurus aktif pada jajaran kepengurusan [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] Masa Khidmat 2024–2026, memiliki rekam jejak loyalitas yang baik, serta berdedikasi tinggi terhadap persyarikatan Nahdlatul Ulama.

Surat keterangan ini diterbitkan dengan sebenarnya untuk dipergunakan sebagai kelengkapan administrasi [AGENDA].

Demikian surat keterangan ini kami buat agar dapat dipergunakan sebagaimana mestinya.

Wallahul Muwaffiq Ila Aqwamith Thariq`,
  },
  {
    name: 'Surat Peringatan Disiplin Organisasi (SP 1, SP 2, SP 3)',
    type: 'Peringatan',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '05',
    targetRole: 'PAC',
    tingkatWewenang: ['PC', 'PAC'],
    keteranganWewenang: 'Penegakan disiplin organisasi hanya wewenang PC dan PAC.',
    subject: 'SURAT PERINGATAN DISIPLIN ORGANISASI (SP-1)',
    body: `SURAT PERINGATAN (SP-1)
Nomor: [NOMOR_LENGKAP]

Bismillahirrohmanirrohim

Pimpinan [TINGKAT_PIMPINAN] Ikatan Pelajar Nahdlatul Ulama [NAMA_WILAYAH], setelah mengevaluasi kinerja dan kedisiplinan organisasi, dengan ini memberikan Surat Peringatan Pertama (SP-1) kepada:

Nama    : [PENERIMA_TUJUAN]
Jabatan : [JABATAN]

Atas pelanggaran disiplin organisasi berupa ketidakhadiran rapat pleno dan penelantaran program kerja tanpa alasan yang sah selama 3 bulan berturut-turut.

Diharapkan saudara segera melakukan klarifikasi dan mengaktifkan kembali peran organisasi dalam kurun waktu 14 hari sejak surat ini diterbitkan.

Wallahul Muwaffiq Ila Aqwamith Thariq`,
  },
  {
    name: 'Surat Keterangan Domisili Kesekretariatan',
    type: 'Keterangan',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '07',
    subject: 'SURAT KETERANGAN DOMISILI KESEKRETARIATAN',
    body: `SURAT KETERANGAN DOMISILI
Nomor: [NOMOR_LENGKAP]

Bismillahirrohmanirrohim

Yang bertanda tangan di bawah ini Pimpinan [TINGKAT_PIMPINAN] Ikatan Pelajar Nahdlatul Ulama [NAMA_WILAYAH], menerangkan bahwa:

Nama Organisasi : [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH]
Alamat Kantor   : [ALAMAT_SEKRETARIAT]
Status Bangunan : Gedung Sekretariat Bersama NU

Adalah benar berkedudukan dan beraktivitas secara aktif di alamat tersebut di atas. Surat keterangan domisili ini dibuat untuk keperluan administrasi perbankan / verifikasi instansi pemerintah.

Demikian surat keterangan ini kami buat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.

Wallahul Muwaffiq Ila Aqwamith Thariq`,
  },

  // ==========================================
  // KATEGORI 2: SURAT UMUM / EKSTERNAL (KODE INDEKS: B)
  // ==========================================
  {
    name: 'Surat Undangan Tokoh / Instansi Eksternal',
    type: 'Undangan',
    organisasi: 'IPNU',
    category: 'Eksternal',
    indeks: '03',
    subject: 'SURAT UNDANGAN KEGIATAN RESMI',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Salam silaturrahim teriring doa kami sampaikan, semoga Bapak/Ibu/Kiai senantiasa dalam keadaan sehat wal afiat serta sukses dalam mengemban amanah sehari-hari. Aamiin.

Sehubungan dengan akan dilaksanakannya kegiatan [PERIHAL] oleh [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH], maka dengan ini kami bermaksud mengundang Bapak/Ibu/Kiai untuk berkenan hadir pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : [AGENDA]

Kehadiran Bapak/Ibu/Kiai merupakan kehormatan dan kebahagiaan yang sangat besar bagi kami seluruh pelajar NU.

Demikian undangan ini kami sampaikan, atas perhatian dan kesediaannya dihaturkan banyak terima kasih.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Permohonan Audiensi',
    type: 'Permohonan',
    organisasi: 'IPNU',
    category: 'Eksternal',
    indeks: '04',
    subject: 'PERMOHONAN AUDIENSI SILATURRAHIM',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Salam silaturrahim kami sampaikan, semoga Bapak/Ibu pimpinan instansi senantiasa dalam lindungan Allah SWT serta diberi kemudahan dalam menjalankan tugas pelayanan masyarakat.

Dalam rangka mempererat tali silaturrahim serta menyampaikan wawasan program kerja kepemudaan pelajar NU, kami Pengurus [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] mengajukan permohonan waktu audiensi bersama Bapak/Ibu pimpinan pada:

Hari/Tanggal : [HARI_TANGGAL] (disesuaikan dengan agenda Bapak/Ibu)
Tempat       : Kantor / Ruang Kerja [PENERIMA_TUJUAN]

Demikian permohonan audiensi ini kami sampaikan. Atas penerimaan dan perkenan waktunya kami ucapkan terima kasih.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Permohonan Sambutan / Membuka Acara',
    type: 'Permohonan',
    organisasi: 'IPNU',
    category: 'Eksternal',
    indeks: '04',
    subject: 'PERMOHONAN SAMBUTAN DAN MEMBUKA ACARA',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Salam silaturrahim teriring doa kami sampaikan, semoga Bapak/Ibu senantiasa dalam lindungan Allah SWT.

Sehubungan dengan akan digelarnya Pembukaan Acara [AGENDA] oleh [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH], kami memohon dengan sangat kesediaan Bapak/Ibu untuk memberikan kata sambutan sekaligus meresmikan/membuka kegiatan pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB
Tempat       : [TEMPAT]

Demikian surat permohonan ini kami buat, besar harapan kami Bapak/Ibu berkenan mengabulkan permohonan ini.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Balasan / Konfirmasi Kesediaan',
    type: 'Balasan',
    organisasi: 'IPNU',
    category: 'Eksternal',
    indeks: '05',
    subject: 'SURAT KONFIRMASI KESEDIAAN MENGHADIRI UNDANGAN',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Memenuhi surat undangan Saudara Nomor: [NOMOR_AGENDA] perihal [PERIHAL], dengan ini kami menyampaikan bahwa Pimpinan [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] MENYATAKAN BERSEDIA hadir dan menugaskan delegasi resmi pada acara tersebut.

Demikian konfirmasi ini kami sampaikan untuk dipergunakan sebagaimana mestinya.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Permohonan Peminjaman Tempat / Gedung',
    type: 'Peminjaman',
    organisasi: 'IPNU',
    category: 'Eksternal',
    indeks: '04',
    subject: 'PERMOHONAN PEMINJAMAN GEUDNG / TEMPAT KEGIATAN',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Kepala / Pengelola [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Salam silaturrahim kami sampaikan, semoga Bapak/Ibu senantiasa dalam keadaan sehat dan penuh berkah.

Sehubungan dengan akan dilaksanakannya agenda [AGENDA] [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH], bersama ini kami memohon izin untuk menggunakan sarana / gedung [TEMPAT] pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Penggunaan   : [AGENDA]

Kami berjanji akan menjaga kebersihan dan ketertiban fasilitas selama kegiatan berlangsung. Atas perkenan izin Bapak/Ibu kami haturkan terima kasih.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Permohonan Peminjaman Barang & Fasilitas',
    type: 'Peminjaman',
    organisasi: 'IPNU',
    category: 'Eksternal',
    indeks: '04',
    subject: 'PERMOHONAN PEMINJAMAN SARANA & PRASARANA',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Semoga Bapak/Ibu senantiasa dalam naungan taufiq Allah SWT.

Demi mendukung kelancaran kegiatan [AGENDA] yang diselenggarakan oleh [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH], kami memohon pinjam sarana berupa:

1. Sound System & Wireless Mic
2. LCD Proyektor & Layar
3. Karpet / Tikar

Barang tersebut akan dipergunakan pada [HARI_TANGGAL] di [TEMPAT]. Demikian surat peminjaman ini dibuat, atas bantuan dan kedermawanan Bapak/Ibu kami sampaikan terima kasih.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Permohonan Bantuan Dana (Donatur/Alumni)',
    type: 'Permohonan',
    organisasi: 'IPNU',
    category: 'Eksternal',
    indeks: '04',
    subject: 'PERMOHONAN BANTUAN DANA KEGIATAN',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: 1 Berkas Proposal
Perihal: [PERIHAL]

Yth. Bapak/Ibu/Rekan Alumni & Donatur IPNU
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Salam silaturrahim teriring doa kami sampaikan, semoga Bapak/Ibu/Donatur senantiasa dilimpahkan rezeki yang berkah oleh Allah SWT.

Dalam rangka mensukseskan agenda [AGENDA] [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] dengan estimasi anggaran sebesar [LAMPIRAN], kami mengetuk hati Bapak/Ibu/Donatur untuk berkenan memberikan bantuan dana donasi.

Donasi dapat disalurkan langsung atau melalui Rekening Resmi Organisasi. Atas partisipasi dan infaq terbaik Bapak/Ibu, kami ucapkan jazakumullah khairan katsiran.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Permohonan Kerjasama & Sponsorship',
    type: 'Kerjasama',
    organisasi: 'IPNU',
    category: 'Eksternal',
    indeks: '04',
    subject: 'PERMOHONAN KERJASAMA MITRA SPONSORSHIP',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: 1 Berkas Proposal Sponsorship
Perihal: [PERIHAL]

Yth. Pimpinan Perusahaan / Instansi [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Dengan hormat, [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] akan menyelenggarakan event akbar [AGENDA] yang melibatkan ribuan pelajar se-Kabupaten Cirebon pada [HARI_TANGGAL].

Sehubungan dengan hal tersebut, kami menawarkan kerjasama promosi dan sponsorship yang saling menguntungkan sebagaimana terlampir dalam proposal.

Demikian penawaran kerjasama ini kami sampaikan, besar harapan kami dapat terjalin kemitraan yang strategis.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Pemberitahuan Kegiatan Resmi',
    type: 'Pemberitahuan',
    organisasi: 'IPNU',
    category: 'Eksternal',
    indeks: '05',
    subject: 'PEMBERITAHUAN PELAKSANAAN KEGIATAN',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Kepala / Kapolsek / Camat / Kuwu [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Diberitahukan dengan hormat bahwa [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] akan menyelenggarakan kegiatan [AGENDA] pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB
Tempat       : [TEMPAT]
Jumlah Peserta: ± 150 Orang Pelajar NU

Surat ini disampaikan sebagai pemberitahuan resmi demi kelancaran dan keamanan bersama di lingkungan setempat.

Demikian pemberitahuan ini kami sampaikan, atas perhatian Bapak/Ibu kami ucapkan terima kasih.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Permohonan Pengamanan (Banser / Kepolisian)',
    type: 'Pengamanan',
    organisasi: 'IPNU',
    category: 'Eksternal',
    indeks: '04',
    subject: 'PERMOHONAN BANTUAN PENGAMANAN (BANSER / KEPOLISIAN)',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Kasatkorcab BANSER / Kapolsek / Kapolresta [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Dalam rangka menjaga ketertiban, keamanan, dan lalu lintas selama agenda [AGENDA] [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH], kami memohon bantuan personel pengamanan pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Lokasi       : [TEMPAT]

Demikian surat permohonan ini kami sampaikan, atas kerjasama dan pengawalannya dihaturkan terima kasih.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },

  // ==========================================
  // KATEGORI 3: SURAT KEPANITIAAN (KODE INDEKS KHUSUS PANITIA)
  // ==========================================
  {
    name: 'Surat Permohonan Pemateri / Fasilitator (Panitia Kaderisasi)',
    type: 'Panitia',
    organisasi: 'IPNU',
    category: 'Kepanitiaan',
    indeks: '04',
    subject: 'PERMOHONAN PEMATERI / NARSUM MAKESTA / LAKMUD',
    body: `PANITIA PELAKSANA [AGENDA]
[TINGKAT_PIMPINAN] IPNU-IPPNU [NAMA_WILAYAH]

Nomor: [NOMOR_LENGKAP]
Lampiran: 1 Berkas Manual Acara & Tor
Perihal: [PERIHAL]

Yth. [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Salam silaturrahim teriring doa kami sampaikan, semoga Bapak/Rekanita senantiasa dalam lindungan Allah SWT.

Sehubungan dengan akan dilaksanakannya Pelatihan Kaderisasi [AGENDA] Panitia Pelaksana IPNU-IPPNU [NAMA_WILAYAH], kami memohon kesediaan Bapak/Rekanita untuk menjadi Pemateri / Fasilitator pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB
Materi       : [PERIHAL]
Tempat       : [TEMPAT]

Demikian surat permohonan ini kami sampaikan. Atas kesediaan dan ilmunya kami ucapkan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Permohonan Delegasi Peserta Kaderisasi (Makesta/Lakmud)',
    type: 'Panitia',
    organisasi: 'BERSAMA',
    category: 'Kepanitiaan',
    indeks: '03',
    subject: 'PERMOHONAN DELEGASI PESERTA MAKESTA / LAKMUD',
    body: `PANITIA PELAKSANA [AGENDA]
IPNU - IPPNU [NAMA_WILAYAH]

Nomor: [NOMOR_LENGKAP]
Lampiran: 1 Berkas Formulir Pendaftaran
Perihal: [PERIHAL]

Yth. Ketua PK / PR / PAC IPNU & IPPNU Se-[NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Dalam rangka pengkaderan anggota baru, Panitia Pelaksana [AGENDA] mengundang seluruh Pimpinan di bawahnya untuk mengirimkan delegasi peserta minimal 5 pasang kader pada:

Hari/Tanggal : [HARI_TANGGAL]
Tempat       : [TEMPAT]
Kontribusi   : Sesuai ketentuan panitia

Pendaftaran peserta dilakukan melalui sistem registrasi terpadu Caruban CORE.

Demikian permohonan delegasi ini kami sampaikan, atas perhatian dan pengiriman kadernya diucapkan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Undangan Peserta / Tamu Panitia',
    type: 'Panitia',
    organisasi: 'BERSAMA',
    category: 'Kepanitiaan',
    indeks: '03',
    subject: 'UNDANGAN PEMBUKAAN / EVENT PANITIA',
    body: `PANITIA PELAKSANA [AGENDA]
IPNU - IPPNU [NAMA_WILAYAH]

Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. [PENERIMA_TUJUAN]
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Panitia Pelaksana [AGENDA] IPNU-IPPNU [NAMA_WILAYAH] mengundang dengan hormat kehadiran Bapak/Ibu/Rekanita pada Seremoni Pembukaan yang dilaksanakan pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB
Tempat       : [TEMPAT]

Kehadiran Rekan-rekanita merupakan kehormatan bagi panitia.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Permohonan Dana Proposal Panitia',
    type: 'Panitia',
    organisasi: 'BERSAMA',
    category: 'Kepanitiaan',
    indeks: '04',
    subject: 'PERMOHONAN BANTUAN DANA PROPOSAL PANITIA',
    body: `PANITIA PELAKSANA [AGENDA]
IPNU - IPPNU [NAMA_WILAYAH]

Nomor: [NOMOR_LENGKAP]
Lampiran: 1 Berkas Proposal
Perihal: [PERIHAL]

Yth. Donatur / Dermawan / Alumni
[ALAMAT_TUJUAN]

Assalamu'alaikum Warahmatullahi Wabarakatuh
Dengan hormat, Panitia Pelaksana [AGENDA] IPNU-IPPNU [NAMA_WILAYAH] akan menyelenggarakan kegiatan kaderisasi pada [HARI_TANGGAL].

Demi kelancaran dana konsumsi dan modul peserta, kami memohon bantuan infaq/donasi Bapak/Ibu/Donatur sebagaimana terlampir dalam proposal.

Atas bantuan yang diberikan, kami berdoa semoga Allah melipatgandakan rezeki Bapak/Ibu.

Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Surat Keputusan (SK) Panitia (Kelulusan Peserta)',
    type: 'Panitia',
    organisasi: 'IPNU',
    category: 'Kepanitiaan',
    indeks: '01',
    subject: 'SK PANITIA TENTANG KELULUSAN PESERTA KADERISASI',
    body: `SURAT KEPUTUSAN PANITIA PELAKSANA
Nomor: [NOMOR_LENGKAP]

Tentang:
KELULUSAN PESERTA [AGENDA]
[TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH]

MEMPERHATIKAN : Hasil penilaian presensi, ujian post-test, dan kedisiplinan peserta selama kegiatan [AGENDA].
MENETAPKAN   :
1. Menyatakan nama-nama terlampir LULUS dan Sah sebagai Kader Muda IPNU.
2. Keputusan ini bersifat mutlak dan tidak dapat diganggu gugat.

Ditetapkan di : [KOTA]
Pada Tanggal  : [TANGGAL_MASEHI]

PANITIA PELAKSANA [AGENDA]`,
  },

  // ==========================================
  // KATEGORI 4: LEMBAR DOKUMEN & BERITA ACARA
  // ==========================================
  {
    name: 'Berita Acara Rapat Formatur (Penyusunan Pengurus)',
    type: 'Dokumen',
    organisasi: 'BERSAMA',
    category: 'Dokumen',
    indeks: '07',
    subject: 'BERITA ACARA RAPAT FORMATUR PENYUSUNAN PENGURUS',
    body: `BERITA ACARA RAPAT FORMATUR
PIMPINAN [TINGKAT_PIMPINAN] IPNU-IPPNU [NAMA_WILAYAH]

Pada hari ini [HARI_TANGGAL] bertempat di [TEMPAT], Tim Formatur Hasil Konferensi / Rapat Anggota telah menyelenggarakan Rapat Penyusunan Kepengurusan Baru Masa Khidmat 2024–2026.

Rapat Formatur menghasilkan kesepakatan susunan pengurus harian sebagai berikut:

1. Ketua Umum IPNU   : [PENERIMA_TUJUAN]
2. Sekretaris Umum   : [NAMA_SEKRETARIS]
3. Bendahara Umum    : [AGENDA]

Demikian Berita Acara Rapat Formatur ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagai syarat penerbitan Surat Keputusan (SK).

Tim Formatur:
1. Ketua Terpilih (Ketua Tim)  : ( .................... )
2. Demisioner                  : ( .................... )
3. Anggota Formatur            : ( .................... )`,
  },
  {
    name: 'Berita Acara Serah Terima Jabatan (Sertijab)',
    type: 'Dokumen',
    organisasi: 'IPNU',
    category: 'Dokumen',
    indeks: '07',
    subject: 'BERITA ACARA SERAH TERIMA JABATAN (SERTIJAB)',
    body: `BERITA ACARA SERAH TERIMA JABATAN
PIMPINAN [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH]

Pada hari ini [HARI_TANGGAL], kami yang bertanda tangan di bawah ini:

I.  Nama : [PENERIMA_TUJUAN] (Ketua Demisioner Masa Khidmat 2022-2024), selanjutnya disebut PIHAK PERTAMA.
II. Nama : [NAMA_KETUA] (Ketua Terpilih Masa Khidmat 2024-2026), selanjutnya disebut PIHAK KEDUA.

PIHAK PERTAMA menyerahkan secara resmi seluruh wewenang kepemimpinan, berkas inventaris kantor, dan kas organisasi kepada PIHAK KEDUA.

Demikian Berita Acara Sertijab ini dibuat dalam keadaan sadar dan tanpa paksaan.

PIHAK PERTAMA (Demisioner)          PIHAK KEDUA (Ketua Terpilih)

( .............................. )   ( .............................. )`,
  },
  {
    name: 'Berita Acara Pemilihan Ketua (Rapat Anggota / Konferensi)',
    type: 'Dokumen',
    organisasi: 'IPNU',
    category: 'Dokumen',
    indeks: '07',
    subject: 'BERITA ACARA PEMILIHAN KETUA TERPILIH',
    body: `BERITA ACARA PEMILIHAN KETUA
KONFERENSI / RAPAT ANGGOTA [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH]

Pada hari ini [HARI_TANGGAL], dalam Sidang Pleno Pemilihan Ketua [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] yang dihadiri oleh [AGENDA] utusan sah, diperoleh hasil pemungutan suara:

1. Rekan [PENERIMA_TUJUAN] : [LAMPIRAN] Suara
2. Rekan [JABATAN]        : [PERIHAL] Suara

Dengan demikian, Sidang Pleno menetapkan Rekan [PENERIMA_TUJUAN] sebagai KETUA TERPILIH [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] Masa Khidmat 2024–2026.

Pimpinan Sidang Pleno:
Ketua Sidang : ( .................... )
Sekretaris   : ( .................... )`,
  },
  {
    name: 'Lembar Pengesahan Proposal / LPJ',
    type: 'Dokumen',
    organisasi: 'BERSAMA',
    category: 'Dokumen',
    indeks: '07',
    subject: 'LEMBAR PENGESAHAN PROPOSAL / LPJ KEGIATAN',
    body: `LEMBAR PENGESAHAN
[PERIHAL]

Dua lembar naskah Proposal / Laporan Pertanggungjawaban Kegiatan [AGENDA] ini telah diperiksa dan disahkan oleh Pimpinan Organisasi pada tanggal [HARI_TANGGAL] di [KOTA].

PANITIA PELAKSANA

Ketua Panitia                      Sekretaris Panitia

( .................... )            ( .................... )

MENGETAHUI / MENGESAHKAN

Ketua IPNU [NAMA_WILAYAH]           Ketua IPPNU [NAMA_WILAYAH]

( .................... )            ( .................... )`,
  },

  // ==========================================
  // KATEGORI 5: SURAT RAPAT RESMI (CABANG HINGGA SEKOLAH & RANTING)
  // ==========================================
  {
    name: 'Undangan Rapat Pleno Cabang (PC)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PC'],
    keteranganWewenang: 'Wewenang Pimpinan Cabang (PC) untuk evaluasi program semester bersama PAC se-Kabupaten.',
    subject: 'UNDANGAN RAPAT PLENO PIMPINAN CABANG',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Rekan-rekanita:
1. Pengurus Harian PC IPNU [NAMA_WILAYAH]
2. Pengurus Departemen, Lembaga, dan Badan PC IPNU
3. Ketua Pimpinan Anak Cabang (PAC) se-[NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Salam silaturrahim teriring doa kami sampaikan, semoga rekan-rekanita senantiasa dalam limpahan taufiq, hidayah, dan inayah Allah SWT serta selalu bersemangat dalam berkhidmah di Nahdlatul Ulama.

Sehubungan dengan agenda evaluasi semester program kerja cabang serta konsolidasi kebijakan strategis organisasi, maka dengan ini Pimpinan Cabang Ikatan Pelajar Nahdlatul Ulama [NAMA_WILAYAH] mengundang kehadiran rekan-rekanita pada Rapat Pleno Cabang yang akan diselenggarakan pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : 1. Evaluasi Kinerja Semester Pengurus Cabang
               2. Laporan Progres Kaderisasi & Database Caruban CORE PAC
               3. Sinkronisasi Program Kerja Semester Mendatang

Mengingat pentingnya agenda tersebut, kami mengharapkan kehadiran tepat waktu dengan mengenakan Seragam Resmi / Batik IPNU lengkap dengan atribut organisasi.

Demikian surat undangan ini kami sampaikan, atas perhatian dan kehadirannya kami ucapkan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Rapat Pengurus Harian PC (Cabang)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PC'],
    keteranganWewenang: 'Wewenang Pengurus Harian Cabang untuk koordinasi taktis dan disposisi persuratan.',
    subject: 'UNDANGAN RAPAT PENGURUS HARIAN PIMPINAN CABANG',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Rekan-rekanita Jajaran Pengurus Harian
Pimpinan Cabang IPNU [NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Salam silaturrahim kami sampaikan, semoga Rekan-rekanita senantiasa diberikan kelancaran dan kemudahan dalam menjalankan amanah organisasi.

Dalam rangka menindaklanjuti disposisi persuratan masuk, pemantapan jadwal visitasi kaderisasi tingkat anak cabang, serta perumusan langkah-langkah strategis pekanan organisasi, kami mengundang kehadiran Rekan-rekanita Pengurus Harian pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : 1. Disposisi dan Tindak Lanjut Surat Masuk
               2. Penjadwalan Turba & Visitasi Lapangan
               3. Koordinasi Isu Aktual Pendidikan dan Pelajar di Cirebon

Kehadiran Rekan-rekanita sangat dinantikan demi kesinambungan khidmah dan ketertiban tata kelola organisasi.

Demikian undangan ini kami sampaikan, atas kerja sama dan kehadirannya dihaturkan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Rapat Koordinasi Cabang (Rakorcab)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PC'],
    keteranganWewenang: 'Wewenang Pimpinan Cabang untuk konsolidasi dan koordinasi bersama PAC se-Kabupaten.',
    subject: 'UNDANGAN RAPAT KOORDINASI CABANG (RAKORCAB)',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: 1 Berkas Jadwal & Agenda
Perihal: [PERIHAL]

Yth. Rekan Ketua dan Sekretaris
Pimpinan Anak Cabang (PAC) IPNU se-[NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Puji syukur kehadirat Allah SWT atas segala limpahan rahmat-Nya. Shalawat dan salam semoga tercurah kepada Baginda Nabi Muhammad SAW.

Demi memperkokoh soliditas kepengurusan, percepatan verifikasi data anggota Caruban CORE, dan standarisasi pelaksanaan Masa Kesetiaan Anggota (Makesta) di seluruh tingkatan, Pimpinan Cabang IPNU [NAMA_WILAYAH] akan menyelenggarakan Rapat Koordinasi Cabang (Rakorcab) yang insya Allah dilaksanakan pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : Rapat Koordinasi Cabang (Rakorcab) Konsolidasi Organisasi

Ketentuan Peserta:
1. Setiap PAC mengutus 2 orang delegasi (Ketua dan Sekretaris).
2. Membawa data riil jumlah pimpinan ranting dan komisariat aktif di wilayahnya.
3. Mengenakan Jas Resmi IPNU dan berpeci hitam.

Demikian surat undangan ini kami sampaikan, atas kehadiran dan kedisiplinannya kami sampaikan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Konferensi Cabang (Konfercab)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PC'],
    keteranganWewenang: 'Forum permusyawaratan tertinggi organisasi tingkat Cabang Kabupaten Cirebon.',
    subject: 'UNDANGAN RESMI KONFERENSI CABANG (KONFERCAB)',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: 1 Berkas Petunjuk Pelaksanaan
Perihal: [PERIHAL]

Yth. Pimpinan Anak Cabang (PAC), Pimpinan Ranting (PR), dan Pimpinan Komisariat (PK) IPNU
se-[NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Salam silaturrahim teriring doa kami haturkan, semoga Rekan-rekanita sekalian senantiasa dalam lindungan taufiq Allah SWT dalam menjalankan syiar pelajar Nahdlatul Ulama.

Mengingat berakhirnya Masa Khidmat Kepengurusan 2024-2026 Pimpinan Cabang IPNU [NAMA_WILAYAH], serta berdasarkan ketentuan Peraturan Dasar dan Peraturan Rumah Tangga IPNU, bersama ini kami mengundang utusan resmi Pimpinan di bawahnya untuk menghadiri forum tertinggi organisasi tingkat cabang, yaitu Konferensi Cabang (Konfercab) pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Tema         : "Akselerasi Pelajar NU Menyambut Indonesia Emas Berlandaskan Aswaja"

Peserta Konfercab wajib membawa Surat Mandat Resmi dari tingkatan pimpinan masing-masing dan melakukan verifikasi presensi delegasi melalui sistem digital Caruban CORE.

Demikian surat undangan ini kami sampaikan, atas kehadiran dan partisipasinya kami haturkan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Rapat Pleno Anak Cabang (PAC)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PAC'],
    keteranganWewenang: 'Wewenang Pimpinan Anak Cabang (PAC) bersama PR dan PK se-Kecamatan.',
    subject: 'UNDANGAN RAPAT PLENO PIMPINAN ANAK CABANG',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Rekan-rekanita:
1. Pengurus Harian & Departemen PAC IPNU [NAMA_WILAYAH]
2. Ketua Pimpinan Ranting (PR) Desa se-[NAMA_WILAYAH]
3. Ketua Pimpinan Komisariat (PK) Sekolah/Pesantren se-[NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Semoga Rekan-rekanita senantiasa dalam limpahan taufiq dan ridho Allah SWT serta senantiasa istiqomah dalam menjalankan amanah keorganisasian IPNU.

Dalam rangka evaluasi program kerja triwulan tingkat kecamatan serta persiapan pelaksanaan Masa Kesetiaan Anggota (Makesta) terpadu di wilayah [NAMA_WILAYAH], kami mengundang kehadiran Rekan-rekanita pada Rapat Pleno PAC yang akan diselenggarakan pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : Rapat Pleno Koordinasi Program & Kaderisasi se-[NAMA_WILAYAH]

Besar harapan kami Rekan-rekanita dapat hadir tepat waktu demi keberlangsungan syiar pelajar Nahdlatul Ulama di tingkat kecamatan dan desa.

Demikian surat ini kami sampaikan, atas perhatian dan kehadirannya diucapkan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Rapat Pengurus Harian PAC (Kecamatan)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PAC'],
    keteranganWewenang: 'Wewenang Pengurus Harian PAC untuk agenda kerja dan verifikasi SRP.',
    subject: 'UNDANGAN RAPAT PENGURUS HARIAN PIMPINAN ANAK CABANG',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Rekan Pengurus Harian
Pimpinan Anak Cabang IPNU [NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Salam silaturrahim kami sampaikan, semoga kita semua selalu dalam rahmat dan perlindungan Allah SWT.

Sehubungan dengan kebutuhan verifikasi administrasi pengesahan pengurus ranting dan komisariat baru, serta penyiapan berkas Surat Rekomendasi Pengesahan (SRP) yang akan diajukan ke Pimpinan Cabang, kami mengundang kehadiran Pengurus Harian PAC pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : 1. Pemeriksaan Berkas Rekomendasi Pengesahan (SRP) PR & PK
               2. Penataan Kas & Rencana Rutinan Diba'iyah PAC
               3. Persiapan Audiensi dengan Forkopimcam (Camat, Kapolsek, Danramil)

Demikian undangan ini kami sampaikan, atas kehadirannya dihaturkan jazakumullah khairan katsiran.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Rapat Koordinasi Anak Cabang (Rakorancab)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PAC'],
    keteranganWewenang: 'Wewenang PAC untuk koordinasi berkala bersama seluruh PR dan PK se-Kecamatan.',
    subject: 'UNDANGAN RAPAT KOORDINASI ANAK CABANG (RAKORANCAB)',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Rekan Ketua dan Sekretaris PR serta PK IPNU
se-[NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Salam silaturrahim kami sampaikan, semoga Rekan-rekan sekalian senantiasa dalam naungan inayah Allah SWT.

Pimpinan Anak Cabang IPNU [NAMA_WILAYAH] akan menyelenggarakan Rapat Koordinasi Anak Cabang (Rakorancab) guna menyelaraskan gerak langkah kaderisasi desa dan sekolah/pesantren, yang akan dilaksanakan pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : Pemetaan Basis Kaderisasi Pelajar Desa & Sekolah/Pesantren di [NAMA_WILAYAH]

Setiap Ranting dan Komisariat dimohon mengirimkan 2 orang pengurus (Ketua & Sekretaris) dengan membawa laporan tertulis perkembangan anggota di wilayahnya masing-masing.

Demikian surat undangan ini kami sampaikan, atas kehadirannya disampaikan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Konferensi Anak Cabang (Konferancab)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PAC'],
    keteranganWewenang: 'Forum permusyawaratan tertinggi organisasi tingkat Anak Cabang / Kecamatan.',
    subject: 'UNDANGAN KONFERENSI ANAK CABANG (KONFERANCAB)',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: 1 Berkas Tata Tertib & Jadwal
Perihal: [PERIHAL]

Yth. Pimpinan Ranting (PR) dan Pimpinan Komisariat (PK) IPNU
se-[NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Berdasarkan amanat Peraturan Rumah Tangga IPNU terkait permusyawaratan tertinggi di tingkat kecamatan pasca berakhirnya masa khidmat, Pimpinan Anak Cabang IPNU [NAMA_WILAYAH] mengundang utusan resmi seluruh Ranting dan Komisariat untuk menghadiri Konferensi Anak Cabang (Konferancab) pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : 1. Laporan Pertanggungjawaban (LPJ) Pengurus PAC
               2. Sidang Komisi Organisasi, Kaderisasi, dan Rekomendasi
               3. Pemilihan Ketua PAC IPNU [NAMA_WILAYAH] Masa Khidmat Baru

Setiap pimpinan basis berhak mengutus delegasi sah yang dibuktikan dengan Surat Mandat resmi bermaterai/berstempel.

Demikian surat ini kami buat, atas kehadiran rekan-rekan disampaikan banyak terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Rapat Anggota Ranting (Forum Tertinggi Desa)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PR'],
    keteranganWewenang: 'Musyawarah tertinggi anggota IPNU-IPPNU di tingkat desa/kelurahan.',
    subject: 'UNDANGAN RAPAT ANGGOTA RANTING IPNU',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Seluruh Anggota dan Kader IPNU [NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Puji syukur kita panjatkan ke hadirat Allah SWT atas nikmat iman, islam, dan kesehatan. Shalawat serta salam senantiasa terlimpah kepada junjungan kita Nabi Agung Muhammad SAW.

Sehubungan dengan berakhirnya masa kepengurusan Pimpinan Ranting IPNU [NAMA_WILAYAH], kami mengundang seluruh anggota pelajar dan pemuda Nahdlatul Ulama di lingkungan desa untuk menghadiri Rapat Anggota Ranting (Permusyawaratan Tertinggi Desa) yang akan diselenggarakan pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : 1. Laporan Pertanggungjawaban (LPJ) Pengurus Ranting
               2. Pemilihan Ketua Pimpinan Ranting IPNU [NAMA_WILAYAH] Masa Khidmat 2024-2026
               3. Pembentukan Tim Formatur Penyusun Pengurus

Kehadiran seluruh rekan anggota sangat menentukan masa depan kepemimpinan pelajar NU di desa kita tercinta.

Demikian undangan ini kami sampaikan, atas kehadiran rekan-rekan diucapkan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Rapat Pengurus Harian Ranting (PR Desa)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PR'],
    keteranganWewenang: 'Wewenang Pengurus Harian Ranting untuk rutinan Aswaja dan kas desa.',
    subject: 'UNDANGAN RAPAT PENGURUS HARIAN RANTING',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Rekan Pengurus Harian IPNU [NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Salam silaturrahim teriring doa semoga Rekan-rekan pengurus senantiasa dalam keadaan sehat wal afiat dan diberkahi Allah SWT.

Dalam rangka mematangkan rencana rutinan pembacaan Diba'iyah/Barzanji malam Jumat, pengajian Aswaja pemuda desa, serta kegiatan sosial kemasyarakatan, kami mengundang kehadiran Rekan-rekan Pengurus Harian Ranting pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : Penataan Jadwal Rutinan Amaliyah Aswaja & Kas Ranting [NAMA_WILAYAH]

Mengingat pentingnya agenda ini untuk menjaga ghirah perjuangan di desa, kami harapkan kehadiran tepat waktu.

Demikian undangan ini kami sampaikan, terima kasih atas perhatian dan kebersamaannya.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Rapat Pleno Ranting (PR Desa)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PR'],
    keteranganWewenang: 'Rapat evaluasi lengkap pengurus dan anggota ranting desa.',
    subject: 'UNDANGAN RAPAT PLENO RANTING DESA',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Pengurus Lengkap dan Anggota IPNU [NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Dengan memohon rahmat dan ridho Allah SWT, Pimpinan Ranting IPNU [NAMA_WILAYAH] mengundang seluruh jajaran pengurus dan anggota ranting dalam forum Rapat Pleno Ranting pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : 1. Evaluasi Kegiatan Keagamaan dan Kemasyarakatan Desa
               2. Kolaborasi dengan Pengurus Ranting NU & Badan Otonom Desa
               3. Persiapan Peringatan Hari Besar Islam (PHBI)

Kehadiran Rekan-rekan sekalian merupakan bukti nyata khidmah kita kepada agama, nusa, dan bangsa.

Demikian undangan ini kami sampaikan, atas kehadiran dan kerjasamanya kami ucapkan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Rapat Anggota Komisariat (MAK / RAK Sekolah)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PK'],
    keteranganWewenang: 'Permusyawaratan tertinggi komisariat sekolah/pesantren/kampus.',
    subject: 'UNDANGAN RAPAT ANGGOTA KOMISARIAT (MAK)',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Seluruh Anggota Pelajar IPNU [NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Salam silaturrahim teriring doa kami sampaikan, semoga Rekan-rekan senantiasa diberikan kemudahan dalam menuntut ilmu dan meraih prestasi yang membanggakan.

Sehubungan dengan berakhirnya masa kepengurusan komisariat, kami mengundang seluruh anggota pelajar dan santri untuk hadir pada Rapat Anggota Komisariat (Musyawarah Anggota Komisariat / MAK) yang akan dilaksanakan pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : 1. Penyampaian Laporan Pertanggungjawaban (LPJ) Pengurus Komisariat
               2. Pemilihan Ketua Pimpinan Komisariat IPNU [NAMA_WILAYAH] Masa Khidmat Baru
               3. Perumusan Arah Kebijakan Pelajar Aswaja di Lingkungan Lembaga

Partisipasi aktif Rekan-rekan sangat berharga dalam mewujudkan iklim kepemimpinan pelajar yang berakhlak mulia dan demokratis.

Demikian undangan ini kami sampaikan, atas perhatian dan kehadirannya diucapkan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Rapat Kerja Komisariat (Rakerkom Sekolah)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PK'],
    keteranganWewenang: 'Penyusunan kalender kerja ekstrakurikuler & Makesta komisariat sekolah/pesantren.',
    subject: 'UNDANGAN RAPAT KERJA KOMISARIAT (RAKERKOM)',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: 1 Berkas Draft Program Kerja
Perihal: [PERIHAL]

Yth. Pengurus Pimpinan Komisariat IPNU [NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Salam silaturrahim kami sampaikan, semoga Rekan-rekan pengurus komisariat senantiasa dalam bimbingan dan pertolongan Allah SWT.

Guna menyusun program kerja ekstrakurikuler kepelajaran, pendalaman akidah Ahlussunnah wal Jama'ah An-Nahdliyah, serta penyiapan kaderisasi Masa Kesetiaan Anggota (Makesta) di lingkungan sekolah/pesantren, kami mengundang kehadiran Pengurus pada Rapat Kerja Komisariat (Rakerkom) pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : Pembahasan dan Pengesahan Program Kerja PK IPNU [NAMA_WILAYAH]

Setiap koordinator bidang dimohon menyiapkan rencana kegiatan beserta rancangan anggaran biaya.

Demikian undangan ini kami sampaikan, atas kehadirannya dihaturkan banyak terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Undangan Rapat Pengurus Harian PK (Sekolah / Pesantren)',
    type: 'Rapat',
    organisasi: 'IPNU',
    category: 'Internal',
    indeks: '03',
    isRapat: true,
    tingkatWewenang: ['PK'],
    keteranganWewenang: 'Koordinasi teknis pekanan pengurus komisariat sekolah/pesantren.',
    subject: 'UNDANGAN RAPAT PENGURUS HARIAN KOMISARIAT',
    body: `Nomor: [NOMOR_LENGKAP]
Lampiran: [LAMPIRAN]
Perihal: [PERIHAL]

Yth. Rekan Pengurus Harian
Pimpinan Komisariat IPNU [NAMA_WILAYAH]
di Tempat

Assalamu'alaikum Warahmatullahi Wabarakatuh
Bismillahirrahmanirrahim

Semoga rekan-rekan senantiasa diberikan keteguhan iman dan kemudahan dalam menuntut ilmu di madrasah/pesantren kita tercinta.

Dalam rangka evaluasi pekanan kegiatan belajar dan organisasi, serta koordinasi teknis bersama Pembina OSIS / Waka Kesiswaan / Pengasuh Pondok Pesantren, kami mengundang kehadiran Pengurus Harian pada:

Hari/Tanggal : [HARI_TANGGAL]
Waktu        : [WAKTU] WIB s/d Selesai
Tempat       : [TEMPAT]
Agenda       : Koordinasi Pekanan dan Pembagian Tugas Harian Pengurus Komisariat

Diharapkan seluruh pengurus harian dapat hadir tepat waktu tanpa meninggalkan kewajiban belajar.

Demikian undangan ini kami sampaikan, atas kehadiran rekan-rekan diucapkan terima kasih.

Wallahul muwaffiq ilaa aqwamith thariq
Wassalamu'alaikum Warahmatullahi Wabarakatuh`,
  },
  {
    name: 'Berita Acara & Notulen Rapat Resmi Organisasi',
    type: 'Dokumen',
    organisasi: 'BERSAMA',
    category: 'Dokumen',
    indeks: '07',
    isRapat: true,
    tingkatWewenang: ['PC', 'PAC', 'PR', 'PK'],
    keteranganWewenang: 'Dokumentasi otentik jalannya rapat dan kesepakatan musyawarah resmi di semua tingkatan.',
    subject: 'NOTULEN & BERITA ACARA RAPAT RESMI ORGANISASI',
    body: `BERITA ACARA & NOTULEN RAPAT RESMI
PIMPINAN [TINGKAT_PIMPINAN] IPNU-IPPNU [NAMA_WILAYAH]

Pada hari ini [HARI_TANGGAL], bertempat di [TEMPAT], telah diselenggarakan Rapat Resmi [TINGKAT_PIMPINAN] IPNU [NAMA_WILAYAH] dengan rincian sebagai berikut:

I. DATA PELAKSANAAN:
1. Jenis Rapat        : [PERIHAL]
2. Waktu Pelaksanaan  : [WAKTU] WIB s/d Selesai
3. Pimpinan Sidang    : [NAMA_KETUA]
4. Notulis Rapat      : [NAMA_SEKRETARIS]
5. Jumlah Kehadiran   : [AGENDA] Peserta Sah (Daftar Hadir Terlampir)

II. HASIL DAN KEPUTUSAN MUSYAWARAH:
1. Seluruh peserta rapat menyetujui laporan pelaksanaan program yang telah berjalan.
2. Menyepakati rencana agenda strategis keorganisasian berikutnya sebagaimana dituangkan dalam jadwal kerja.
3. Mengamanatkan kepada Pengurus Harian untuk menindaklanjuti keputusan rapat ini sesuai ketentuan Pedoman Administrasi yang berlaku.

Demikian Berita Acara dan Notulen Rapat ini dibuat dengan sesungguhnya untuk dipergunakan sebagai dokumen otentik organisasi.

Pimpinan Sidang / Rapat,

Ketua / Pimpinan Sidang             Sekretaris / Notulis Rapat

( .............................. )   ( .............................. )`,
  }
];

export const TemplateSurat: React.FC = () => {
  const { user, role: userRole } = useFirebase();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  // Filter states for PR & PK Dropdowns across 40 Kecamatans
  const [selectedKecamatanPr, setSelectedKecamatanPr] = useState<string>('SEMUA');
  const [selectedKecamatanPk, setSelectedKecamatanPk] = useState<string>('SEMUA');
  const [selectedJenjangPk, setSelectedJenjangPk] = useState<'Semua' | 'SLTP' | 'SLTA'>('Semua');

  // Filter category & tier states
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | 'Rapat' | 'Internal' | 'Eksternal' | 'Kepanitiaan' | 'Dokumen'>('Semua');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'PC' | 'PAC' | 'PR' | 'PK'>('ALL');
  const [strictHierarchyMode, setStrictHierarchyMode] = useState(true);

  // 1. Organisasi & Template
  const [selectedOrgChoice, setSelectedOrgChoice] = useState<'IPNU' | 'IPPNU' | 'BERSAMA'>('IPNU');

  // Tingkat Kepengurusan & Wilayah
  const [tingkatPimpinan, setTingkatPimpinan] = useState('PIMPINAN CABANG');
  const [namaWilayah, setNamaWilayah] = useState('KABUPATEN CIREBON');
  const [kodeTingkat, setKodeTingkat] = useState<'PC' | 'PAC' | 'PK' | 'PR'>('PC');
  const [kodeWilayah, setKodeWilayah] = useState('10.20');

  // 2. Penomoran & Tanggal
  const [tanggalPenerbitan, setTanggalPenerbitan] = useState(new Date().toISOString().slice(0, 10));
  const [kotaPenerbitan, setKotaPenerbitan] = useState('Cirebon');
  const [tanggalHijriyah, setTanggalHijriyah] = useState('27 Jumadilawal 1448 H');
  const [nomorUrut, setNomorUrut] = useState('048');
  const [nomorAgenda, setNomorAgenda] = useState('048/AG-PC/2026');
  const [periodeKepengurusan, setPeriodeKepengurusan] = useState('XX');
  const [klasifikasi, setKlasifikasi] = useState<'A' | 'B'>('A');
  const [indeksSurat, setIndeksSurat] = useState('03');

  // Panitia Mode Toggle & Fields
  const [isPanitiaMode, setIsPanitiaMode] = useState(false);
  const [namaAcaraPanitia, setNamaAcaraPanitia] = useState('MAKESTA');
  const [namaKetuaPanitia, setNamaKetuaPanitia] = useState('');
  const [namaSekretarisPanitia, setNamaSekretarisPanitia] = useState('');
  const [sigKetuaPanitia, setSigKetuaPanitia] = useState<string | null>(null);
  const [sigSekretarisPanitia, setSigSekretarisPanitia] = useState<string | null>(null);

  // 3. Isi Surat
  const [perihal, setPerihal] = useState('UNDANGAN RAPAT KOORDINASI CABANG (RAKORCAB)');
  const [lampiran, setLampiran] = useState('-');
  const [penerimaTujuan, setPenerimaTujuan] = useState('');
  const [alamatTujuan, setAlamatTujuan] = useState('');
  const [hariTanggalKegiatan, setHariTanggalKegiatan] = useState('');
  const [waktuKegiatan, setWaktuKegiatan] = useState('');
  const [tempatKegiatan, setTempatKegiatan] = useState('');
  const [agendaSurat, setAgendaSurat] = useState('');
  const [niaPihak, setNiaPihak] = useState('');
  const [jabatanPihak, setJabatanPihak] = useState('');

  // 4. Kop & Penandatanganan
  const [alamatSekretariat, setAlamatSekretariat] = useState('[Alamat sekretariat]');
  const [kontakWebsite, setKontakWebsite] = useState('');
  const [namaKetua, setNamaKetua] = useState('');
  const [niaKetua, setNiaKetua] = useState('');
  const [namaSekretaris, setNamaSekretaris] = useState('');
  const [niaSekretaris, setNiaSekretaris] = useState('');

  // Signatures for IPPNU in Bersama
  const [namaKetuaIppnu, setNamaKetuaIppnu] = useState('');
  const [niaKetuaIppnu, setNiaKetuaIppnu] = useState('');
  const [namaSekretarisIppnu, setNamaSekretarisIppnu] = useState('');
  const [niaSekretarisIppnu, setNiaSekretarisIppnu] = useState('');

  // Digital Signatures Base64 images
  const [sigKetua, setSigKetua] = useState<string | null>(null);
  const [sigSekretaris, setSigSekretaris] = useState<string | null>(null);
  const [sigKetuaIppnu, setSigKetuaIppnu] = useState<string | null>(null);
  const [sigSekretarisIppnu, setSigSekretarisIppnu] = useState<string | null>(null);

  // Modals state
  const [pedomanModal, setPedomanModal] = useState<'IPNU' | 'IPPNU' | null>(null);
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  const [signatureModalTarget, setSignatureModalTarget] = useState<'ketua' | 'sekretaris' | 'ketuaIppnu' | 'sekretarisIppnu' | 'ketuaPanitia' | 'sekretarisPanitia' | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Preset switch for tingkat kepengurusan (PC, PAC, PK, PR)
  const applyLevelPreset = (lvl: 'PC' | 'PAC' | 'PK' | 'PR') => {
    if (lvl === 'PC') {
      setTingkatPimpinan('PIMPINAN CABANG');
      setNamaWilayah('KABUPATEN CIREBON');
      setKodeTingkat('PC');
      setKodeWilayah('10.20');
      setAlamatSekretariat('Gedung PCNU Kab. Cirebon Jl. R. Dewi Sartika No. 09 Sumber 45611');
      setKontakWebsite('Email: pcipnucirebon@gmail.com');
      setNomorAgenda('048/AG-PC/2026');
    } else if (lvl === 'PAC') {
      setTingkatPimpinan('PIMPINAN ANAK CABANG');
      setNamaWilayah('KECAMATAN PALIMANAN');
      setKodeTingkat('PAC');
      setKodeWilayah('10.20.01');
      setAlamatSekretariat('Jl. Raya Palimanan No. 12, Cirebon');
      setKontakWebsite('Email: pacipnupalimanan@gmail.com');
      setNomorAgenda('048/AG-PAC/2026');
    } else if (lvl === 'PK') {
      setTingkatPimpinan('PIMPINAN KOMISARIAT');
      setNamaWilayah('MA MA\'ARIF CIREBON');
      setKodeTingkat('PK');
      setKodeWilayah('10.20.01.01');
      setAlamatSekretariat('Kompleks Perguruan Ma\'arif Cirebon');
      setKontakWebsite('');
      setNomorAgenda('048/AG-PK/2026');
    } else if (lvl === 'PR') {
      setTingkatPimpinan('PIMPINAN RANTING');
      setNamaWilayah('DESA KEDAWUNG');
      setKodeTingkat('PR');
      setKodeWilayah('10.20.02.01');
      setAlamatSekretariat('Sekretariat Bersama PR IPNU-IPPNU Desa Kedawung');
      setKontakWebsite('');
      setNomorAgenda('048/AG-PR/2026');
    }
  };

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
        handleSelectTemplate(combined[0]);
      }
    }, (err) => {
      console.warn('Load letter templates notice:', err);
      const defaults = DEFAULT_TEMPLATES.map((t, idx) => ({ id: `default-${idx}`, ...t }));
      setTemplates(defaults);
      if (!selectedTemplate) {
        handleSelectTemplate(defaults[0]);
      }
    });

    return () => unsub();
  }, []);

  // Compute Standard Roman Month & Year
  const getRomanMonth = (dateStr?: string) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romanMonths[d.getMonth()] || 'XI';
  };
  const getYearStr = (dateStr?: string) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.getFullYear().toString();
  };

  // Generate Official Pedoman Persuratan Konbes 2024 Numbers:
  // Normal Mode:
  // IPNU: [No]/[Tingkat]/[Klasifikasi]/[Indeks]/[KodeWilayah]/[Bulan Romawi]/[Tahun]
  // IPPNU: [No]/[Tingkat]/Adm/[Klasifikasi]/[KodeWilayah]/[Bulan Romawi]/[Tahun]
  // Panitia Mode:
  // IPNU: [No]/Pan-[ACARA]/[Tingkat]/[Klasifikasi]/[Indeks]/[KodeWilayah]/[Bulan Romawi]/[Tahun]
  const panPrefix = isPanitiaMode ? `Pan-${namaAcaraPanitia || 'EVENT'}/` : '';

  const computedIpnuNumber = `${nomorUrut}/${panPrefix}${kodeTingkat}/${klasifikasi}/${indeksSurat}/${kodeWilayah}/${getRomanMonth(tanggalPenerbitan)}/${getYearStr(tanggalPenerbitan)}`;
  const computedIppnuNumber = `${nomorUrut}/${panPrefix}${kodeTingkat}/Adm/${klasifikasi}/${indeksSurat}/${kodeWilayah}/${getRomanMonth(tanggalPenerbitan)}/${getYearStr(tanggalPenerbitan)}`;
  const computedBersamaNumber = `IPNU: ${computedIpnuNumber}\nIPPNU: ${computedIppnuNumber}`;

  const currentComputedNumber = selectedOrgChoice === 'IPNU' 
    ? computedIpnuNumber 
    : selectedOrgChoice === 'IPPNU' 
    ? computedIppnuNumber 
    : `${computedIpnuNumber} / ${computedIppnuNumber}`;

  const getComputedLetterBody = () => {
    if (!selectedTemplate) return '';
    let body = selectedTemplate.body;

    body = body.replace(/\[NOMOR_LENGKAP\]/g, currentComputedNumber);
    body = body.replace(/\[NOMOR_LENGKAP_BERSAMA\]/g, computedBersamaNumber);
    body = body.replace(/\[NOMOR_AGENDA\]/g, nomorAgenda);
    body = body.replace(/\[PERIHAL\]/g, perihal);
    body = body.replace(/\[LAMPIRAN\]/g, lampiran);
    body = body.replace(/\[PENERIMA_TUJUAN\]/g, penerimaTujuan || '[TUJUAN_SURAT]');
    body = body.replace(/\[ALAMAT_TUJUAN\]/g, alamatTujuan || '[ALAMAT_TUJUAN]');
    body = body.replace(/\[HARI_TANGGAL\]/g, hariTanggalKegiatan || '[HARI_TANGGAL]');
    body = body.replace(/\[WAKTU\]/g, waktuKegiatan || '[WAKTU]');
    body = body.replace(/\[TEMPAT\]/g, tempatKegiatan || '[TEMPAT]');
    body = body.replace(/\[AGENDA\]/g, agendaSurat || '[AGENDA]');
    body = body.replace(/\[NIA\]/g, niaPihak || '[NIA]');
    body = body.replace(/\[JABATAN\]/g, jabatanPihak || '[JABATAN]');
    body = body.replace(/\[TINGKAT_PIMPINAN\]/g, tingkatPimpinan);
    body = body.replace(/\[NAMA_WILAYAH\]/g, namaWilayah);
    body = body.replace(/\[ALAMAT_SEKRETARIAT\]/g, alamatSekretariat);
    body = body.replace(/\[KOTA\]/g, kotaPenerbitan);
    body = body.replace(/\[TANGGAL_MASEHI\]/g, formatMasehiDate(tanggalPenerbitan));
    body = body.replace(/\[TANGGAL_HIJRIYAH\]/g, tanggalHijriyah);

    return body;
  };

  // Render text with typographical formatting matching screenshots
  const renderFormattedBody = (rawText: string) => {
    const paragraphs = rawText.split('\n\n');
    return (
      <div className="space-y-3.5 text-[12.5px] leading-relaxed font-sans text-gray-900">
        {paragraphs.map((para, idx) => {
          const trimmed = para.trim();
          if (!trimmed) return null;

          // Check for Header Meta block (Nomor, Lampiran, Perihal / Hal) - Ordered Vertically: 1. Nomor, 2. Lampiran, 3. Perihal
          if (
            trimmed.includes("Nomor:") || 
            trimmed.includes("Lampiran:") || 
            trimmed.includes("Perihal:") || 
            trimmed.includes("Hal:")
          ) {
            const lines = trimmed.split('\n');
            let nomorVal = '';
            let lampiranVal = '';
            let perihalVal = '';
            const unhandledLines: string[] = [];

            lines.forEach(line => {
              const colonIdx = line.indexOf(':');
              if (colonIdx !== -1) {
                const label = line.slice(0, colonIdx).trim().toLowerCase();
                const val = line.slice(colonIdx + 1).trim();
                if (label.includes('nomor') || label === 'no') {
                  nomorVal = val;
                } else if (label.includes('lampiran')) {
                  lampiranVal = val;
                } else if (label.includes('perihal') || label === 'hal') {
                  perihalVal = val;
                } else {
                  unhandledLines.push(line);
                }
              } else {
                if (line.trim()) unhandledLines.push(line);
              }
            });

            const hasHeaderFields = nomorVal || lampiranVal || perihalVal || lines.some(l => l.includes(':'));

            if (hasHeaderFields) {
              return (
                <div key={idx} className="my-3 text-[12.5px] font-sans font-normal text-gray-900 space-y-1">
                  {/* 1. Atas: Nomor Surat */}
                  {(nomorVal || lines.some(l => l.toLowerCase().startsWith('nomor:'))) && (
                    <div className="flex items-start">
                      <span className="w-24 font-medium shrink-0">Nomor</span>
                      <span className="mr-2">:</span>
                      <span className="font-semibold text-gray-900 break-all flex-1 whitespace-pre-line">
                        {nomorVal || currentComputedNumber}
                      </span>
                    </div>
                  )}
                  {/* 2. Tengah (Di bawahnya): Lampiran */}
                  {(lampiranVal || lines.some(l => l.toLowerCase().startsWith('lampiran:'))) && (
                    <div className="flex items-start">
                      <span className="w-24 font-medium shrink-0">Lampiran</span>
                      <span className="mr-2">:</span>
                      <span className="font-medium text-gray-900 flex-1">{lampiranVal || lampiran || '-'}</span>
                    </div>
                  )}
                  {/* 3. Bawah (Di bawah lampiran): Perihal */}
                  {(perihalVal || lines.some(l => l.toLowerCase().startsWith('perihal:') || l.toLowerCase().startsWith('hal:'))) && (
                    <div className="flex items-start">
                      <span className="w-24 font-medium shrink-0">Perihal</span>
                      <span className="mr-2">:</span>
                      <span className="font-bold text-gray-900 uppercase flex-1 leading-snug">{perihalVal || perihal}</span>
                    </div>
                  )}

                  {unhandledLines.map((uLine, uIdx) => (
                    <p key={uIdx} className="text-justify leading-relaxed mt-2 whitespace-pre-line">{uLine}</p>
                  ))}
                </div>
              );
            }
          }

          // Check for opening greetings
          if (trimmed.toLowerCase().includes("assalamu'alaikum") || trimmed.toLowerCase().includes("assalamu’alaikum")) {
            const lines = trimmed.split('\n');
            return (
              <div key={idx} className="space-y-1 my-1">
                {lines.map((line, lIdx) => {
                  const tLine = line.trim();
                  if (tLine.toLowerCase().includes("assalamu'alaikum") || tLine.toLowerCase().includes("assalamu’alaikum")) {
                    return (
                      <p key={lIdx} className="italic underline font-medium">
                        {tLine}
                      </p>
                    );
                  }
                  if (tLine.toLowerCase().includes("bismillah")) {
                    return (
                      <p key={lIdx} className="italic font-medium">
                        {tLine}
                      </p>
                    );
                  }
                  return <p key={lIdx}>{tLine}</p>;
                })}
              </div>
            );
          }

          // Check for closing greetings
          if (trimmed.toLowerCase().includes("wallahul muwaffiq") || trimmed.toLowerCase().includes("wassalamu'alaikum")) {
            const lines = trimmed.split('\n');
            return (
              <div key={idx} className="space-y-1 pt-2 my-1">
                {lines.map((line, lIdx) => {
                  const tLine = line.trim();
                  if (tLine.toLowerCase().includes("wallahul muwaffiq")) {
                    return (
                      <p key={lIdx} className="italic underline font-medium">
                        {tLine}
                      </p>
                    );
                  }
                  if (tLine.toLowerCase().includes("wassalamu'alaikum") || tLine.toLowerCase().includes("wassalamu’alaikum")) {
                    return (
                      <p key={lIdx} className="italic font-medium">
                        {tLine}
                      </p>
                    );
                  }
                  return <p key={lIdx}>{tLine}</p>;
                })}
              </div>
            );
          }

          // Check for schedule details block (Hari/Tanggal, Waktu, Tempat, Agenda)
          if (trimmed.includes("Hari/Tanggal:") || trimmed.includes("Waktu:") || trimmed.includes("Tempat:")) {
            const lines = trimmed.split('\n');
            return (
              <div key={idx} className="pl-5 space-y-1 my-2 font-sans">
                {lines.map((line, lIdx) => {
                  const colonIdx = line.indexOf(':');
                  if (colonIdx !== -1) {
                    const label = line.slice(0, colonIdx).trim();
                    const val = line.slice(colonIdx + 1).trim();
                    return (
                      <div key={lIdx} className="flex text-[12.5px]">
                        <span className="w-28 font-medium">{label}</span>
                        <span className="mr-1">:</span>
                        <span className="flex-1 font-semibold">{val}</span>
                      </div>
                    );
                  }
                  return <p key={lIdx}>{line}</p>;
                })}
              </div>
            );
          }

          // Standard paragraph
          return (
            <p key={idx} className="text-justify leading-relaxed whitespace-pre-line">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  // Logic Gate for Template Selection
  const handleSelectTemplate = (t: LetterTemplate) => {
    setSelectedTemplate(t);
    setSelectedOrgChoice(t.organisasi);
    setIndeksSurat(t.indeks || '03');

    // Auto-set Klasifikasi (A for Internal, B for Eksternal)
    if (t.category === 'Eksternal') {
      setKlasifikasi('B');
    } else {
      setKlasifikasi('A');
    }

    // Auto-toggle Panitia Mode
    if (t.category === 'Kepanitiaan') {
      setIsPanitiaMode(true);
    } else {
      setIsPanitiaMode(false);
    }

    if (t.subject) setPerihal(t.subject);

    // Auto-fill target receiver according to Pedoman Administrasi Flow (Logic Gate)
    if (t.name.includes('Rekomendasi Pengesahan')) {
      if (kodeTingkat === 'PK' || kodeTingkat === 'PR') {
        setPenerimaTujuan('Pimpinan Anak Cabang (PAC) IPNU-IPPNU ' + (namaWilayah.includes('KECAMATAN') ? namaWilayah : 'Kecamatan Palimanan'));
        setAlamatTujuan('di Tempat');
      } else if (kodeTingkat === 'PAC') {
        setPenerimaTujuan('Pimpinan Cabang (PC) IPNU-IPPNU Kabupaten Cirebon');
        setAlamatTujuan('Gedung PCNU Kab. Cirebon Jl. R. Dewi Sartika No. 09 Sumber');
      }
    }
  };

  // Check strict hierarchy violation:
  // 1. Template specifies tingkatWewenang and current kodeTingkat is not in it
  // 2. Template requires SK Authority and current kodeTingkat is not 'PC'
  const isAuthorityViolated = Boolean(
    strictHierarchyMode && selectedTemplate && (
      (selectedTemplate.tingkatWewenang && !selectedTemplate.tingkatWewenang.includes(kodeTingkat)) ||
      (selectedTemplate.requiresSKAuthority && kodeTingkat !== 'PC')
    )
  );

  const handleCopy = () => {
    if (isAuthorityViolated) {
      showToast(`Peringatan: Dokumen ini melanggar Pedoman Administrasi untuk tingkat ${kodeTingkat}`, 'error');
    }
    const text = getComputedLetterBody();
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Teks surat berhasil disalin ke clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (isAuthorityViolated) {
      showToast(`Penerbitan diblokir: Pimpinan ${kodeTingkat} tidak berwenang menerbitkan "${selectedTemplate?.name}"`, 'error');
      return;
    }
    window.print();
  };

  // Filter templates based on Search, Org, Category, Tier, and Strict Hierarchy
  const filteredTemplates = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        t.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (t.subject && t.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchOrg = t.organisasi === selectedOrgChoice || t.organisasi === 'BERSAMA';

    const matchCategory = 
      categoryFilter === 'Semua' ? true :
      categoryFilter === 'Rapat' ? Boolean(t.isRapat) :
      categoryFilter === 'Internal' ? (t.category === 'Internal' || t.category === 'SK' || t.category === 'Mandat') :
      categoryFilter === 'Eksternal' ? t.category === 'Eksternal' :
      categoryFilter === 'Kepanitiaan' ? t.category === 'Kepanitiaan' :
      t.category === 'Dokumen';

    const matchTier = tierFilter === 'ALL' ? true : (t.tingkatWewenang ? t.tingkatWewenang.includes(tierFilter) : true);

    // Strict Role-based logic gate: Hide SK / unauthorized templates when in 'Semua' if strict mode is active
    const isRestrictedForTier = strictHierarchyMode && t.tingkatWewenang && !t.tingkatWewenang.includes(kodeTingkat);

    return matchSearch && matchOrg && matchCategory && matchTier && (!isRestrictedForTier || categoryFilter !== 'Semua' || tierFilter !== 'ALL');
  });

  const formatMasehiDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] space-y-6">
      {/* Breadcrumbs & Header */}
      <div className="space-y-2 border-b border-[var(--border-main)] pb-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-mono text-zinc-500">
          <span>HOME</span>
          <span>/</span>
          <span className="text-emerald-400 font-bold">TEMPLATES</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Sistem Pakar Administrasi - PC IPNU & IPPNU KABUPATEN CIREBON
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Konbes II 2024 Compliance
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)] mt-0.5">
              Generator Surat Resmi & Dokumen
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-2xl">
              Pilih dari 30+ template standar Pedoman Administrasi (Internal Indeks A, Eksternal Indeks B, Kepanitiaan, dan Berita Acara) sesuai kewenangan PC, PAC, PR, dan PK.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
              <button
                type="button"
                onClick={() => setPedomanModal('IPNU')}
                className="text-emerald-400 hover:text-emerald-300 underline font-bold transition-colors"
              >
                Buka pedoman IPNU · Konbes II 2024
              </button>
              <span className="text-zinc-600">•</span>
              <button
                type="button"
                onClick={() => setPedomanModal('IPPNU')}
                className="text-teal-400 hover:text-teal-300 underline font-bold transition-colors"
              >
                Buka pedoman IPPNU · Konbes 2024
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all active:scale-95 shadow-sm"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
            </button>
            <button
              onClick={() => {
                if (isAuthorityViolated) {
                  showToast(`Hierarki tidak sah: Pimpinan ${kodeTingkat} tidak berwenang menerbitkan surat ini`, 'error');
                  return;
                }
                setIsPDFPreviewOpen(true);
              }}
              disabled={isAuthorityViolated}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black shadow transition-all active:scale-95 border",
                isAuthorityViolated
                  ? "bg-zinc-900 border-red-500/40 text-red-300 opacity-60 cursor-not-allowed"
                  : "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
              )}
            >
              <Eye size={15} className="text-emerald-400" />
              <span>Pratinjau PDF</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={isAuthorityViolated}
              className={cn(
                "flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-black shadow-lg transition-all",
                isAuthorityViolated
                  ? "bg-red-950/80 text-red-300 border border-red-500/50 cursor-not-allowed opacity-80"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 active:scale-95"
              )}
            >
              {isAuthorityViolated ? (
                <>
                  <AlertTriangle size={15} className="text-red-400" />
                  <span>Penerbitan Diblokir</span>
                </>
              ) : (
                <>
                  <Printer size={15} /> Cetak / Simpan PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Organisasi, Kategori, & Template */}
          <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-main)] space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                  Organisasi & Template Surat
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {filteredTemplates.length} Opsi
              </span>
            </div>

            {/* Organisasi Selector */}
            <div className="grid grid-cols-3 gap-2">
              {(['IPNU', 'IPPNU', 'BERSAMA'] as const).map(org => (
                <button
                  key={org}
                  type="button"
                  onClick={() => setSelectedOrgChoice(org)}
                  className={cn(
                    "py-2 px-2 text-xs font-black uppercase rounded-2xl border transition-all text-center",
                    selectedOrgChoice === org
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                      : "bg-[var(--bg-app)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-white"
                  )}
                >
                  {org === 'BERSAMA' ? 'Bersama' : org}
                </button>
              ))}
            </div>

            {/* Category Filter Tabs (Indeks A Internal, Indeks B Eksternal, Surat Rapat, Kepanitiaan, Dokumen) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 block">Kategori Pedoman Administrasi (PA)</label>
              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                {[
                  { id: 'Semua', label: 'Semua' },
                  { id: 'Rapat', label: 'Surat Rapat (15 Jenis)' },
                  { id: 'Internal', label: 'Indeks A (Internal)' },
                  { id: 'Eksternal', label: 'Indeks B (Eksternal)' },
                  { id: 'Kepanitiaan', label: 'Kepanitiaan' },
                  { id: 'Dokumen', label: 'Berita Acara' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id as any)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all uppercase border text-center",
                      categoryFilter === cat.id
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                        : "bg-[var(--bg-app)] text-zinc-400 border-[var(--border-main)] hover:text-white"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tier Authority Filter & Strict Mode Toggle */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-400 block">Filter Sesuai Kewenangan Tingkat</label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-emerald-400 select-none">
                  <input
                    type="checkbox"
                    checked={strictHierarchyMode}
                    onChange={(e) => setStrictHierarchyMode(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Ketat Aturan PA</span>
                </label>
              </div>
              <div className="grid grid-cols-5 gap-1 text-[10px] font-bold">
                {[
                  { id: 'ALL', label: 'Semua' },
                  { id: 'PC', label: 'PC (Cabang)' },
                  { id: 'PAC', label: 'PAC (Kec)' },
                  { id: 'PR', label: 'PR (Desa)' },
                  { id: 'PK', label: 'PK (Sekolah)' },
                ].map(tier => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setTierFilter(tier.id as any)}
                    className={cn(
                      "py-1 rounded-xl border text-center transition-all",
                      tierFilter === tier.id
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-sm font-black"
                        : "bg-[var(--bg-app)] border-[var(--border-main)] text-zinc-400 hover:text-white"
                    )}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Role & Hierarchy Guard Alert Banner */}
            {isAuthorityViolated ? (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border-2 border-red-500/60 text-red-200 space-y-2 shadow-lg">
                <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase tracking-wider">
                  <AlertTriangle size={16} className="shrink-0 text-red-400 animate-pulse" />
                  <span>Pelanggaran Hierarki Pedoman Administrasi</span>
                </div>
                <p className="text-[11px] leading-relaxed text-red-200">
                  Tingkat <strong>{kodeTingkat}</strong> ({tingkatPimpinan}) <strong>TIDAK BERWENANG</strong> menerbitkan surat <strong>&quot;{selectedTemplate?.name}&quot;</strong>.
                  {selectedTemplate?.keteranganWewenang && (
                    <span className="block mt-1 font-semibold text-amber-300 bg-amber-950/40 p-2 rounded-xl border border-amber-500/30">
                      Pasal PA: {selectedTemplate.keteranganWewenang}
                    </span>
                  )}
                </p>
                <div className="pt-1 flex flex-wrap gap-2">
                  {selectedTemplate?.requiresSKAuthority && (
                    <button
                      type="button"
                      onClick={() => {
                        const srp = templates.find(t => t.name.includes('Rekomendasi Pengesahan'));
                        if (srp) handleSelectTemplate(srp);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10.5px] shadow"
                    >
                      Alihkan ke Surat Rekomendasi (SRP)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => applyLevelPreset('PC')}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[10.5px] border border-zinc-700"
                  >
                    Alihkan Tingkat ke PC (Cabang)
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10.5px] flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>Hierarki Sah: Wewenang Pimpinan {kodeTingkat} Terverifikasi</span>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black">
                  PA PP IPNU-IPPNU
                </span>
              </div>
            )}

            {/* Role-based Banner Advice */}
            {(kodeTingkat === 'PR' || kodeTingkat === 'PK') && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 space-y-1">
                <span className="font-black text-amber-400 flex items-center gap-1.5">
                  <Sparkles size={13} /> Pimpinan {kodeTingkat} (Ranting / Komisariat)
                </span>
                <p className="text-[10.5px] leading-relaxed text-zinc-300">
                  Untuk pengesahan pengurus baru, gunakan <strong>Surat Rekomendasi Pengesahan (SRP)</strong> yang ditujukan ke PAC. Menu SK dibatasi hanya untuk PC Cabang sesuai alur kewenangan.
                </p>
              </div>
            )}

            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 block">Cari template surat</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Ketik kata kunci nama atau perihal surat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl py-2 pl-9 pr-3 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Template List Items */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
              {filteredTemplates.map(t => {
                const isItemViolated = strictHierarchyMode && t.tingkatWewenang && !t.tingkatWewenang.includes(kodeTingkat);
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className={cn(
                      "w-full text-left p-3 rounded-2xl border transition-all flex flex-col gap-1 relative",
                      selectedTemplate?.id === t.id
                        ? "bg-emerald-600/10 border-emerald-500/50 text-[var(--text-main)] shadow-sm"
                        : "bg-[var(--bg-app)]/60 border-[var(--border-main)] text-[var(--text-muted)] hover:border-emerald-500/30 hover:text-[var(--text-main)]",
                      isItemViolated && "opacity-60 border-red-500/20"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                          t.isRapat ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                          t.category === 'Internal' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                          t.category === 'Eksternal' ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                          t.category === 'Kepanitiaan' ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
                          "bg-zinc-500/20 text-zinc-300 border-zinc-500/30"
                        )}>
                          {t.isRapat ? 'Surat Rapat' : t.category === 'Internal' ? 'Indeks A' : t.category === 'Eksternal' ? 'Indeks B' : t.category} · {t.indeks || '03'}
                        </span>

                        {t.tingkatWewenang && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {t.tingkatWewenang.join('/')}
                          </span>
                        )}
                      </div>

                      {t.requiresSKAuthority ? (
                        <span className="text-[9px] font-bold text-red-400 flex items-center gap-1">
                          <Shield size={10} /> Khusus PC
                        </span>
                      ) : isItemViolated ? (
                        <span className="text-[9px] font-bold text-red-400">
                          Bukan Wewenang {kodeTingkat}
                        </span>
                      ) : null}
                    </div>
                    <span className="font-bold text-xs leading-tight text-[var(--text-main)] mt-0.5">
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Penomoran & Tanggal */}
          <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-main)] space-y-3.5 shadow-sm text-xs">
            <div className="flex items-center gap-2 border-b border-[var(--border-main)] pb-3">
              <Calendar size={16} className="text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                Penomoran & Tanggal
              </h3>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">Tanggal penerbitan</label>
              <input
                type="date"
                value={tanggalPenerbitan}
                onChange={(e) => setTanggalPenerbitan(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Kota penerbitan</label>
                <input
                  type="text"
                  value={kotaPenerbitan}
                  onChange={(e) => setKotaPenerbitan(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Tanggal Hijriyah</label>
                <input
                  type="text"
                  value={tanggalHijriyah}
                  onChange={(e) => setTanggalHijriyah(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                  Nomor urut agenda
                </label>
                <input
                  type="text"
                  value={nomorUrut}
                  onChange={(e) => setNomorUrut(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                  Kode Indeks Surat
                </label>
                <select
                  value={indeksSurat}
                  onChange={(e) => setIndeksSurat(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="01">01 - Surat Keputusan (SK)</option>
                  <option value="02">02 - Surat Mandat / Tugas</option>
                  <option value="03">03 - Surat Undangan</option>
                  <option value="04">04 - Permohonan / Kerjasama</option>
                  <option value="05">05 - Instruksi / Edaran / Pengantar</option>
                  <option value="06">06 - Rekomendasi Pengesahan</option>
                  <option value="07">07 - Surat Keterangan / Berita Acara</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                Klasifikasi Surat (Indeks A / B)
              </label>
              <select
                value={klasifikasi}
                onChange={(e) => setKlasifikasi(e.target.value as 'A' | 'B')}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="A">A - Internal Organisasi (IPNU-IPPNU / NU)</option>
                <option value="B">B - Eksternal Organisasi (Instansi / Dinas / Sekolah)</option>
              </select>
            </div>

            {/* Mode Panitia Toggle */}
            <div className="p-3 bg-purple-950/30 rounded-2xl border border-purple-500/30 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[11px] font-black uppercase text-purple-300 flex items-center gap-1.5">
                  <Users size={14} /> Mode Surat Kepanitiaan (Pan-[ACARA])
                </span>
                <input
                  type="checkbox"
                  checked={isPanitiaMode}
                  onChange={(e) => setIsPanitiaMode(e.target.checked)}
                  className="rounded accent-purple-500 w-4 h-4"
                />
              </label>

              {isPanitiaMode && (
                <div className="space-y-2 pt-1">
                  <label className="text-[10px] font-bold text-purple-200 block">Nama Acara Kepanitiaan (misal: MAKESTA, LAKMUD)</label>
                  <input
                    type="text"
                    value={namaAcaraPanitia}
                    onChange={(e) => setNamaAcaraPanitia(e.target.value.toUpperCase())}
                    placeholder="MAKESTA"
                    className="w-full bg-[var(--bg-app)] border border-purple-500/40 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-purple-200"
                  />
                </div>
              )}
            </div>

            {/* Kotak Nomor Terbentuk */}
            <div className="p-3.5 bg-black/50 rounded-2xl border border-zinc-800 space-y-1">
              <span className="text-[9px] uppercase font-bold text-zinc-500 block">NOMOR RESMI TERBENTUK:</span>
              <p className="font-mono text-xs font-bold text-emerald-400 break-all leading-tight">
                {currentComputedNumber}
              </p>
            </div>
          </div>

          {/* Card 3: Isi Surat & Lampiran */}
          <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-main)] space-y-3.5 shadow-sm text-xs">
            <div className="flex items-center gap-2 border-b border-[var(--border-main)] pb-3">
              <Edit2 size={16} className="text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                Isi Surat & Lampiran
              </h3>
            </div>

            {/* Urutan Form Sesuai Permintaan: Lampiran dulu baru Perihal */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                Lampiran (jumlah jenis berkas, &quot;-&quot; bila tidak ada)
              </label>
              <input
                type="text"
                value={lampiran}
                onChange={(e) => setLampiran(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">Perihal / Hal</label>
              <input
                type="text"
                value={perihal}
                onChange={(e) => setPerihal(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">Penerima / tujuan surat</label>
              <input
                type="text"
                value={penerimaTujuan}
                onChange={(e) => setPenerimaTujuan(e.target.value)}
                placeholder="Contoh: Rekan Ketua PAC & PK IPNU"
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">Alamat tujuan surat</label>
              <input
                type="text"
                value={alamatTujuan}
                onChange={(e) => setAlamatTujuan(e.target.value)}
                placeholder="Contoh: di Tempat"
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">Hari dan tanggal kegiatan</label>
              <input
                type="text"
                value={hariTanggalKegiatan}
                onChange={(e) => setHariTanggalKegiatan(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">Waktu kegiatan</label>
              <input
                type="text"
                value={waktuKegiatan}
                onChange={(e) => setWaktuKegiatan(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">Tempat kegiatan</label>
              <input
                type="text"
                value={tempatKegiatan}
                onChange={(e) => setTempatKegiatan(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">Agenda / keperluan</label>
              <input
                type="text"
                value={agendaSurat}
                onChange={(e) => setAgendaSurat(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Card 4: Kop & Penandatanganan */}
          <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-main)] space-y-3.5 shadow-sm text-xs">
            <div className="flex items-center gap-2 border-b border-[var(--border-main)] pb-3">
              <Building size={16} className="text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                Kop & Pejabat Penandatangan
              </h3>
            </div>

            {/* Preset Kepengurusan */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">
                Pilih Preset Tingkat Pimpinan (Auto-Kop)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['PC', 'PAC', 'PK', 'PR'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => applyLevelPreset(lvl)}
                    className={cn(
                      "px-2 py-1.5 rounded-xl border text-[11px] font-bold transition-all text-center",
                      kodeTingkat === lvl
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-sm"
                        : "bg-[var(--bg-app)] border-[var(--border-main)] text-zinc-300 hover:border-emerald-500/50"
                    )}
                  >
                    {lvl === 'PC' && 'PC (Cabang)'}
                    {lvl === 'PAC' && 'PAC (Kecamatan)'}
                    {lvl === 'PK' && 'PK (Komisariat)'}
                    {lvl === 'PR' && 'PR (Ranting)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Kolom Khusus: Ubah Nama Kecamatan, Desa, atau Sekolah/Pesantren di Nama Pimpinan */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-emerald-400 flex items-center gap-1.5">
                  <Building size={14} /> Nama Wilayah / Sekolah / Lembaga di Pimpinan
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                  Tingkat {kodeTingkat}
                </span>
              </div>

              {/* Dynamic Quick Select from Cirebon Lists */}
              {kodeTingkat === 'PAC' && (
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                    Pilih Cepat Kecamatan se-Kabupaten Cirebon (40 Kecamatan):
                  </label>
                  <select
                    value={KECAMATAN_CIREBON.find(k => namaWilayah.toUpperCase().includes(k)) || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setNamaWilayah(`KECAMATAN ${e.target.value}`);
                        setKodeWilayah(`10.20.${String((KECAMATAN_CIREBON as readonly string[]).indexOf(e.target.value) + 1).padStart(2, '0')}`);
                        setAlamatSekretariat(`Jl. Raya ${e.target.value}, Kab. Cirebon`);
                        setKontakWebsite(`Email: pacipnu.${e.target.value.toLowerCase()}@gmail.com`);
                      }
                    }}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs font-bold text-emerald-300 focus:outline-none"
                  >
                    <option value="">-- Pilih Kecamatan di Kab. Cirebon --</option>
                    {KECAMATAN_CIREBON.map(k => (
                      <option key={k} value={k}>Kecamatan {k}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Pilihan Ranting (PR): 40 Kecamatan & Seluruh Desa se-Kab. Cirebon */}
              {kodeTingkat === 'PR' && (
                <div className="space-y-2 p-2.5 bg-black/30 rounded-xl border border-emerald-500/20">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                      1. Filter Kecamatan Asal Ranting (40 Kecamatan):
                    </label>
                    <select
                      value={selectedKecamatanPr}
                      onChange={(e) => setSelectedKecamatanPr(e.target.value)}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs font-bold text-emerald-300 focus:outline-none"
                    >
                      <option value="SEMUA">-- Tampilkan Seluruh Desa se-Kab. Cirebon (412 Desa) --</option>
                      {KECAMATAN_CIREBON.map(k => (
                        <option key={k} value={k}>Kecamatan {k}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                      2. Pilih Desa / Kelurahan di Kab. Cirebon:
                    </label>
                    <select
                      value={
                        selectedKecamatanPr !== 'SEMUA' && DESA_PER_KECAMATAN[selectedKecamatanPr]
                          ? (DESA_PER_KECAMATAN[selectedKecamatanPr].find(d => namaWilayah.toUpperCase() === `DESA ${d.toUpperCase()}`) || '')
                          : (getAllDesaList().find(d => namaWilayah.toUpperCase() === `DESA ${d.desa}`)?.desa || '')
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          const desaName = e.target.value;
                          setNamaWilayah(`DESA ${desaName.toUpperCase()}`);
                          const kecName = selectedKecamatanPr !== 'SEMUA' ? selectedKecamatanPr : (getAllDesaList().find(d => d.desa === desaName.toUpperCase())?.kecamatan || 'CIREBON');
                          setAlamatSekretariat(`Sekretariat Bersama PR IPNU-IPPNU Desa ${desaName}, Kec. ${kecName}, Kab. Cirebon`);
                        }
                      }}
                      className="w-full bg-[var(--bg-app)] border border-emerald-500/40 rounded-xl px-3 py-2 text-xs font-bold text-emerald-300 focus:outline-none"
                    >
                      <option value="">-- Pilih Desa / Kelurahan --</option>
                      {selectedKecamatanPr !== 'SEMUA' && DESA_PER_KECAMATAN[selectedKecamatanPr]
                        ? DESA_PER_KECAMATAN[selectedKecamatanPr].map(d => (
                            <option key={d} value={d}>Desa {d}</option>
                          ))
                        : getAllDesaList().map(item => (
                            <option key={`${item.kecamatan}-${item.desa}`} value={item.desa}>
                              {item.label}
                            </option>
                          ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Pilihan Komisariat (PK): Sekolah SLTP - SLTA Negeri & Swasta di 40 Kecamatan Kab. Cirebon */}
              {kodeTingkat === 'PK' && (
                <div className="space-y-2 p-2.5 bg-black/30 rounded-xl border border-emerald-500/20">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                        1. Filter Kecamatan (40 Kec):
                      </label>
                      <select
                        value={selectedKecamatanPk}
                        onChange={(e) => setSelectedKecamatanPk(e.target.value)}
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-300 focus:outline-none"
                      >
                        <option value="SEMUA">Semua Kecamatan</option>
                        {KECAMATAN_CIREBON.map(k => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                        2. Jenjang Pendidikan:
                      </label>
                      <select
                        value={selectedJenjangPk}
                        onChange={(e) => setSelectedJenjangPk(e.target.value as any)}
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-300 focus:outline-none"
                      >
                        <option value="Semua">Semua (SLTP & SLTA)</option>
                        <option value="SLTP">SLTP (SMP / MTs)</option>
                        <option value="SLTA">SLTA (SMA / SMK / MA / Pesantren)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                      3. Pilih Lembaga Pendidikan / Pondok Pesantren di Kab. Cirebon:
                    </label>
                    <select
                      value={namaWilayah}
                      onChange={(e) => {
                        if (e.target.value) {
                          setNamaWilayah(e.target.value);
                          const allSchools = getAllSekolahList();
                          const found = allSchools.find(s => s.nama === e.target.value);
                          if (found) {
                            setAlamatSekretariat(`Kompleks ${found.nama}, Kec. ${found.kecamatan}, Kab. Cirebon`);
                            setKontakWebsite(`Email: pk.${found.nama.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`);
                          }
                        }
                      }}
                      className="w-full bg-[var(--bg-app)] border border-emerald-500/40 rounded-xl px-3 py-2 text-xs font-bold text-emerald-300 focus:outline-none"
                    >
                      <option value="">-- Pilih Sekolah / Pesantren se-Kab. Cirebon --</option>
                      {(() => {
                        let list = selectedKecamatanPk !== 'SEMUA' && SEKOLAH_PER_KECAMATAN[selectedKecamatanPk]
                          ? SEKOLAH_PER_KECAMATAN[selectedKecamatanPk]
                          : getAllSekolahList();
                        
                        if (selectedJenjangPk !== 'Semua') {
                          list = list.filter(s => s.jenjang === selectedJenjangPk);
                        }

                        return list.map((s, idx) => (
                          <option key={`${s.nama}-${idx}`} value={s.nama}>
                            {s.nama} ({s.jenis} {s.status}) - Kec. {s.kecamatan}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>
              )}

              {/* Direct Editable Input */}
              <div>
                <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                  {kodeTingkat === 'PC' && 'Ketik / Ubah Nama Cabang di Nama Pimpinan:'}
                  {kodeTingkat === 'PAC' && 'Ketik / Ubah Nama Kecamatan di Nama Pimpinan:'}
                  {kodeTingkat === 'PR' && 'Ketik / Ubah Nama Desa / Kelurahan di Nama Pimpinan:'}
                  {kodeTingkat === 'PK' && 'Ketik / Ubah Nama Sekolah / Pesantren di Nama Pimpinan:'}
                </label>
                <input
                  type="text"
                  value={namaWilayah}
                  onChange={(e) => setNamaWilayah(e.target.value.toUpperCase())}
                  placeholder={
                    kodeTingkat === 'PC' ? 'KABUPATEN CIREBON' :
                    kodeTingkat === 'PAC' ? 'KECAMATAN PALIMANAN' :
                    kodeTingkat === 'PR' ? 'DESA KEDAWUNG' : 'PONDOK PESANTREN BINA INSAN MULIA'
                  }
                  className="w-full bg-[var(--bg-app)] border border-emerald-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[9.5px] text-zinc-400 block mt-1">
                  * Kolom ini otomatis mengubah nama wilayah pada Kop Surat, blok nama pimpinan, tanda tangan, dan isi naskah.
                </span>
              </div>

              {/* Input Tingkat Pimpinan Label & Kode Wilayah */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-zinc-400 block mb-0.5">Teks Tingkat Pimpinan</label>
                  <input
                    type="text"
                    value={tingkatPimpinan}
                    onChange={(e) => setTingkatPimpinan(e.target.value.toUpperCase())}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-zinc-400 block mb-0.5">Kode Wilayah (Penomoran)</label>
                  <input
                    type="text"
                    value={kodeWilayah}
                    onChange={(e) => setKodeWilayah(e.target.value)}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[var(--text-main)]"
                  />
                </div>
              </div>

              {/* Live Preview of Leader Name */}
              <div className="p-2.5 bg-black/40 rounded-xl border border-zinc-800 text-[10.5px]">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-0.5">
                  Pratinjau Nama Pimpinan Terpasang:
                </span>
                <p className="font-bold text-emerald-400 leading-tight">
                  {tingkatPimpinan} {selectedOrgChoice} {namaWilayah}
                </p>
              </div>
            </div>

            {/* Alamat & Kontak Sekretariat */}
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Alamat Sekretariat di Kop</label>
                <input
                  type="text"
                  value={alamatSekretariat}
                  onChange={(e) => setAlamatSekretariat(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Kontak / Email / Website di Kop</label>
                <input
                  type="text"
                  value={kontakWebsite}
                  onChange={(e) => setKontakWebsite(e.target.value)}
                  placeholder="Email: pacipnu.palimanan@gmail.com"
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
                />
              </div>
            </div>

            {/* Form Penandatangan Panitia Mode vs Normal Mode */}
            {isPanitiaMode ? (
              <div className="p-3.5 bg-purple-950/20 border border-purple-500/30 rounded-2xl space-y-3">
                <span className="text-[10px] font-black uppercase text-purple-300 block">
                  Penandatangan Panitia Pelaksana & Mengetahui Pimpinan
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-400 block">Ketua Panitia</label>
                    <input
                      type="text"
                      value={namaKetuaPanitia}
                      onChange={(e) => setNamaKetuaPanitia(e.target.value)}
                      placeholder="Nama Ketua Panitia"
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg p-1.5 text-xs text-[var(--text-main)]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-400 block">Sekretaris Panitia</label>
                    <input
                      type="text"
                      value={namaSekretarisPanitia}
                      onChange={(e) => setNamaSekretarisPanitia(e.target.value)}
                      placeholder="Nama Sekretaris Panitia"
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg p-1.5 text-xs text-[var(--text-main)]"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Nama Ketua ({selectedOrgChoice})</label>
                <input
                  type="text"
                  value={namaKetua}
                  onChange={(e) => setNamaKetua(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Nama Sekretaris ({selectedOrgChoice})</label>
                <input
                  type="text"
                  value={namaSekretaris}
                  onChange={(e) => setNamaSekretaris(e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Pratinjau Standar PP IPNU & IPPNU */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] overflow-hidden shadow-2xl">
            {/* Header Sheet Bar */}
            <div className="p-4 bg-[var(--bg-app)] border-b border-[var(--border-main)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-xs text-[var(--text-main)] flex items-center gap-2">
                  <FileCheck size={16} className="text-emerald-400" />
                  Pratinjau {selectedOrgChoice} {isPanitiaMode ? '(Kepanitiaan)' : ''} - A4
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-[10px] text-zinc-400">
                    21 x 29.7 cm · Standar Hasil Konbes 2024 ·
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider border",
                    selectedOrgChoice === 'IPNU' 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-sans" 
                      : selectedOrgChoice === 'IPPNU' 
                      ? "bg-teal-500/10 text-teal-300 border-teal-500/30 font-serif" 
                      : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                  )}>
                    {selectedOrgChoice === 'IPNU' && 'Font Resmi: Arial 11/12pt (Pedoman Konbes II IPNU 2024)'}
                    {selectedOrgChoice === 'IPPNU' && 'Font Resmi: Times New Roman 12pt (Pedoman Konbes IPPNU 2024)'}
                    {selectedOrgChoice === 'BERSAMA' && 'Font Terstandarisasi Gabungan IPNU & IPPNU'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isAuthorityViolated) {
                      showToast(`Hierarki tidak sah: Pimpinan ${kodeTingkat} tidak berwenang menerbitkan "${selectedTemplate?.name}"`, 'error');
                      return;
                    }
                    setIsPDFPreviewOpen(true);
                  }}
                  disabled={isAuthorityViolated}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all",
                    isAuthorityViolated
                      ? "bg-zinc-800/50 text-zinc-500 cursor-not-allowed opacity-60"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                  )}
                >
                  <Eye size={13} className={isAuthorityViolated ? "text-zinc-500" : "text-emerald-400"} /> Layar Penuh
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isAuthorityViolated}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition-all",
                    isAuthorityViolated
                      ? "bg-red-950/70 border border-red-500/50 text-red-300 cursor-not-allowed opacity-75"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  )}
                >
                  {isAuthorityViolated ? <AlertTriangle size={13} className="text-red-400" /> : <Printer size={13} />}
                  <span>{isAuthorityViolated ? 'Cetak Terkunci' : 'Cetak'}</span>
                </button>
              </div>
            </div>

            {/* Printable White Sheet Container */}
            <div 
              className={cn(
                "p-6 md:p-10 bg-white text-black overflow-x-auto min-h-[820px] relative transition-all",
                selectedOrgChoice === 'IPNU' ? "font-sans" : selectedOrgChoice === 'IPPNU' ? "font-serif" : "font-sans"
              )} 
              style={{
                fontFamily: selectedOrgChoice === 'IPNU' 
                  ? 'Arial, Helvetica, sans-serif' 
                  : selectedOrgChoice === 'IPPNU' 
                  ? "'Times New Roman', Times, serif" 
                  : 'Arial, "Times New Roman", sans-serif'
              }}
              ref={printRef}
            >
              {/* Hierarchy Violation Watermark / Alert on Sheet */}
              {isAuthorityViolated && (
                <div className="mb-5 p-4 rounded-xl bg-red-50 border-2 border-red-500 text-red-900 font-sans shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-black text-xs uppercase tracking-wide text-red-700">
                        Dokumen Tidak Sah Secara Organisasi (Pelanggaran Kewenangan)
                      </h5>
                      <p className="text-[11px] text-red-800 mt-1 leading-snug">
                        Sesuai Pedoman Administrasi PP IPNU-IPPNU (Konbes 2024), <strong>Pimpinan {kodeTingkat}</strong> tidak berwenang menerbitkan <strong>{selectedTemplate?.name}</strong>. Wewenang penerbitan surat ini berada pada: <strong>{selectedTemplate?.tingkatWewenang?.join(', ') || 'PC'}</strong>.
                      </p>
                      <p className="text-[10px] text-red-600 font-bold mt-1">
                        * Fitur cetak dan ekspor otomatis diblokir sampai Anda memilih template yang sesuai atau beralih ke tingkatan yang berwenang.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="max-w-[680px] mx-auto space-y-5">
                {/* 1. KOP SURAT RESMI */}
                {selectedOrgChoice === 'IPNU' && (
                  <div className="pb-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="w-24 h-24 shrink-0 flex items-center justify-center">
                        <img 
                          src={LOGO_IPNU} 
                          alt="Logo Resmi IPNU" 
                          className="w-full h-full object-contain filter drop-shadow-sm"
                        />
                      </div>
                      <div className="flex-1 text-right">
                        <h2 className="text-[13px] md:text-[15px] font-bold tracking-wider text-[#006633] uppercase font-sans">
                          {tingkatPimpinan}
                        </h2>
                        <h1 className="text-[18px] md:text-[22px] font-bold tracking-tight text-[#006633] uppercase font-sans leading-tight my-0.5">
                          IKATAN PELAJAR NAHDLATUL ULAMA
                        </h1>
                        <h3 className="text-[13px] md:text-[15px] font-bold tracking-wider text-[#006633] uppercase font-sans">
                          {namaWilayah}
                        </h3>
                        <p className="text-[11px] font-sans text-gray-700 mt-1 leading-tight">
                          {alamatSekretariat}
                        </p>
                        {kontakWebsite && (
                          <p className="text-[10px] font-sans text-gray-600 leading-tight mt-0.5">
                            {kontakWebsite}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="w-full mt-2.5">
                      <div className="h-[2px] bg-[#006633] w-full"></div>
                      <div className="h-[0.75px] bg-[#006633] w-full mt-[1.5px]"></div>
                    </div>
                  </div>
                )}

                {selectedOrgChoice === 'IPPNU' && (
                  <div className="pb-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="w-24 h-24 shrink-0 flex items-center justify-center">
                        <img 
                          src={LOGO_IPPNU} 
                          alt="Logo Resmi IPPNU" 
                          className="w-full h-full object-contain filter drop-shadow-sm"
                        />
                      </div>
                      <div className="flex-1 text-right font-serif">
                        <h2 className="text-[13px] md:text-[15px] font-bold tracking-wider text-[#00592e] uppercase font-serif">
                          {tingkatPimpinan}
                        </h2>
                        <h1 className="text-[18px] md:text-[22px] font-bold tracking-tight text-[#00592e] uppercase font-serif leading-tight my-0.5">
                          IKATAN PELAJAR PUTRI NAHDLATUL ULAMA
                        </h1>
                        <h3 className="text-[13px] md:text-[15px] font-bold tracking-wider text-[#00592e] uppercase font-serif">
                          {namaWilayah}
                        </h3>
                        <p className="text-[11px] font-serif text-gray-700 mt-1 leading-tight">
                          {alamatSekretariat}
                        </p>
                        {kontakWebsite && (
                          <p className="text-[10px] font-serif text-gray-600 leading-tight mt-0.5">
                            {kontakWebsite}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="w-full mt-2.5">
                      <div className="h-[2px] bg-[#00592e] w-full"></div>
                      <div className="h-[0.75px] bg-[#00592e] w-full mt-[1.5px]"></div>
                    </div>
                  </div>
                )}

                {selectedOrgChoice === 'BERSAMA' && (
                  <div className="pb-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-20 h-20 flex items-center justify-center">
                          <img 
                            src={LOGO_IPNU} 
                            alt="Logo Resmi IPNU" 
                            className="w-full h-full object-contain filter drop-shadow-sm"
                          />
                        </div>
                        <div className="w-20 h-20 flex items-center justify-center">
                          <img 
                            src={LOGO_IPPNU} 
                            alt="Logo Resmi IPPNU" 
                            className="w-full h-full object-contain filter drop-shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="flex-1 text-right">
                        <h2 className="text-[13px] md:text-[15px] font-bold tracking-wider text-[#006633] uppercase font-sans">
                          {tingkatPimpinan}
                        </h2>
                        <h1 className="text-[16px] md:text-[19px] font-bold tracking-tight text-[#006633] uppercase font-sans leading-tight my-0.5">
                          IKATAN PELAJAR NAHDLATUL ULAMA<br />
                          IKATAN PELAJAR PUTRI NAHDLATUL ULAMA
                        </h1>
                        <h3 className="text-[13px] md:text-[15px] font-bold tracking-wider text-[#006633] uppercase font-sans">
                          {namaWilayah}
                        </h3>
                        <p className="text-[11px] font-sans text-gray-700 mt-1 leading-tight">
                          {alamatSekretariat}
                        </p>
                        {kontakWebsite && (
                          <p className="text-[10px] font-sans text-gray-600 leading-tight mt-0.5">
                            {kontakWebsite}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="w-full mt-2.5">
                      <div className="h-[2px] bg-[#006633] w-full"></div>
                      <div className="h-[0.75px] bg-[#006633] w-full mt-[1.5px]"></div>
                    </div>
                  </div>
                )}

                {/* 2. BODY KONTEN SURAT RESMI */}
                <div className="pt-2">
                  {renderFormattedBody(getComputedLetterBody())}
                </div>

                {/* 3. TEMPAT DAN TANGGAL SURAT */}
                <div className="pt-6 pb-2 text-right font-sans text-xs text-gray-900">
                  <div className="inline-flex items-start text-left">
                    <span className="font-normal text-gray-900 text-[12px] whitespace-nowrap">
                      {kotaPenerbitan},&nbsp;
                    </span>
                    <div className="inline-flex flex-col">
                      <span className="font-normal text-gray-900 text-[12px] whitespace-nowrap">
                        {tanggalHijriyah}
                      </span>
                      <div className="h-[1px] bg-black w-full my-0.5"></div>
                      <span className="text-gray-900 text-[12px] whitespace-nowrap">
                        {formatMasehiDate(tanggalPenerbitan)} M
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. BLOK KANAN/TENGAH NAMA PANITIA ATAU KEPENGURUSAN */}
                <div className="pt-3 pb-2 text-center text-xs font-sans text-gray-900">
                  {isPanitiaMode ? (
                    <>
                      <h4 className="font-bold uppercase tracking-wider text-[12px]">
                        PANITIA PELAKSANA {namaAcaraPanitia || 'KEGIATAN'}
                      </h4>
                      <h3 className="font-bold uppercase tracking-tight text-[13px] leading-tight my-0.5">
                        {selectedOrgChoice === 'IPPNU' 
                          ? 'IKATAN PELAJAR PUTRI NAHDLATUL ULAMA' 
                          : selectedOrgChoice === 'BERSAMA' 
                          ? 'IKATAN PELAJAR NAHDLATUL ULAMA & IKATAN PELAJAR PUTRI NAHDLATUL ULAMA' 
                          : 'IKATAN PELAJAR NAHDLATUL ULAMA'}
                      </h3>
                      <h4 className="font-bold uppercase tracking-wider text-[12px]">
                        {tingkatPimpinan} {namaWilayah}
                      </h4>
                    </>
                  ) : (
                    <>
                      <h4 className="font-bold uppercase tracking-wider text-[12px]">
                        {tingkatPimpinan}
                      </h4>
                      <h3 className="font-bold uppercase tracking-tight text-[13px] leading-tight my-0.5">
                        {selectedOrgChoice === 'IPPNU' 
                          ? 'IKATAN PELAJAR PUTRI NAHDLATUL ULAMA' 
                          : selectedOrgChoice === 'BERSAMA' 
                          ? 'IKATAN PELAJAR NAHDLATUL ULAMA & IKATAN PELAJAR PUTRI NAHDLATUL ULAMA' 
                          : 'IKATAN PELAJAR NAHDLATUL ULAMA'}
                      </h3>
                      <h4 className="font-bold uppercase tracking-wider text-[12px]">
                        {namaWilayah}
                      </h4>
                    </>
                  )}
                </div>

                {/* 5. BLOK TANDA TANGAN PANITIA VS NORMAL */}
                {isPanitiaMode ? (
                  <div className="space-y-6">
                    <div className="pt-3 grid grid-cols-2 text-center text-xs font-sans">
                      <div>
                        <div className="h-16 flex items-center justify-center my-1 relative">
                          {sigKetuaPanitia ? (
                            <img src={sigKetuaPanitia} alt="TTD Ketua Panitia" className="max-h-16 max-w-full object-contain" />
                          ) : (
                            <div className="h-12"></div>
                          )}
                        </div>
                        <p className="font-bold text-gray-900 uppercase">
                          {namaKetuaPanitia ? namaKetuaPanitia.toUpperCase() : '[NAMA KETUA PANITIA]'}
                        </p>
                        <p className="italic text-gray-800 text-[11px] mt-0.5">Ketua Panitia</p>
                      </div>

                      <div>
                        <div className="h-16 flex items-center justify-center my-1 relative">
                          {sigSekretarisPanitia ? (
                            <img src={sigSekretarisPanitia} alt="TTD Sekretaris Panitia" className="max-h-16 max-w-full object-contain" />
                          ) : (
                            <div className="h-12"></div>
                          )}
                        </div>
                        <p className="font-bold text-gray-900 uppercase">
                          {namaSekretarisPanitia ? namaSekretarisPanitia.toUpperCase() : '[NAMA SEKRETARIS PANITIA]'}
                        </p>
                        <p className="italic text-gray-800 text-[11px] mt-0.5">Sekretaris Panitia</p>
                      </div>
                    </div>

                    {/* Mengetahui Pengurus Harian */}
                    <div className="pt-2 text-center text-xs font-sans border-t border-gray-200">
                      <p className="font-bold uppercase tracking-wider text-[11px] mb-3">
                        Mengetahui,
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-bold text-gray-900 uppercase">{namaKetua || '[NAMA KETUA IPNU]'}</p>
                          <p className="italic text-[11px] text-gray-700">Ketua IPNU {namaWilayah}</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 uppercase">{namaSekretaris || '[NAMA SEKRETARIS IPNU]'}</p>
                          <p className="italic text-[11px] text-gray-700">Sekretaris IPNU {namaWilayah}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 text-right">
                      <p className="font-bold italic text-[11px] text-[#006633] font-sans tracking-wider">
                        Belajar, Berjuang, Bertaqwa
                      </p>
                    </div>
                  </div>
                ) : selectedOrgChoice !== 'BERSAMA' ? (
                  <div>
                    <div className="pt-3 grid grid-cols-2 text-center text-xs font-sans">
                      <div>
                        <div className="h-16 flex items-center justify-center my-1 relative">
                          {sigKetua ? (
                            <img src={sigKetua} alt="TTD Ketua" className="max-h-16 max-w-full object-contain" />
                          ) : (
                            <div className="h-12"></div>
                          )}
                        </div>
                        <p className="font-bold text-gray-900 uppercase">
                          {namaKetua ? namaKetua.toUpperCase() : '[NAMA KETUA]'}
                        </p>
                        <p className="italic text-gray-800 text-[11px] mt-0.5">Ketua</p>
                        {niaKetua && <p className="text-[9.5px] text-gray-600">NIA. {niaKetua}</p>}
                      </div>

                      <div>
                        <div className="h-16 flex items-center justify-center my-1 relative">
                          {sigSekretaris ? (
                            <img src={sigSekretaris} alt="TTD Sekretaris" className="max-h-16 max-w-full object-contain" />
                          ) : (
                            <div className="h-12"></div>
                          )}
                        </div>
                        <p className="font-bold text-gray-900 uppercase">
                          {namaSekretaris ? namaSekretaris.toUpperCase() : '[NAMA SEKRETARIS]'}
                        </p>
                        <p className="italic text-gray-800 text-[11px] mt-0.5">Sekretaris</p>
                        {niaSekretaris && <p className="text-[9.5px] text-gray-600">NIA. {niaSekretaris}</p>}
                      </div>
                    </div>

                    <div className="pt-4 text-right">
                      <p className="font-bold italic text-[11px] text-[#006633] font-sans tracking-wider">
                        Belajar, Berjuang, Bertaqwa
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="pt-3 space-y-6 text-center text-xs font-sans">
                      {/* IPNU Signatures */}
                      <div className="border border-emerald-900/10 p-3 rounded-2xl bg-emerald-50/10">
                        <span className="text-[11px] font-black text-emerald-800 uppercase block mb-2 tracking-widest border-b border-emerald-900/20 pb-1 w-fit mx-auto">
                          Pimpinan IPNU
                        </span>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="font-bold text-[10px] uppercase">{namaKetua || '[NAMA KETUA IPNU]'}</p>
                            <p className="italic text-[9.5px] text-gray-700">Ketua</p>
                          </div>
                          <div>
                            <p className="font-bold text-[10px] uppercase">{namaSekretaris || '[NAMA SEKRETARIS IPNU]'}</p>
                            <p className="italic text-[9.5px] text-gray-700">Sekretaris</p>
                          </div>
                        </div>
                      </div>

                      {/* IPPNU Signatures */}
                      <div className="border border-teal-900/10 p-3 rounded-2xl bg-teal-50/10">
                        <span className="text-[11px] font-black text-teal-800 uppercase block mb-2 tracking-widest border-b border-teal-900/20 pb-1 w-fit mx-auto">
                          Pimpinan IPPNU
                        </span>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="font-bold text-[10px] uppercase">{namaKetuaIppnu || '[NAMA KETUA IPPNU]'}</p>
                            <p className="italic text-[9.5px] text-gray-700">Ketua</p>
                          </div>
                          <div>
                            <p className="font-bold text-[10px] uppercase">{namaSekretarisIppnu || '[NAMA SEKRETARIS IPPNU]'}</p>
                            <p className="italic text-[9.5px] text-gray-700">Sekretaris</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 text-right">
                      <p className="font-bold italic text-[11px] text-[#006633] font-sans tracking-wider">
                        Belajar, Berjuang, Bertaqwa
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Pad Modal */}
      <SignaturePadModal
        isOpen={signatureModalTarget !== null}
        onClose={() => setSignatureModalTarget(null)}
        title={
          signatureModalTarget === 'ketua'
            ? `Tanda Tangan Digital Ketua (${selectedOrgChoice})`
            : signatureModalTarget === 'sekretaris'
            ? `Tanda Tangan Digital Sekretaris (${selectedOrgChoice})`
            : signatureModalTarget === 'ketuaIppnu'
            ? 'Tanda Tangan Digital Ketua IPPNU'
            : signatureModalTarget === 'sekretarisIppnu'
            ? 'Tanda Tangan Digital Sekretaris IPPNU'
            : signatureModalTarget === 'ketuaPanitia'
            ? 'Tanda Tangan Digital Ketua Panitia'
            : 'Tanda Tangan Digital Sekretaris Panitia'
        }
        signatoryName={
          signatureModalTarget === 'ketua'
            ? namaKetua
            : signatureModalTarget === 'sekretaris'
            ? namaSekretaris
            : signatureModalTarget === 'ketuaIppnu'
            ? namaKetuaIppnu
            : signatureModalTarget === 'sekretarisIppnu'
            ? namaSekretarisIppnu
            : signatureModalTarget === 'ketuaPanitia'
            ? namaKetuaPanitia
            : namaSekretarisPanitia
        }
        signatoryRole={
          signatureModalTarget?.includes('Panitia') ? 'Panitia Pelaksana' : 'Pimpinan Harian'
        }
        onSave={(dataUrl) => {
          if (signatureModalTarget === 'ketua') setSigKetua(dataUrl);
          else if (signatureModalTarget === 'sekretaris') setSigSekretaris(dataUrl);
          else if (signatureModalTarget === 'ketuaIppnu') setSigKetuaIppnu(dataUrl);
          else if (signatureModalTarget === 'sekretarisIppnu') setSigSekretarisIppnu(dataUrl);
          else if (signatureModalTarget === 'ketuaPanitia') setSigKetuaPanitia(dataUrl);
          else if (signatureModalTarget === 'sekretarisPanitia') setSigSekretarisPanitia(dataUrl);
          showToast('Tanda tangan digital berhasil dibubuhkan!', 'success');
        }}
      />

      {/* Fullscreen PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={isPDFPreviewOpen}
        onClose={() => setIsPDFPreviewOpen(false)}
        onPrint={handlePrint}
        organisasi={selectedOrgChoice}
        letterContentRef={printRef}
        letterTitle={selectedTemplate?.name || 'Surat Resmi'}
        letterNumber={currentComputedNumber}
        isAuthorityViolated={isAuthorityViolated}
      />

      {/* Interactive Pedoman Konbes 2024 Modal */}
      <AnimatePresence>
        {pedomanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-app)]">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-2xl",
                    pedomanModal === 'IPNU' ? "bg-emerald-500/20 text-emerald-400" : "bg-teal-500/20 text-teal-400"
                  )}>
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[var(--text-main)]">
                      {pedomanModal === 'IPNU' 
                        ? 'Pedoman Administrasi IPNU · Konbes II 2024' 
                        : 'Pedoman Administrasi IPPNU · Konbes 2024'}
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Peraturan Pimpinan Pusat tentang Tata Naskah & Penomoran Resmi
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPedomanModal(null)}
                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed custom-scrollbar">
                {pedomanModal === 'IPNU' ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <h4 className="font-bold text-emerald-300 text-xs uppercase mb-1">
                        Rumus Baku Penomoran Surat PC IPNU (Konbes II 2024)
                      </h4>
                      <code className="text-emerald-400 font-mono text-xs block bg-black/40 p-2 rounded-xl">
                        [Nomor Urut]/PC/[Klasifikasi]/[Indeks]/10.20/[Bulan Romawi]/[Tahun Masehi]
                      </code>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-bold text-[var(--text-main)]">1. Klasifikasi Surat:</h5>
                      <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
                        <li><strong>A</strong>: Surat Internal (ditujukan ke struktur internal NU/IPNU: PW, PC, PAC, PK, PR).</li>
                        <li><strong>B</strong>: Surat Eksternal (ditujukan ke pihak luar: Instansi Pemerintah, Sekolah, Ormas lain).</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-bold text-[var(--text-main)]">2. Kode Indeks Surat:</h5>
                      <ul className="grid grid-cols-2 gap-2 text-zinc-400">
                        <li className="bg-[var(--bg-app)] p-2 rounded-xl border border-[var(--border-main)]"><strong>01</strong>: Surat Keputusan (SK)</li>
                        <li className="bg-[var(--bg-app)] p-2 rounded-xl border border-[var(--border-main)]"><strong>02</strong>: Surat Mandat / Tugas</li>
                        <li className="bg-[var(--bg-app)] p-2 rounded-xl border border-[var(--border-main)]"><strong>03</strong>: Surat Undangan</li>
                        <li className="bg-[var(--bg-app)] p-2 rounded-xl border border-[var(--border-main)]"><strong>04</strong>: Permohonan / Kerjasama</li>
                        <li className="bg-[var(--bg-app)] p-2 rounded-xl border border-[var(--border-main)]"><strong>05</strong>: Instruksi / Edaran</li>
                        <li className="bg-[var(--bg-app)] p-2 rounded-xl border border-[var(--border-main)]"><strong>06</strong>: Rekomendasi Pengesahan</li>
                        <li className="bg-[var(--bg-app)] p-2 rounded-xl border border-[var(--border-main)]"><strong>07</strong>: Surat Keterangan / Berita Acara</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20">
                      <h4 className="font-bold text-teal-300 text-xs uppercase mb-1">
                        Rumus Baku Penomoran Surat PC IPPNU (Konbes 2024)
                      </h4>
                      <code className="text-teal-400 font-mono text-xs block bg-black/40 p-2 rounded-xl">
                        [Nomor Urut]/PC/Adm/[Klasifikasi]/10.20/[Bulan Romawi]/[Tahun Masehi]
                      </code>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-bold text-[var(--text-main)]">1. Karakter Khusus IPPNU:</h5>
                      <p className="text-zinc-400">
                        Berdasarkan hasil Konbes IPPNU 2024, seluruh surat keluar wajib menyertakan kode singkatan administrasi <span className="text-teal-400 font-mono font-bold">Adm</span> setelah singkatan tingkatan kepengurusan (<span className="text-teal-400 font-mono">/PC/Adm/</span>).
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-bold text-[var(--text-main)]">2. Klasifikasi Surat IPPNU:</h5>
                      <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
                        <li><strong>A</strong>: Surat Internal (kepada seluruh jajaran pengurus IPPNU dan Banom NU).</li>
                        <li><strong>B</strong>: Surat Eksternal (kepada dinas pemerintahan, kepala sekolah, sponsor, yayasan).</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[var(--bg-app)] border-t border-[var(--border-main)] flex justify-end">
                <button
                  onClick={() => setPedomanModal(null)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow"
                >
                  Paham & Terapkan ke Surat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplateSurat;
