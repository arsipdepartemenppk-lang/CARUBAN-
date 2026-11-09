/**
 * Database Komprehensif Wilayah & Lembaga Pendidikan se-Kabupaten Cirebon
 * Mencakup 40 Kecamatan, Seluruh Desa/Kelurahan (PR Ranting),
 * dan Sekolah/Madrasah SLTP - SLTA Negeri & Swasta serta Pesantren (PK Komisariat).
 * Sesuai Database Resmi Pimpinan Cabang IPNU & IPPNU Kabupaten Cirebon.
 */

export const KECAMATAN_CIREBON = [
  'ARJAWINANGUN',
  'ASTANAJAPURA',
  'BABAKAN',
  'BEBER',
  'CILEDUG',
  'CIWARINGIN',
  'DEPOK',
  'DUKUPUNTANG',
  'GEBANG',
  'GEGESIK',
  'GEMPOL',
  'GREGED',
  'GUNUNGJATI',
  'JAMBLANG',
  'KALIWEDI',
  'KAPETAKAN',
  'KARANGSEMBUNG',
  'KARANGWARENG',
  'KEDAWUNG',
  'KLANGENAN',
  'LEMAHABANG',
  'LOSARI',
  'MUNDU',
  'PABEDILAN',
  'PABUARAN',
  'PALIMANAN',
  'PANGENAN',
  'PANGURAGAN',
  'PASALEMAN',
  'PLERED',
  'PLUMBON',
  'SEDONG',
  'SUMBER',
  'SURANENGGALA',
  'SUSUKAN',
  'SUSUKANLEBAK',
  'TALUN',
  'TENGAHTANI',
  'WALED',
  'WERU'
] as const;

export type KecamatanName = typeof KECAMATAN_CIREBON[number];

/**
 * Daftar Desa / Kelurahan se-Kabupaten Cirebon berdasarkan 40 Kecamatan
 * Digunakan untuk dropdown kop surat Pimpinan Ranting (PR) IPNU-IPPNU
 */
export const DESA_PER_KECAMATAN: Record<string, string[]> = {
  'ARJAWINANGUN': [
    'Arjawinangun', 'Bulak', 'Geyongan', 'Jungjang', 'Jungjang Wetan',
    'Karangsambung', 'Rawagatel', 'Sende', 'Tegalgubug', 'Tegalgubug Lor'
  ],
  'ASTANAJAPURA': [
    'Astanajapura', 'Buntet', 'Japura Bakti', 'Jatimulya', 'Kanci',
    'Kanci Kulon', 'Kendal', 'Mertapada Kulon', 'Mertapada Wetan', 'Munjul', 'Sidamulya'
  ],
  'BABAKAN': [
    'Babakan', 'Babakangebang', 'Bojonggebang', 'Cangkuang', 'Gembongan',
    'Karangwangun', 'Kudukeras', 'Kudumulya', 'Pakusamben', 'Serang Kulon',
    'Serang Wetan', 'Sumber Lor'
  ],
  'BEBER': [
    'Beber', 'Ciawigajah', 'Cikancas', 'Cipinang', 'Halimpu',
    'Kondangsari', 'Patapan', 'Sindanghayu', 'Sindangkasih', 'Wanayasa'
  ],
  'CILEDUG': [
    'Ciledug Kulon', 'Ciledug Lor', 'Ciledug Tengah', 'Ciledug Wetan',
    'Damarguna', 'Jatiseeng', 'Jatiseeng Kidul', 'Leuweunggajah', 'Tenjomulyo'
  ],
  'CIWARINGIN': [
    'Babakan', 'Bringin', 'Budur', 'Ciwaringin', 'Galagamba',
    'Gintung Kidul', 'Gintung Tengah', 'Gintungranjeng'
  ],
  'DEPOK': [
    'Cikeduk', 'Depok', 'Kasugengan Kidul', 'Kasugengan Lor', 'Keduanan',
    'Kejuden', 'Warugede', 'Warukawung', 'Waruroyom'
  ],
  'DUKUPUNTANG': [
    'Balad', 'Bobos', 'Cangkoak', 'Cikalahang', 'Cipanas',
    'Cisaat', 'Dukupuntang', 'Kedongdong Kidul', 'Kepunduan', 'Sindangjawa', 'Sindangmekar'
  ],
  'GEBANG': [
    'Dompyong Kulon', 'Dompyong Wetan', 'Gagasari', 'Gebang', 'Gebangkulon',
    'Gebangmekar', 'Gebangudik', 'Kalimaro', 'Kalimekar', 'Melakasari'
  ],
  'GEGESIK': [
    'Bayalangu Kidul', 'Bayalangu Lor', 'Gegesik Kidul', 'Gegesik Kulon',
    'Gegesik Lor', 'Gegesik Wetan', 'Jagapura Kidul', 'Jagapura Kulon',
    'Jagapura Lor', 'Jagapura Wetan', 'Kedungdalem', 'Panunggul', 'Sibubut', 'Slendra'
  ],
  'GEMPOL': [
    'Cikeusal', 'Cupang', 'Gempol', 'Kedungbunder', 'Palimanan Barat', 'Walahar'
  ],
  'GREGED': [
    'Durajaya', 'Greged', 'Gumulunglebak', 'Gumulungtonggoh', 'Jatipancur',
    'Kamarang', 'Kamarang Lebak', 'Lebakmekar', 'Nanggela', 'Sindangkempeng'
  ],
  'GUNUNGJATI': [
    'Astana', 'Babadan', 'Buyut', 'Grogol', 'Jadimulya',
    'Jatimerta', 'Kalisapu', 'Klayan', 'Mayung', 'Mertasinga',
    'Pasindangan', 'Sambeng', 'Sirnabaya', 'Wanakaya'
  ],
  'JAMBLANG': [
    'Bakung Kidul', 'Bakung Lor', 'Bojong Lor', 'Bojong Wetan',
    'Jamblang', 'Orimalang', 'Sitiwinangun', 'Wangunharja'
  ],
  'KALIWEDI': [
    'Guwa Kidul', 'Guwa Lor', 'Kalideres', 'Kaliwedi Kidul', 'Kaliwedi Lor',
    'Prajawinangun Kulon', 'Prajawinangun Wetan', 'Ujungsemi', 'Wargabinangun'
  ],
  'KAPETAKAN': [
    'Bungko', 'Bungko Lor', 'Dukuh', 'Grogol', 'Kapetakan',
    'Karangkendal', 'Kertasure', 'Pegagan Kidul', 'Pegagan Lor'
  ],
  'KARANGSEMBUNG': [
    'Karangmalang', 'Karangmekar', 'Karangsembung', 'Karangsuwung',
    'Karangtengah', 'Kubangkarang', 'Tambelang'
  ],
  'KARANGWARENG': [
    'Blender', 'Demangharja', 'Jatipiring', 'Karangasem',
    'Karangwareng', 'Kubangdeleg', 'Seuseupan'
  ],
  'KEDAWUNG': [
    'Kalikoa', 'Kedawung', 'Kedungdawa', 'Kedungjaya',
    'Kertawinangun', 'Sutawinangun', 'Tuk'
  ],
  'KLANGENAN': [
    'Bangodua', 'Danawangun', 'Jemaras Kidul', 'Jemaras Lor', 'Klangenan',
    'Kreyo', 'Pekantingan', 'Serang', 'Slangit'
  ],
  'LEMAHABANG': [
    'Asem', 'Belawa', 'Cipeujeuh Kulon', 'Cipeujeuh Wetan', 'Lemahabang',
    'Leuwidingding', 'Picungpugur', 'Sigong', 'Sindanglaut', 'Tuk Karangsuwung', 'Wangkelang'
  ],
  'LOSARI': [
    'Astanalanggar', 'Barisan', 'Kalirahayu', 'Kalisari', 'Losari Kidul',
    'Losari Lor', 'Mulyasari', 'Panggangsari', 'Tawangsari'
  ],
  'MUNDU': [
    'Banjarwangunan', 'Citemu', 'Luwung', 'Mundu Mesigit', 'Mundu Pesisir',
    'Pamengkang', 'Penpen', 'Setupatok', 'Sinarancang', 'Suci', 'Waruduwur'
  ],
  'PABEDILAN': [
    'Babakan Losari', 'Dukuhwidodari', 'Kalibuntu', 'Kalimukti',
    'Pabedilan Kaler', 'Pabedilan Kidul', 'Pabedilan Kulon', 'Pabedilan Wetan',
    'Pasuruan', 'Sidaresmi', 'Tersana'
  ],
  'PABUARAN': [
    'Hulubanteng', 'Hulubanteng Lor', 'Jatirebon', 'Pabuaran Kidul',
    'Pabuaran Lor', 'Pabuaran Wetan', 'Sukadana'
  ],
  'PALIMANAN': [
    'Balerante', 'Beberan', 'Cengkuang', 'Ciawi', 'Cilukrak',
    'Kepuh', 'Lungbenda', 'Palimanan Timur', 'Paningkiran', 'Pegagan', 'Semplo', 'Tegalkarang'
  ],
  'PANGENAN': [
    'Astanamukti', 'Bendungan', 'Ender', 'Getasan',
    'Japura Lor', 'Pangarengan', 'Pangenan', 'Rawaurip'
  ],
  'PANGURAGAN': [
    'Alangamba', 'Gujeg', 'Kalianyar', 'Karanganyar', 'Kroya',
    'Lemahtamba', 'Panguragan', 'Panguragan Kulon', 'Panguragan Lor', 'Panguragan Wetan'
  ],
  'PASALEMAN': [
    'Cilengkrang', 'Cilengkrang Girang', 'Pasaleman', 'Tanjung Anom', 'Tonjong'
  ],
  'PLERED': [
    'Cangkring', 'Gamel', 'Panembahan', 'Pangkalan', 'Plered',
    'Sarabau', 'Tegalsari', 'Trusmi Kulon', 'Trusmi Wetan', 'Wotgali'
  ],
  'PLUMBON': [
    'Bodesari', 'Danamulya', 'Gombang', 'Karangasem', 'Karangmulya',
    'Kebarepan', 'Kedungsana', 'Lurah', 'Marikangen', 'Pasanggrahan', 'Plumbon', 'Purbawinangun'
  ],
  'SEDONG': [
    'Karangwuni', 'Kertawangun', 'Panambangan', 'Panongan',
    'Putat', 'Sedong Kidul', 'Sedong Lor', 'Winduhaji', 'Windujaya'
  ],
  'SUMBER': [
    'Babakan', 'Gegunung', 'Kaliwadas', 'Kemantren', 'Kenanga',
    'Matangaji', 'Pasalakan', 'Pejambon', 'Perbutulan', 'Sendang',
    'Sidawangi', 'Sumber', 'Tukmudal', 'Watuwelah'
  ],
  'SURANENGGALA': [
    'Karangreja', 'Keraton', 'Kertasura', 'Muara', 'Purwawinangun',
    'Suranenggala', 'Suranenggala Kidul', 'Suranenggala Kulon', 'Suranenggala Lor'
  ],
  'SUSUKAN': [
    'Bojong Kulon', 'Bunder', 'Gintunglor', 'Jatianom', 'Jatipura',
    'Kedongdong', 'Luwungkencana', 'Susukan', 'Tangkil', 'Ujunggebang', 'Wiyong'
  ],
  'SUSUKANLEBAK': [
    'Ciawiasih', 'Ciawijapura', 'Curug', 'Curug Wetan', 'Kaligawe',
    'Kaligawe Kulon', 'Karangmangu', 'Pasawahan', 'Sampih', 'Susukanagung', 'Susukanlebak'
  ],
  'TALUN': [
    'Ciperna', 'Cirebon Girang', 'Kepongpongan', 'Kerandon',
    'Kubang', 'Sampiran', 'Sarwadadi', 'Wanasaba Kidul', 'Wanasaba Lor'
  ],
  'TENGAHTANI': [
    'Astapada', 'Battembat', 'Dawuan', 'Gesik',
    'Kalibaru', 'Kalitengah', 'Kemlakagede', 'Palir'
  ],
  'WALED': [
    'Ambit', 'Cibogo', 'Cikangas', 'Ciuyah', 'Karangsari',
    'Waled Asem', 'Waled Desa', 'Waled Kota'
  ],
  'WERU': [
    'Karangsari', 'Kertawinangun', 'Megugede', 'Megucilik',
    'Setu Kulon', 'Setu Patok', 'Tegalwangi', 'Weru Kidul', 'Weru Lor'
  ]
};

export interface SchoolEntry {
  nama: string;
  jenjang: 'SLTP' | 'SLTA';
  jenis: 'SMP' | 'MTS' | 'SMA' | 'SMK' | 'MA' | 'PESANTREN';
  status: 'Negeri' | 'Swasta';
  kecamatan: string;
}

/**
 * Daftar Komprehensif Sekolah & Madrasah SLTP - SLTA Negeri & Swasta di 40 Kecamatan Kab. Cirebon
 * Digunakan untuk dropdown kop surat Pimpinan Komisariat (PK) IPNU-IPPNU
 */
export const SEKOLAH_PER_KECAMATAN: Record<string, SchoolEntry[]> = {
  'ARJAWINANGUN': [
    { nama: 'SMPN 1 ARJAWINANGUN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'ARJAWINANGUN' },
    { nama: 'SMPN 2 ARJAWINANGUN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'ARJAWINANGUN' },
    { nama: 'MTSN 6 CIREBON (ARJAWINANGUN)', jenjang: 'SLTP', jenis: 'MTS', status: 'Negeri', kecamatan: 'ARJAWINANGUN' },
    { nama: 'MTS MAARIF NU TEGALGUBUG', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'ARJAWINANGUN' },
    { nama: 'SMAN 1 ARJAWINANGUN', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'ARJAWINANGUN' },
    { nama: 'SMKN 1 ARJAWINANGUN', jenjang: 'SLTA', jenis: 'SMK', status: 'Negeri', kecamatan: 'ARJAWINANGUN' },
    { nama: 'SMK MAARIF NU ARJAWINANGUN', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'ARJAWINANGUN' },
    { nama: 'MAN 2 CIREBON (TEGALGUBUG)', jenjang: 'SLTA', jenis: 'MA', status: 'Negeri', kecamatan: 'ARJAWINANGUN' },
    { nama: 'MA MAARIF NU ARJAWINANGUN', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'ARJAWINANGUN' },
    { nama: 'PONDOK PESANTREN DAR EL-TAUFIQ TEGALGUBUG', jenjang: 'SLTA', jenis: 'PESANTREN', status: 'Swasta', kecamatan: 'ARJAWINANGUN' }
  ],
  'ASTANAJAPURA': [
    { nama: 'SMPN 1 ASTANAJAPURA', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'ASTANAJAPURA' },
    { nama: 'SMPN 2 ASTANAJAPURA', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'ASTANAJAPURA' },
    { nama: 'MTS NU BUNTET PESANTREN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'ASTANAJAPURA' },
    { nama: 'SMAN 1 ASTANAJAPURA', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'ASTANAJAPURA' },
    { nama: 'SMA ISLAM BUNTET PESANTREN', jenjang: 'SLTA', jenis: 'SMA', status: 'Swasta', kecamatan: 'ASTANAJAPURA' },
    { nama: 'SMK ISLAM BUNTET PESANTREN', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'ASTANAJAPURA' },
    { nama: 'MAN 3 CIREBON (BUNTET PESANTREN)', jenjang: 'SLTA', jenis: 'MA', status: 'Negeri', kecamatan: 'ASTANAJAPURA' },
    { nama: 'MA NU BUNTET PESANTREN', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'ASTANAJAPURA' },
    { nama: 'PONDOK BUNTET PESANTREN CIREBON', jenjang: 'SLTA', jenis: 'PESANTREN', status: 'Swasta', kecamatan: 'ASTANAJAPURA' }
  ],
  'BABAKAN': [
    { nama: 'SMPN 1 BABAKAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'BABAKAN' },
    { nama: 'SMPN 2 BABAKAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'BABAKAN' },
    { nama: 'MTS ASY-SYAFI\'IYAH BABAKAN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'BABAKAN' },
    { nama: 'SMAN 1 BABAKAN', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'BABAKAN' },
    { nama: 'SMK MAARIF KANCI BABAKAN', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'BABAKAN' },
    { nama: 'MA ASY-SYAFI\'IYAH BABAKAN', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'BABAKAN' }
  ],
  'BEBER': [
    { nama: 'SMPN 1 BEBER', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'BEBER' },
    { nama: 'SMPN 2 BEBER', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'BEBER' },
    { nama: 'MTS AL-HIDAYAH BEBER', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'BEBER' },
    { nama: 'SMAN 1 BEBER', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'BEBER' },
    { nama: 'SMK PGRI BEBER', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'BEBER' }
  ],
  'CILEDUG': [
    { nama: 'SMPN 1 CILEDUG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'CILEDUG' },
    { nama: 'SMPN 2 CILEDUG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'CILEDUG' },
    { nama: 'MTSN 3 CIREBON (CILEDUG)', jenjang: 'SLTP', jenis: 'MTS', status: 'Negeri', kecamatan: 'CILEDUG' },
    { nama: 'SMAN 1 CILEDUG', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'CILEDUG' },
    { nama: 'SMK BUDI UTOMO CILEDUG', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'CILEDUG' },
    { nama: 'MA MAARIF CILEDUG', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'CILEDUG' }
  ],
  'CIWARINGIN': [
    { nama: 'SMPN 1 CIWARINGIN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'CIWARINGIN' },
    { nama: 'MTS MA\'HAD AL-ZAYTUN / AL-HIKMAH CIWARINGIN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'CIWARINGIN' },
    { nama: 'MTS SALAFIYAH BABAKAN CIWARINGIN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'CIWARINGIN' },
    { nama: 'SMAN 1 CIWARINGIN', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'CIWARINGIN' },
    { nama: 'SMK MAARIF NU CIWARINGIN', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'CIWARINGIN' },
    { nama: 'MA SALAFIYAH BABAKAN CIWARINGIN', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'CIWARINGIN' },
    { nama: 'MA MA\'HAD AL-HIKMAH CIWARINGIN', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'CIWARINGIN' },
    { nama: 'PONDOK PESANTREN BABAKAN CIWARINGIN', jenjang: 'SLTA', jenis: 'PESANTREN', status: 'Swasta', kecamatan: 'CIWARINGIN' }
  ],
  'DEPOK': [
    { nama: 'SMPN 1 DEPOK', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'DEPOK' },
    { nama: 'SMPN 2 DEPOK', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'DEPOK' },
    { nama: 'MTS NURUL HUDA DEPOK', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'DEPOK' },
    { nama: 'SMKN 1 DEPOK', jenjang: 'SLTA', jenis: 'SMK', status: 'Negeri', kecamatan: 'DEPOK' },
    { nama: 'MA NURUL HUDA DEPOK', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'DEPOK' }
  ],
  'DUKUPUNTANG': [
    { nama: 'SMPN 1 DUKUPUNTANG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'DUKUPUNTANG' },
    { nama: 'SMPN 2 DUKUPUNTANG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'DUKUPUNTANG' },
    { nama: 'MTS SINDANGJAWA DUKUPUNTANG', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'DUKUPUNTANG' },
    { nama: 'SMAN 1 DUKUPUNTANG', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'DUKUPUNTANG' },
    { nama: 'SMK BINA WARGA DUKUPUNTANG', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'DUKUPUNTANG' },
    { nama: 'PONDOK PESANTREN BINA INSAN MULIA (BIMA)', jenjang: 'SLTA', jenis: 'PESANTREN', status: 'Swasta', kecamatan: 'DUKUPUNTANG' }
  ],
  'GEBANG': [
    { nama: 'SMPN 1 GEBANG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'GEBANG' },
    { nama: 'SMPN 2 GEBANG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'GEBANG' },
    { nama: 'MTS AL-IKHLAS GEBANG', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'GEBANG' },
    { nama: 'SMAN 1 GEBANG', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'GEBANG' },
    { nama: 'SMKN 1 GEBANG', jenjang: 'SLTA', jenis: 'SMK', status: 'Negeri', kecamatan: 'GEBANG' },
    { nama: 'SMK MARITIM GEBANG', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'GEBANG' }
  ],
  'GEGESIK': [
    { nama: 'SMPN 1 GEGESIK', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'GEGESIK' },
    { nama: 'SMPN 2 GEGESIK', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'GEGESIK' },
    { nama: 'MTSN 8 CIREBON (GEGESIK)', jenjang: 'SLTP', jenis: 'MTS', status: 'Negeri', kecamatan: 'GEGESIK' },
    { nama: 'SMAN 1 GEGESIK', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'GEGESIK' },
    { nama: 'SMK KARYA NASIONAL GEGESIK', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'GEGESIK' },
    { nama: 'MA MAARIF NU GEGESIK', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'GEGESIK' }
  ],
  'GEMPOL': [
    { nama: 'SMPN 1 GEMPOL', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'GEMPOL' },
    { nama: 'MTS AL-MA\'ARIF GEMPOL', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'GEMPOL' },
    { nama: 'SMKN 1 GEMPOL', jenjang: 'SLTA', jenis: 'SMK', status: 'Negeri', kecamatan: 'GEMPOL' },
    { nama: 'MA DARUL FALAH GEMPOL', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'GEMPOL' },
    { nama: 'PONDOK PESANTREN KHAS KEMPEK (GEMPOL/PALIMANAN)', jenjang: 'SLTA', jenis: 'PESANTREN', status: 'Swasta', kecamatan: 'GEMPOL' }
  ],
  'GREGED': [
    { nama: 'SMPN 1 GREGED', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'GREGED' },
    { nama: 'MTS NURUL HUDA GREGED', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'GREGED' },
    { nama: 'SMK ITIKURIH HIBARNA GREGED', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'GREGED' },
    { nama: 'MA AL-FALAH GREGED', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'GREGED' }
  ],
  'GUNUNGJATI': [
    { nama: 'SMPN 1 GUNUNGJATI', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'GUNUNGJATI' },
    { nama: 'SMPN 2 GUNUNGJATI', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'GUNUNGJATI' },
    { nama: 'MTSN 2 CIREBON (GUNUNGJATI)', jenjang: 'SLTP', jenis: 'MTS', status: 'Negeri', kecamatan: 'GUNUNGJATI' },
    { nama: 'SMAN 1 GUNUNGJATI', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'GUNUNGJATI' },
    { nama: 'SMK NUSANTARA GUNUNGJATI', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'GUNUNGJATI' },
    { nama: 'MA SUNAN GUNUNG JATI', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'GUNUNGJATI' }
  ],
  'JAMBLANG': [
    { nama: 'SMPN 1 JAMBLANG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'JAMBLANG' },
    { nama: 'MTS MAARIF JAMBLANG', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'JAMBLANG' },
    { nama: 'SMAN 1 JAMBLANG', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'JAMBLANG' },
    { nama: 'SMKN 1 JAMBLANG', jenjang: 'SLTA', jenis: 'SMK', status: 'Negeri', kecamatan: 'JAMBLANG' },
    { nama: 'SMK TI SITIWINANGUN JAMBLANG', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'JAMBLANG' }
  ],
  'KALIWEDI': [
    { nama: 'SMPN 1 KALIWEDI', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'KALIWEDI' },
    { nama: 'MTS AL-MUTTAQIN KALIWEDI', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'KALIWEDI' },
    { nama: 'SMK PATRIOT KALIWEDI', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'KALIWEDI' },
    { nama: 'MA KALIWEDI', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'KALIWEDI' }
  ],
  'KAPETAKAN': [
    { nama: 'SMPN 1 KAPETAKAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'KAPETAKAN' },
    { nama: 'SMPN 2 KAPETAKAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'KAPETAKAN' },
    { nama: 'MTS AL-HIDAYAH KAPETAKAN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'KAPETAKAN' },
    { nama: 'SMAN 1 KAPETAKAN', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'KAPETAKAN' },
    { nama: 'SMK MAARIF KAPETAKAN', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'KAPETAKAN' },
    { nama: 'MA NU KAPETAKAN', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'KAPETAKAN' }
  ],
  'KARANGSEMBUNG': [
    { nama: 'SMPN 1 KARANGSEMBUNG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'KARANGSEMBUNG' },
    { nama: 'MTSN 5 CIREBON (KARANGSEMBUNG)', jenjang: 'SLTP', jenis: 'MTS', status: 'Negeri', kecamatan: 'KARANGSEMBUNG' },
    { nama: 'SMAN 1 KARANGSEMBUNG', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'KARANGSEMBUNG' },
    { nama: 'SMK PLUS KARANGSEMBUNG', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'KARANGSEMBUNG' }
  ],
  'KARANGWARENG': [
    { nama: 'SMPN 1 KARANGWARENG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'KARANGWARENG' },
    { nama: 'MTS NURUL HUDA KARANGWARENG', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'KARANGWARENG' },
    { nama: 'SMK AL-JABBAR KARANGWARENG', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'KARANGWARENG' }
  ],
  'KEDAWUNG': [
    { nama: 'SMPN 1 KEDAWUNG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'KEDAWUNG' },
    { nama: 'SMP ISLAM AL-AZHAR 5 CIREBON (KEDAWUNG)', jenjang: 'SLTP', jenis: 'SMP', status: 'Swasta', kecamatan: 'KEDAWUNG' },
    { nama: 'MTS ASSUNNAH KEDAWUNG', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'KEDAWUNG' },
    { nama: 'SMKN 1 KEDAWUNG', jenjang: 'SLTA', jenis: 'SMK', status: 'Negeri', kecamatan: 'KEDAWUNG' },
    { nama: 'SMA ISLAM AL-AZHAR 5 KEDAWUNG', jenjang: 'SLTA', jenis: 'SMA', status: 'Swasta', kecamatan: 'KEDAWUNG' },
    { nama: 'SMK KEDAWUNG CIREBON', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'KEDAWUNG' },
    { nama: 'MA MAARIF NU KEDAWUNG', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'KEDAWUNG' }
  ],
  'KLANGENAN': [
    { nama: 'SMPN 1 KLANGENAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'KLANGENAN' },
    { nama: 'SMPN 2 KLANGENAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'KLANGENAN' },
    { nama: 'MTS AL-IKHLAS KLANGENAN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'KLANGENAN' },
    { nama: 'SMAN 1 KLANGENAN', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'KLANGENAN' },
    { nama: 'SMK TUNAS HARAPAN KLANGENAN', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'KLANGENAN' },
    { nama: 'MA AL-MA\'MUN KLANGENAN', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'KLANGENAN' }
  ],
  'LEMAHABANG': [
    { nama: 'SMPN 1 LEMAHABANG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'LEMAHABANG' },
    { nama: 'SMPN 2 LEMAHABANG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'LEMAHABANG' },
    { nama: 'MTSN 7 CIREBON (LEMAHABANG)', jenjang: 'SLTP', jenis: 'MTS', status: 'Negeri', kecamatan: 'LEMAHABANG' },
    { nama: 'SMAN 1 LEMAHABANG', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'LEMAHABANG' },
    { nama: 'SMKN 1 LEMAHABANG', jenjang: 'SLTA', jenis: 'SMK', status: 'Negeri', kecamatan: 'LEMAHABANG' },
    { nama: 'SMK BINA WARGA 1 LEMAHABANG', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'LEMAHABANG' },
    { nama: 'MA DARUL FALAH SINDANGLAUT', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'LEMAHABANG' }
  ],
  'LOSARI': [
    { nama: 'SMPN 1 LOSARI', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'LOSARI' },
    { nama: 'SMPN 2 LOSARI', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'LOSARI' },
    { nama: 'MTSN 4 CIREBON (LOSARI)', jenjang: 'SLTP', jenis: 'MTS', status: 'Negeri', kecamatan: 'LOSARI' },
    { nama: 'SMAN 1 LOSARI', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'LOSARI' },
    { nama: 'SMK PAKUNGWATI LOSARI', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'LOSARI' },
    { nama: 'MA RAUDLATUT THALIBIN LOSARI', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'LOSARI' }
  ],
  'MUNDU': [
    { nama: 'SMPN 1 MUNDU', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'MUNDU' },
    { nama: 'SMPN 2 MUNDU', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'MUNDU' },
    { nama: 'MTS AL-WASLIYAH MUNDU', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'MUNDU' },
    { nama: 'SMKN 1 MUNDU (PELAYARAN CIREBON)', jenjang: 'SLTA', jenis: 'SMK', status: 'Negeri', kecamatan: 'MUNDU' },
    { nama: 'SMK INFORMATIKA MUNDU', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'MUNDU' },
    { nama: 'MA AL-MUTTAQIEN MUNDU', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'MUNDU' }
  ],
  'PABEDILAN': [
    { nama: 'SMPN 1 PABEDILAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'PABEDILAN' },
    { nama: 'SMPN 2 PABEDILAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'PABEDILAN' },
    { nama: 'MTS AL-HIDAYAH PABEDILAN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'PABEDILAN' },
    { nama: 'SMAN 1 PABEDILAN', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'PABEDILAN' },
    { nama: 'SMK BINA CENDIKIA PABEDILAN', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'PABEDILAN' },
    { nama: 'MA PABEDILAN', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'PABEDILAN' }
  ],
  'PABUARAN': [
    { nama: 'SMPN 1 PABUARAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'PABUARAN' },
    { nama: 'MTS MAARIF PABUARAN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'PABUARAN' },
    { nama: 'SMAN 1 PABUARAN', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'PABUARAN' },
    { nama: 'SMK AL-HIDAYAH PABUARAN', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'PABUARAN' }
  ],
  'PALIMANAN': [
    { nama: 'SMPN 1 PALIMANAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'PALIMANAN' },
    { nama: 'SMPN 2 PALIMANAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'PALIMANAN' },
    { nama: 'MTSN 1 CIREBON (PALIMANAN)', jenjang: 'SLTP', jenis: 'MTS', status: 'Negeri', kecamatan: 'PALIMANAN' },
    { nama: 'MTS KEMPEK PALIMANAN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'PALIMANAN' },
    { nama: 'SMAN 1 PALIMANAN', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'PALIMANAN' },
    { nama: 'SMK PESANTREN KEMPEK', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'PALIMANAN' },
    { nama: 'MAN 1 CIREBON (PALIMANAN)', jenjang: 'SLTA', jenis: 'MA', status: 'Negeri', kecamatan: 'PALIMANAN' },
    { nama: 'MA KHAS KEMPEK', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'PALIMANAN' },
    { nama: 'PONDOK PESANTREN KHAS KEMPEK CIREBON', jenjang: 'SLTA', jenis: 'PESANTREN', status: 'Swasta', kecamatan: 'PALIMANAN' }
  ],
  'PANGENAN': [
    { nama: 'SMPN 1 PANGENAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'PANGENAN' },
    { nama: 'MTS AL-IKHLAS PANGENAN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'PANGENAN' },
    { nama: 'SMKN 1 PANGENAN', jenjang: 'SLTA', jenis: 'SMK', status: 'Negeri', kecamatan: 'PANGENAN' },
    { nama: 'PONDOK PESANTREN GEDONGAN PANGENAN', jenjang: 'SLTA', jenis: 'PESANTREN', status: 'Swasta', kecamatan: 'PANGENAN' }
  ],
  'PANGURAGAN': [
    { nama: 'SMPN 1 PANGURAGAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'PANGURAGAN' },
    { nama: 'MTS AL-HIKMAH PANGURAGAN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'PANGURAGAN' },
    { nama: 'SMK NU PANGURAGAN', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'PANGURAGAN' },
    { nama: 'MA NU PANGURAGAN', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'PANGURAGAN' }
  ],
  'PASALEMAN': [
    { nama: 'SMPN 1 PASALEMAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'PASALEMAN' },
    { nama: 'MTS AL-FALAH PASALEMAN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'PASALEMAN' },
    { nama: 'SMAN 1 PASALEMAN', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'PASALEMAN' }
  ],
  'PLERED': [
    { nama: 'SMPN 1 PLERED', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'PLERED' },
    { nama: 'SMPN 2 PLERED', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'PLERED' },
    { nama: 'MTS MAARIF PLERED', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'PLERED' },
    { nama: 'SMAN 1 PLERED', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'PLERED' },
    { nama: 'SMK ISLAM TRUSMI PLERED', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'PLERED' },
    { nama: 'MA SALAFIYAH PLERED', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'PLERED' }
  ],
  'PLUMBON': [
    { nama: 'SMPN 1 PLUMBON', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'PLUMBON' },
    { nama: 'SMPN 2 PLUMBON', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'PLUMBON' },
    { nama: 'MTS AL-MUTTAQIEN PLUMBON', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'PLUMBON' },
    { nama: 'SMAN 1 PLUMBON', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'PLUMBON' },
    { nama: 'SMKN 1 PLUMBON', jenjang: 'SLTA', jenis: 'SMK', status: 'Negeri', kecamatan: 'PLUMBON' },
    { nama: 'SMK DINAMIKA ARGA PLUMBON', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'PLUMBON' }
  ],
  'SEDONG': [
    { nama: 'SMPN 1 SEDONG', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'SEDONG' },
    { nama: 'MTS AL-FALAH SEDONG', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'SEDONG' },
    { nama: 'SMAN 1 SEDONG', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'SEDONG' },
    { nama: 'SMK BINA CENDIKIA SEDONG', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'SEDONG' }
  ],
  'SUMBER': [
    { nama: 'SMPN 1 SUMBER', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'SUMBER' },
    { nama: 'SMPN 2 SUMBER', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'SUMBER' },
    { nama: 'SMPN 3 SUMBER', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'SUMBER' },
    { nama: 'MTS PERSIS SUMBER', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'SUMBER' },
    { nama: 'SMAN 1 SUMBER', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'SUMBER' },
    { nama: 'SMAN 2 SUMBER', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'SUMBER' },
    { nama: 'SMK MAARIF CIREBON (SUMBER)', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'SUMBER' },
    { nama: 'MA MAARIF SUMBER', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'SUMBER' },
    { nama: 'PONDOK PESANTREN AL-ANWAR SUMBER', jenjang: 'SLTA', jenis: 'PESANTREN', status: 'Swasta', kecamatan: 'SUMBER' }
  ],
  'SURANENGGALA': [
    { nama: 'SMPN 1 SURANENGGALA', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'SURANENGGALA' },
    { nama: 'SMPN 2 SURANENGGALA', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'SURANENGGALA' },
    { nama: 'MTS SURANENGGALA', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'SURANENGGALA' },
    { nama: 'SMAN 1 SURANENGGALA', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'SURANENGGALA' },
    { nama: 'SMK KARYA BAKTI SURANENGGALA', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'SURANENGGALA' }
  ],
  'SUSUKAN': [
    { nama: 'SMPN 1 SUSUKAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'SUSUKAN' },
    { nama: 'SMPN 2 SUSUKAN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'SUSUKAN' },
    { nama: 'MTS NURUL HUDA SUSUKAN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'SUSUKAN' },
    { nama: 'SMAN 1 SUSUKAN', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'SUSUKAN' },
    { nama: 'SMK MAARIF SUSUKAN', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'SUSUKAN' },
    { nama: 'MA SALAFIYAH SUSUKAN', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'SUSUKAN' }
  ],
  'SUSUKANLEBAK': [
    { nama: 'SMPN 1 SUSUKANLEBAK', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'SUSUKANLEBAK' },
    { nama: 'MTS AL-MUTTAQIEN SUSUKANLEBAK', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'SUSUKANLEBAK' },
    { nama: 'SMAN 1 SUSUKANLEBAK', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'SUSUKANLEBAK' },
    { nama: 'SMK DIPONEGORO SUSUKANLEBAK', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'SUSUKANLEBAK' }
  ],
  'TALUN': [
    { nama: 'SMPN 1 TALUN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'TALUN' },
    { nama: 'SMPN 2 TALUN', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'TALUN' },
    { nama: 'MTS PERSIS TALUN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'TALUN' },
    { nama: 'MTS NU TALUN', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'TALUN' },
    { nama: 'SMKN 1 TALUN', jenjang: 'SLTA', jenis: 'SMK', status: 'Negeri', kecamatan: 'TALUN' },
    { nama: 'MA MAARIF NU TALUN', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'TALUN' }
  ],
  'TENGAHTANI': [
    { nama: 'SMPN 1 TENGAHTANI', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'TENGAHTANI' },
    { nama: 'MTS AL-HIDAYAH TENGAHTANI', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'TENGAHTANI' },
    { nama: 'SMK INFORMATIKA AL-IRSYAD TENGAHTANI', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'TENGAHTANI' },
    { nama: 'MA DAARUL QUR\'AN TENGAHTANI', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'TENGAHTANI' }
  ],
  'WALED': [
    { nama: 'SMPN 1 WALED', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'WALED' },
    { nama: 'SMPN 2 WALED', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'WALED' },
    { nama: 'MTS AL-IKHLAS WALED', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'WALED' },
    { nama: 'SMAN 1 WALED', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'WALED' },
    { nama: 'SMK BINA CENDIKIA WALED', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'WALED' },
    { nama: 'MA WALED CIREBON', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'WALED' }
  ],
  'WERU': [
    { nama: 'SMPN 1 WERU', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'WERU' },
    { nama: 'SMPN 2 WERU', jenjang: 'SLTP', jenis: 'SMP', status: 'Negeri', kecamatan: 'WERU' },
    { nama: 'MTS AL-MUTAWALLY WERU', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'WERU' },
    { nama: 'MTS SALAFIYAH WERU', jenjang: 'SLTP', jenis: 'MTS', status: 'Swasta', kecamatan: 'WERU' },
    { nama: 'SMAN 1 WERU', jenjang: 'SLTA', jenis: 'SMA', status: 'Negeri', kecamatan: 'WERU' },
    { nama: 'SMK TELKOM SEKAR KEMUNING WERU', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'WERU' },
    { nama: 'SMK MAARIF WERU', jenjang: 'SLTA', jenis: 'SMK', status: 'Swasta', kecamatan: 'WERU' },
    { nama: 'MA AL-MA\'HAD AN-NUR WERU', jenjang: 'SLTA', jenis: 'MA', status: 'Swasta', kecamatan: 'WERU' }
  ]
};

/**
 * Mendapatkan seluruh daftar Desa / Kelurahan se-Kabupaten Cirebon
 */
export const getAllDesaList = (): { desa: string; kecamatan: string; label: string }[] => {
  const result: { desa: string; kecamatan: string; label: string }[] = [];
  Object.entries(DESA_PER_KECAMATAN).forEach(([kec, desas]) => {
    desas.forEach(d => {
      result.push({
        desa: d.toUpperCase(),
        kecamatan: kec,
        label: `DESA ${d.toUpperCase()} (Kec. ${kec})`
      });
    });
  });
  return result.sort((a, b) => a.desa.localeCompare(b.desa));
};

/**
 * Mendapatkan seluruh daftar Sekolah SLTP - SLTA di 40 Kecamatan Kab. Cirebon
 */
export const getAllSekolahList = (): (SchoolEntry & { label: string })[] => {
  const result: (SchoolEntry & { label: string })[] = [];
  Object.entries(SEKOLAH_PER_KECAMATAN).forEach(([kec, schools]) => {
    schools.forEach(s => {
      result.push({
        ...s,
        label: `${s.nama} [${s.jenjang} ${s.status}] - Kec. ${kec}`
      });
    });
  });
  return result.sort((a, b) => a.nama.localeCompare(b.nama));
};
