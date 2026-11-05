export interface DigitalBook {
  id: string;
  title: string;
  category: 'Pedoman IPNU' | 'Pedoman IPPNU' | 'Modul Kaderisasi' | 'Khazanah Aswaja';
  author: string;
  description: string;
  chapters: { title: string; content: string }[];
  samplePrompt: string;
}

export const DIGITAL_BOOKS: DigitalBook[] = [
  {
    id: 'pdprt-ipnu',
    title: 'PD/PRT IPNU Hasil Kongres XX',
    category: 'Pedoman IPNU',
    author: 'Pimpinan Pusat IPNU',
    description: 'Peraturan Dasar dan Peraturan Rumah Tangga Ikatan Pelajar Nahdlatul Ulama sebagai pedoman konstitusi organisasi tertinggi hasil Kongres XX.',
    samplePrompt: 'Jelaskan tujuan dan fungsi IPNU menurut Bab III PD/PRT IPNU hasil Kongres XX.',
    chapters: [
      {
        title: 'Bab I: Nama, Waktu, & Kedudukan',
        content: `### BAB I: NAMA, WAKTU, DAN KEDUDUKAN

**Pasal 1**
1. Organisasi ini bernama Ikatan Pelajar Nahdlatul Ulama disingkat IPNU.
2. IPNU didirikan di Semarang pada tanggal 20 Jumadil Akhir 1373 H bertepatan dengan tanggal 24 Februari 1954 M untuk jangka waktu yang tidak terbatas.
3. Pimpinan Pusat IPNU berkedudukan di Ibukota Negara Republik Indonesia.
4. Pimpinan Cabang IPNU Kabupaten Cirebon berkedudukan di wilayah hukum Kabupaten Cirebon, Jawa Barat.`
      },
      {
        title: 'Bab II: Asas, Akidah, & Sifat',
        content: `### BAB II: ASAS, AKIDAH, DAN SIFAT

**Pasal 2: Asas**
IPNU berasaskan Pancasila dan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945.

**Pasal 3: Akidah**
IPNU berakidah Islam yang menganut faham Ahlussunnah wal Jama'ah:
- Dalam bidang Akidah menganut madzhab Imam Abu al-Hasan al-Asy'ari dan Imam Abu Mansur al-Maturidi.
- Dalam bidang Fikih menganut salah satu madzhab empat (Hanafi, Maliki, Syafi'i, dan Hanbali).
- Dalam bidang Tasawuf menganut madzhab Imam al-Junaid al-Baghdadi dan Imam al-Ghazali.

**Pasal 4: Sifat**
IPNU adalah organisasi kader, keterpelajaran, kemasyarakatan, keagamaan, dan kepemudaan yang berstatus sebagai badan otonom Nahdlatul Ulama.`
      },
      {
        title: 'Bab III: Tujuan, Usaha, & Tri Panji',
        content: `### BAB III: TUJUAN DAN USAHA

**Pasal 5: Tujuan**
Terbentuknya pelajar bangsa yang bertaqwa kepada Allah SWT, berilmu, berakhlak mulia, berwawasan kebangsaan, dan bertanggung jawab atas tegaknya syariat Islam Ahlussunnah wal Jama'ah dalam wadah Negara Kesatuan Republik Indonesia.

**Pasal 6: Tri Panji IPNU**
Semboyan perjuangan IPNU adalah Tri Panji:
1. **BELAJAR**: Menuntut ilmu pengetahuan agama dan umum secara terus-menerus.
2. **BERJUANG**: Mengamalkan dan mendakwahkan nilai-nilai Islam rahmatan lil 'alamin serta membela kepentingan bangsa.
3. **BERTAQWA**: Menjalankan segala perintah Allah SWT dan menjauhi segala larangan-Nya dengan keikhlasan hati.`
      },
      {
        title: 'Bab IV: Tingkatan Kepengurusan',
        content: `### BAB IV: STRUKTUR TINGKATAN KEPENGURUSAN

1. **Pimpinan Pusat (PP)** di tingkat Nasional/Ibukota Negara.
2. **Pimpinan Wilayah (PW)** di tingkat Provinsi.
3. **Pimpinan Cabang (PC)** di tingkat Kabupaten / Kota (contoh: PC IPNU Kabupaten Cirebon).
4. **Pimpinan Anak Cabang (PAC)** di tingkat Kecamatan.
5. **Pimpinan Ranting (PR)** di tingkat Desa / Kelurahan.
6. **Pimpinan Komisariat (PK)** di tingkat Sekolah, Madrasah, Pondok Pesantren, atau Perguruan Tinggi.`
      }
    ]
  },
  {
    id: 'pdprt-ippnu',
    title: 'PD/PRT IPPNU Hasil Kongres XIX',
    category: 'Pedoman IPPNU',
    author: 'Pimpinan Pusat IPPNU',
    description: 'Peraturan Dasar dan Peraturan Rumah Tangga Ikatan Pelajar Putri Nahdlatul Ulama yang memuat landasan perjuangan rekanita se-Indonesia.',
    samplePrompt: 'Apa saja hak dan kewajiban anggota IPPNU menurut PD/PRT IPPNU?',
    chapters: [
      {
        title: 'Bab I: Ketentuan Pokok & Sejarah',
        content: `### BAB I: KETENTUAN POKOK & KELAHIRAN IPPNU

**Pasal 1**
1. Organisasi ini bernama Ikatan Pelajar Putri Nahdlatul Ulama, disingkat IPPNU.
2. IPPNU didirikan di Surakarta pada tanggal 8 Rajab 1374 H bertepatan dengan tanggal 2 Maret 1955 M.
3. Tokoh pendiri IPPNU antara lain Nyai Hj. Umroh Machfudzoh dan kawan-kawan atas restu para kiai sepuh Nahdlatul Ulama.
4. IPPNU berkedudukan di Ibukota Negara Kesatuan Republik Indonesia.`
      },
      {
        title: 'Bab II: Keanggotaan & Kaderisasi Putri',
        content: `### BAB II: KEANGGOTAAN & PENGEMBANGAN POTENSI PUTRI

**Pasal 4: Syarat Anggota**
1. Pelajar putri, santri putri, dan mahasiswi muslimah yang berakidah Islam Ahlussunnah wal Jama'ah.
2. Berusia antara 12 hingga 27 tahun.
3. Menyatakan kesediaan secara tertulis dan telah mengikuti Masa Kesetiaan Anggota (MAKESTA).

**Pasal 5: Hak dan Kewajiban Anggota**
- Memperoleh pembinaan, pendidikan karakter, dan advokasi kepelajaran.
- Berhak memilih dan dipilih dalam permusyawaratan sesuai ketentuan PRT.
- Wajib menjunjung tinggi nama baik organisasi dan Nahdlatul Ulama.
- Wajib aktif dalam kegiatan komisariat, ranting, maupun anak cabang.`
      },
      {
        title: 'Bab III: Lembaga Korps Pelajar Putri (KPP)',
        content: `### BAB III: LEMBAGA KORPS PELAJAR PUTRI (KPP)

1. KPP adalah korps kepanduan, kepalangmerahan, dan relawan kemanusiaan di bawah naungan IPPNU (mitra dari CBP pada IPNU).
2. Bertugas mengawal kegiatan lapangan, kedisiplinan kader, tanggap bencana, dan kepedulian lingkungan hidup di Kabupaten Cirebon.`
      }
    ]
  },
  {
    id: 'modul-makesta',
    title: 'Pedoman & Modul Materi MAKESTA',
    category: 'Modul Kaderisasi',
    author: 'Kaderisasi PP IPNU & IPPNU',
    description: 'Silabus kurikulum Masa Kesetiaan Anggota: Ke-NU-an, Ke-Aswaja-an, Ke-IPNU-an, Ke-IPPNU-an, dan Kepemimpinan Dasar.',
    samplePrompt: 'Sebutkan 4 prinsip utama sikap kemasyarakatan Aswaja NU yang diajarkan di Makesta.',
    chapters: [
      {
        title: 'Materi 1: Ke-Aswaja-an (Ahlussunnah wal Jamaah)',
        content: `### MATERI 1: NILAI DASAR AHLUSSUANNAH WAL JAMA'AH (ASWAJA)

Aswaja An-Nahdliyah mendasarkan sikap kemasyarakatannya pada 4 pilar utama:
1. **Tawassuth (Moderat / Sikap Tengah)**: Menghindari sikap ekstrem kanan (radikal) maupun ekstrem kiri (liberal).
2. **Tawazun (Seimbang)**: Menjaga keseimbangan antara dalil naqli (Al-Qur'an & Sunnah) dan aqli (akal budi), serta antara ibadah vertikal dan tanggung jawab sosial.
3. **Tasamuh (Toleran)**: Menghormati perbedaan pendapat, tradisi lokal yang tidak bertentangan dengan syariat, serta hidup berdampingan secara damai.
4. **I'tidal (Tegak Lurus & Adil)**: Menempatkan sesuatu pada tempatnya dan konsisten memperjuangkan kebenaran serta keadilan sosial.`
      },
      {
        title: 'Materi 2: Sejarah & Khazanah Ke-NU-an',
        content: `### MATERI 2: SEJARAH & KHAZANAH NAHDLATUL ULAMA

- Didirikan pada 16 Rajab 1344 H / 31 Januari 1926 M di Surabaya oleh KH. Hasyim Asy'ari, KH. Wahab Chasbullah, dan KH. Bisri Syansuri.
- Tiga pilar pendirian: Nahdlatut Tujjar (gerakan ekonomi), Taswirul Afkar (gerakan keilmuan & pemikiran), dan Nahdlatul Wathan (gerakan cinta tanah air).
- Lambang NU diciptakan oleh KH. Ridwan Abdullah: Bola dunia melambangkan bumi tempat manusia mengabdi, tali tambang melambangkan ukhuwah yang kokoh, 9 bintang melambangkan Rasulullah SAW, 4 sahabat khulafaur rasyidin, dan 4 madzhab fikih.`
      },
      {
        title: 'Materi 3: Ke-IPNU-an & Ke-IPPNU-an',
        content: `### MATERI 3: KE-IPNU-AN & KE-IPPNU-AN

- IPNU berdiri 24 Februari 1954 di Semarang, dipimpin pertama kali oleh KH. Tolchah Mansyur.
- IPPNU berdiri 2 Maret 1955 di Surakarta, dipimpin pertama kali oleh Nyai Hj. Umroh Machfudzoh.
- Peran Pelajar NU: Sebagai kawah candradimuka kaderisasi pertama NU untuk membina generasi muda di sekolah, madrasah, dan pesantren agar memiliki benteng akidah Aswaja yang tangguh.`
      },
      {
        title: 'Materi 4: Kepemimpinan & Manajemen Diri',
        content: `### MATERI 4: KEPEMIMPINAN DASAR & MANAJEMEN DIRI

- Prinsip kepemimpinan Rasulullah SAW: Shiddiq (jujur), Amanah (dapat dipercaya), Tabligh (komunikatif), dan Fathanah (cerdas & solutif).
- Manajemen waktu pelajar: Menyeimbangkan tugas belajar sekolah, berorganisasi di IPNU/IPPNU, dan berbakti kepada orang tua serta masyarakat.`
      }
    ]
  },
  {
    id: 'modul-lakmud',
    title: 'Pedoman & Modul Materi LAKMUD',
    category: 'Modul Kaderisasi',
    author: 'Kaderisasi PP IPNU & IPPNU',
    description: 'Latihan Kader Muda untuk membentuk kader militan, berkarakter ideologis, dan cakap dalam manajemen organisasi tingkat komisariat & anak cabang.',
    samplePrompt: 'Bagaimana langkah-langkah melakukan Analisis Sosial (Ansos) dalam konteks pelajar dan sekolah?',
    chapters: [
      {
        title: 'Materi 1: Analisis Sosial (Ansos) Pelajar',
        content: `### MATERI 1: ANALISIS SOSIAL (ANSOS) PELAJAR

Analisis sosial adalah metode membaca realitas sosial, menemukan akar masalah, dan merumuskan solusi berbasis data:
1. **Identifikasi Masalah**: Mengamati fenomena pelajar (misal: perundungan, degradasi akhlak, kecanduan gawai, putus sekolah).
2. **Pemetaan Aktor & Struktur**: Mengetahui siapa saja pihak yang terlibat (siswa, guru, orang tua, lingkungan, regulasi).
3. **Penelusuran Akar Masalah**: Mengapa masalah ini timbul dan terus berulang.
4. **Penyusunan Rencana Aksi**: Merumuskan program kerja nyata IPNU-IPPNU untuk menjawab masalah tersebut.`
      },
      {
        title: 'Materi 2: Manajemen Organisasi Modern',
        content: `### MATERI 2: MANAJEMEN ORGANISASI & PERSIDANGAN

- Siklus Manajemen: POAC (Planning, Organizing, Actuating, Controlling).
- Teknik Persidangan Resmi:
  * Palu Sidang: 1x ketukan (skors singkat/mengesahkan per pasal), 2x ketukan (skors panjang/pencabutan skors), 3x ketukan (membuka/menutup sidang pleno resmi).
  * Macam Interupsi: Point of Order (ketertiban), Point of Information (informasi), Point of Clarification (klarifikasi), Point of Personal Privilege (kehormatan pribadi).`
      }
    ]
  },
  {
    id: 'mars-ipnu-ippnu',
    title: 'Syair Mars & Hymne IPNU - IPPNU',
    category: 'Pedoman IPNU',
    author: 'Lembaga Kebudayaan Pelajar',
    description: 'Kumpulan lirik resmi, notasi, dan makna filosofis Mars IPNU gubahan H. Mahbub Djunaidi dan Mars IPPNU.',
    samplePrompt: 'Tuliskan lirik lengkap Mars IPNU dan Mars IPPNU beserta maknanya.',
    chapters: [
      {
        title: 'Lirik Resmi Mars IPNU (H. Mahbub Djunaidi)',
        content: `### MARS IKATAN PELAJAR NAHDLATUL ULAMA (IPNU)
*Gubahan: H. Mahbub Djunaidi*

Wahai pelajar Islam yang setia
Tegakkanlah agamamu
Di bumi nusantara tercinta
Hamparkan kebaikan selalu

Kibarkanlah panji-panji Islam
Jadikanlah panduan hidupmu
Belajar, Berjuang, Bertaqwa
Itulah semboyan yang mulia

Reff:
Ikatan Pelajar Nahdlatul Ulama
Harapan nusa dan bangsa
Ahlussunnah wal Jama'ah
Aqidah dan pedoman kita

Bersatu padu kita melangkah
Menuju ridho Ilahi
Maju terus pantang menyerah
Untuk kejayaan negeri!`
      },
      {
        title: 'Lirik Resmi Mars IPPNU',
        content: `### MARS IKATAN PELAJAR PUTRI NAHDLATUL ULAMA (IPPNU)

Sirnalah gelap terbitlah terang
Fajar menyingsing di ufuk timur
Bangkitlah puteri Pertiwi
Kembangkan sayap kemuliaan

Berilmu, beramal, berbakti
Tunaikan bakti pada Ilahi
Srikandi masa kini
Tegakkan kebenaran sejati

Reff:
Ikatan Pelajar Puteri Nahdlatul Ulama
Garda terdepan muslimah bangsa
Dengan semboyan Belajar, Berjuang, Bertaqwa
Demi kejayaan nusa dan agama!`
      }
    ]
  },
  {
    id: 'kitab-aswaja',
    title: 'Risalah Ahlussunnah wal Jamaah',
    category: 'Khazanah Aswaja',
    author: 'Hadratusy Syaikh KH. Hasyim Asy\'ari',
    description: 'Kitab rujukan pokok pendiri Nahdlatul Ulama yang membedah akidah, fikih, dan akhlak tradisi ulama salafus shalih.',
    samplePrompt: 'Apa definisi Sunnah dan Bid\'ah menurut KH. Hasyim Asy\'ari dalam Risalah Aswaja?',
    chapters: [
      {
        title: 'Pasal 1: Sunnah dan Bid\'ah',
        content: `### PASAL 1: HAKIKAT AS-SUNNAH DAN AL-BID'AH
*Kitab Risalah Ahlis Sunnah wal Jama'ah - Hadratusy Syaikh KH. M. Hasyim Asy'ari*

**As-Sunnah**: Jalan yang diridhai dalam agama yang ditempuh oleh Rasulullah SAW dan para sahabatnya, baik berupa ilmu, akidah, perkataan, perbuatan, maupun persetujuan (taqrir).

**Al-Bid'ah**: Perkara baru yang diada-adakan dalam agama yang bertentangan dengan pokok-pokok syariat dan tidak memiliki sandaran dalil yang sah. Adapun tradisi kebaikan yang sejalan dengan syariat (seperti peringatan Maulid Nabi, tahlilan, pembacaan shalawat) termasuk dalam kategori *Bid'ah Hasanah* yang berpahala.`
      },
      {
        title: 'Pasal 2: Tradisi Ibadah & Amaliah Salafus Shalih',
        content: `### PASAL 2: TAWASSUL, TABARRUK, DAN ZIARAH KUBUR

1. **Tawassul**: Menjadikan amal saleh, kemuliaan Rasulullah SAW, atau doa para wali dan ulama saleh sebagai perantara dalam berdoa kepada Allah SWT.
2. **Tabarruk**: Mengharap berkah dari peninggalan orang-orang saleh dengan keyakinan penuh bahwa segala manfaat dan madharat hanyalah dari Allah SWT semata.
3. **Ziarah Kubur**: Sunnah yang dianjurkan untuk mengingat kematian, meneladani perjuangan orang saleh, serta mendoakan ampunan bagi kaum muslimin yang telah wafat.`
      }
    ]
  }
];
