import { BARZANJI_PAGES } from './barzanjiData';
import { DIBAI_PAGES } from './dibaiData';
import { TAHLIL_PAGES } from './tahlilData';
import { SHOLAWAT_PAGES } from './sholawatData';
import { SHOLAT_PAGES } from './sholatData';
import { DOA_HARIAN_PAGES } from './doaHarianData';

export const AMALIAH_DATA = [
  {
    id: 'sholat',
    title: 'Tuntunan Sholat & Wirid Lengkap',
    description: 'Panduan sholat fardhu, wudhu, doa iftitah, qunut subuh, sujud, tahiyyat, dan wirid dzikir ba\'da sholat.',
    source: 'Rujukan: Buku Risalah Tuntunan Shalat Lengkap — Kementerian Agama RI',
    pages: SHOLAT_PAGES
  },
  {
    id: 'doa-harian',
    title: 'Kumpulan Do\'a Harian Lengkap',
    description: 'Kumpulan doa harian pelajar NU (Arab, Latin, Terjemahan) dari bangun tidur hingga doa selamat dunia akhirat.',
    source: 'Rujukan: Buku Kumpulan Do\'a Sehari-Hari — Dirjen Bimas Islam Kemenag RI',
    pages: DOA_HARIAN_PAGES
  },
  {
    id: 'tahlil',
    title: 'Tahlil Lengkap & Doa Arwah',
    description: 'Susunan tahlil lengkap Nahdliyin, hadlarah para masyayikh & muassis NU, muassis IPNU-IPPNU, ziarah kubur, dan doa arwah.',
    source: 'Rujukan: Pedoman Tahlil & Doa Khazanah Aswaja — Kemenag RI & PBNU',
    pages: TAHLIL_PAGES
  },
  {
    id: 'diba',
    title: "Kitab Maulid Ad-Diba'i",
    description: "Kitab maulid lengkap karangan Imam Abdurrahman Ad-Diba'i beserta rawi, Mahalul Qiyam, dan Doa.",
    source: 'Rujukan: Kitab Maulid Ad-Diba\'i Rasm Utsmani — Ditashih Kemenag RI',
    pages: DIBAI_PAGES
  },
  {
    id: 'barzanji',
    title: 'Kitab Maulid Al-Barzanji',
    description: "Kitab maulid lengkap karangan Sayyid Ja'far Al-Barzanji beserta pembuka, rawi-rawi, dan doa penutup.",
    source: 'Rujukan: Kitab Maulid Al-Barzanji Rasm Utsmani — Ditashih Kemenag RI',
    pages: BARZANJI_PAGES
  },
  {
    id: 'sholawat',
    title: 'Kumpulan Sholawat Pilihan',
    description: 'Kumpulan sholawat nabi masyhur: Nariyah, Thibbil Qulub, Munjiyat, Asyghil, dan Al-Fatih.',
    source: 'Rujukan: Majmu\'ah Shalawat Nabawiyyah — Kemenag RI & Nahdlatul Ulama',
    pages: SHOLAWAT_PAGES
  }
];
