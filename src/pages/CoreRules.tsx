import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Archive, 
  Search, 
  Award, 
  AlertCircle, 
  Users, 
  History, 
  Calendar, 
  Database, 
  FileText, 
  ClipboardCheck, 
  Lock, 
  Smartphone, 
  Scale, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  AlertTriangle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { CORE_RULES_SECTIONS as sections } from '../constants/coreRules';

export default function CoreRules() {
  const [activeSection, setActiveSection] = useState('pengarsipan');
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const handleScroll = () => {
      const scrollPosition = mainContent.scrollTop + 200;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= scrollPosition && element.offsetTop + element.offsetHeight > scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }

      const winScroll = mainContent.scrollTop;
      const height = mainContent.scrollHeight - mainContent.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setScrollProgress(scrolled);
    };

    mainContent.addEventListener('scroll', handleScroll);
    return () => mainContent.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] relative">
      <div className="fixed top-[73px] left-0 right-0 h-1 z-[60] bg-[var(--border-main)] lg:left-72">
        <motion.div 
          className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="w-full space-y-16 py-4 lg:py-8">
        <header className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-blue-500/20">
            <ShieldCheck size={12} />
            Official SOP 2026
          </div>
          <h1 className="text-5xl lg:text-7xl font-black text-[var(--text-main)] tracking-tight leading-[0.9]">
            Panduan <br />
            Operasional <br />
            <span className="text-blue-600 dark:text-blue-500">& SOP CORE</span>
          </h1>
          <p className="text-[var(--text-muted)] font-medium text-lg lg:text-xl max-w-2xl leading-relaxed">
            Standar operasional untuk visitasi, pengarsipan, audit, dan manajemen kinerja Pimpinan Komisariat di lingkungan Departemen PPK.
          </p>
          
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-sm">
              <Users size={16} className="text-blue-500" />
              <span className="text-xs font-bold text-[var(--text-main)]">Untuk PC & PK</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-sm">
              <Calendar size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-[var(--text-main)]">Update Terakhir: Jan 2026</span>
            </div>
          </div>
        </header>

        {/* 1. Prosedur Pengarsipan Data */}
        <section id="pengarsipan" className="scroll-mt-24 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-200 dark:shadow-blue-900/20">
              <Archive size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">1. Prosedur Pengarsipan Data</h2>
              <p className="text-[var(--text-muted)] text-sm font-medium">Digital & Physical Archiving Standards</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[32px] shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all space-y-6 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Database size={20} />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-main)]">Digital Archiving</h3>
              </div>
              <div className="space-y-4 text-sm text-[var(--text-muted)] leading-relaxed">
                <p><strong>Mekanisme Unggah:</strong> Seluruh dokumen wajib dikonversi ke format PDF dengan resolusi minimal 300 DPI.</p>
                <p><strong>Standar Penamaan:</strong> Format <code>[KODE_PK]_[TAHUN]_[NAMA_DOKUMEN].pdf</code>.</p>
                <p><strong>Backup:</strong> Sinkronisasi harian ke server PC dan backup mingguan ke cloud storage.</p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[32px] shadow-sm hover:shadow-xl hover:border-indigo-500/30 transition-all space-y-6 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <FileText size={20} />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-main)]">Physical Archiving</h3>
              </div>
              <div className="space-y-4 text-sm text-[var(--text-muted)] leading-relaxed">
                <p><strong>Penyimpanan:</strong> Box File standar berlabel warna.</p>
                <p><strong>Lokasi:</strong> Sekretariat PK (Asli) & Ruang Arsip PC (Salinan Legalisir).</p>
                <p><strong>Logbook:</strong> Wajib mencatatkan Nama, Tanggal, dan Tujuan pada Buku Log.</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 2. Mekanisme Audit */}
        <section id="audit" className="scroll-mt-24 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-600 text-white rounded-3xl shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20">
              <Search size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">2. Mekanisme Audit PC</h2>
              <p className="text-[var(--text-muted)] text-sm font-medium">Three-Layer Verification System</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                title: 'Audit Digital Rutin', 
                icon: Smartphone, 
                desc: 'Setiap tanggal 5, PC melakukan data crawling. Flag merah otomatis jika ditemukan ketidakkonsistenan.',
                color: 'text-emerald-600',
                bg: 'bg-emerald-50 dark:bg-emerald-900/20',
              },
              { 
                title: 'Verifikasi Faktual', 
                icon: Users, 
                desc: 'Kunjungan lapangan untuk mencocokkan data aplikasi dengan bukti fisik dan wawancara acak.',
                color: 'text-blue-600',
                bg: 'bg-blue-50 dark:bg-blue-900/20',
              },
              { 
                title: 'Audit Investigatif', 
                icon: Scale, 
                desc: 'Dilakukan jika ditemukan indikasi pelanggaran berat. Mencakup pemeriksaan aset dan aliran dana.',
                color: 'text-indigo-600',
                bg: 'bg-indigo-50 dark:bg-indigo-900/20',
              }
            ].map((item, i) => (
              <motion.div 
                key={i} 
                whileHover={{ scale: 1.02 }}
                className="bg-[var(--bg-card)] border border-[var(--border-main)] p-8 rounded-[32px] shadow-sm hover:shadow-xl transition-all group"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-12", item.bg, item.color)}>
                  <item.icon size={24} />
                </div>
                <h4 className="font-bold text-[var(--text-main)] mb-3">{item.title}</h4>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 3. Reward & Punishment */}
        <section id="reward" className="scroll-mt-24 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-500 text-white rounded-3xl shadow-xl shadow-amber-200 dark:shadow-amber-900/20">
              <Award size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">3. Reward & Punishment</h2>
              <p className="text-[var(--text-muted)] text-sm font-medium">Performance-Based Incentives & Sanctions</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div 
              whileHover={{ scale: 1.01 }}
              className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-8 rounded-[40px] space-y-6"
            >
              <h3 className="text-xl font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-tight flex items-center gap-2">
                <Award size={20} /> Penghargaan (Reward)
              </h3>
              <ul className="space-y-3">
                {[
                  "Insentif dana pembinaan tambahan untuk operasional PK.",
                  "Prioritas pengiriman delegasi forum Nasional/Internasional.",
                  "Sertifikat Akreditasi Unggul (Berlaku 1 Periode)."
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 items-start text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.01 }}
              className="bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-8 rounded-[40px] space-y-6"
            >
              <h3 className="text-xl font-black text-rose-800 dark:text-rose-400 uppercase tracking-tight flex items-center gap-2">
                <AlertTriangle size={20} /> Sanksi (Punishment)
              </h3>
              <ul className="space-y-3">
                {[
                  "Teguran Tertulis (SP1-SP3) bagi keterlambatan > 14 hari.",
                  "Pembekuan sementara dana hibah operasional Cabang.",
                  "Pencabutan hak suara dalam forum pengambilan keputusan."
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 items-start text-sm text-rose-800 dark:text-rose-300 font-medium">
                    <XCircle size={18} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-16 border-t border-[var(--border-main)] text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="text-blue-600" size={20} />
            <span className="text-sm font-black text-[var(--text-main)] tracking-tighter">CARUBAN CORE PLATFORM</span>
          </div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.3em]">
            Diterbitkan oleh Departemen Pengembangan Organisasi - Pimpinan Cabang • 2026
          </p>
        </footer>
      </div>
    </div>
  );
}
