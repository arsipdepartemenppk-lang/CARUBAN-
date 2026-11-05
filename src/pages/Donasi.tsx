import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, ExternalLink } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function Donasi() {
  return (
    <div className="p-6 pb-24 min-h-screen bg-[var(--bg-app)]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-4xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden p-12 text-center text-white">
          <div className="absolute inset-0 bg-[var(--accent-primary)]" />
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/batik-megamendung.png')]" />
          <div className="relative z-10">
            <h2 className="text-4xl font-black mb-4 tracking-tighter">Satu Koin untuk Sejuta Khidmat</h2>
            <p className="text-lg opacity-90 max-w-xl mx-auto">Caruban Core adalah rumah digital kita. Mari ikut merawat dan membesarkannya agar manfaatnya terus mengalir ke seluruh pelosok Cirebon.</p>
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-lg italic text-center">
            "Rekan-Rekanita, Caruban Core bukan sekadar aplikasi, ini adalah ikhtiar digital kita untuk merawat khidmat di PC IPNU IPPNU Kabupaten Cirebon. Agar 'listrik' dan 'perawatan' rumah digital ini tetap terjaga 24 jam, mari kita patungan seikhlasnya melalui Koin Khidmat. Setiap koin yang Anda berikan adalah napas bagi perjuangan kita di ruang digital. Berapapun khidmatmu, sangat berarti untuk memastikan koordinasi kita tetap sat-set dan manfaatnya terus mengalir ke seluruh pelosok Cirebon."
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { label: 'Penyimpanan File', current: 75, max: 100 },
            { label: 'Database', current: 40, max: 100 },
            { label: 'Maintenance', current: 90, max: 100 },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-[var(--border-main)]">
              <p className="text-sm font-bold text-zinc-500 mb-2">{item.label}</p>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5">
                <div className="bg-[var(--accent-primary)] h-2.5 rounded-full" style={{ width: `${item.current}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { nominal: 'Rp5.000', title: 'Kader Peduli', desc: 'Setara harga es teh, tapi manfaatnya abadi.' },
            { nominal: 'Rp20.000', title: 'Pejuang Digital', desc: 'Membantu mempercepat akses data organisasi.' },
            { nominal: 'Rp50.000+', title: 'Benteng Caruban', desc: 'Kontribusi besar untuk stabilitas aplikasi ke depan.' },
          ].map((item, i) => (
            <button key={i} className="bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-[var(--border-main)] hover:border-[var(--accent-primary)] transition-all text-left group">
              <p className="text-2xl font-black text-[var(--accent-primary)] mb-1">{item.nominal}</p>
              <p className="font-bold text-sm mb-2">{item.title}</p>
              <p className="text-xs text-zinc-500">{item.desc}</p>
            </button>
          ))}
        </div>

        <div className="text-center space-y-6">
          <div className="bg-white dark:bg-zinc-800 p-8 rounded-3xl border border-[var(--border-main)] max-w-sm mx-auto shadow-xl">
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto mb-4 shadow-sm border border-zinc-200">
              <QRCode 
                value="https://link.dana.id/minta?full_url=https://qr.dana.id/v1/281012012022091881532845" 
                size={180} 
                level="M" 
              />
            </div>
            <p className="font-black text-lg text-[var(--text-main)]">Scan QRIS Koin Khidmat</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Pembayaran aman & instan via DANA, GoPay, OVO, ShopeePay & Mobile Banking</p>
            <a 
              href="https://link.dana.id/minta?full_url=https://qr.dana.id/v1/281012012022091881532845" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-bold border border-emerald-500/20 transition-all"
            >
              Buka di Aplikasi DANA <ExternalLink size={12} />
            </a>
          </div>
          
          <div className="bg-white dark:bg-zinc-800 p-8 rounded-3xl border border-[var(--border-main)] max-w-sm mx-auto text-left">
            <h4 className="font-black mb-4">Transfer Bank</h4>
            <div className="space-y-2 text-sm">
              <p><span className="text-zinc-500">Bank:</span> BSI (Bank Syariah Indonesia)</p>
              <p><span className="text-zinc-500">No. Rek:</span> 1234567890</p>
              <p><span className="text-zinc-500">Atas Nama:</span> IPNU IPPNU Kab. Cirebon</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800">
          <h3 className="text-xl font-black mb-6 flex items-center gap-3">
            <Trophy className="text-amber-500" /> Barisan Donatur Utama
          </h3>
          <div className="space-y-4">
            <p className="text-zinc-500 text-sm">Belum ada donatur yang tercatat bulan ini.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
