/**
 * Generator NIA (Nomor Induk Anggota) Otomatis
 * Sesuai Standar Administrasi PC IPNU Kabupaten Cirebon & PP IPNU
 * 
 * Format: [Kode Wilayah].[Kode Cabang].[Kode Status/Tingkat].[Tahun Registrasi].[Nomor Urut 4 Digit]
 * Contoh: 10.20.03.26.0042
 * - 10: PW IPNU Jawa Barat
 * - 20: PC IPNU Kabupaten Cirebon
 * - 01/02/03/04/05: Tingkatan Kepengurusan
 * - 26: Tahun Angkatan / Registrasi (2026)
 * - 0042: Nomor Urut Kader/Anggota Terdaftar
 */

export interface NIAParams {
  statusPimpinan: 'PC' | 'PAC' | 'PK' | 'PR' | 'Anggota';
  existingNias?: string[];
  year?: number;
}

export const TINGKAT_CODES: Record<string, string> = {
  PC: '01',
  PAC: '02',
  PK: '03',
  PR: '04',
  Anggota: '05'
};

export const TINGKAT_LABELS: Record<string, string> = {
  PC: 'Pimpinan Cabang (PC)',
  PAC: 'Pimpinan Anak Cabang (PAC)',
  PK: 'Pimpinan Komisariat (PK)',
  PR: 'Pimpinan Ranting (PR)',
  Anggota: 'Anggota Biasa'
};

/**
 * Menghasilkan nomor urut berikutnya yang belum terpakai berdasarkan daftar NIA yang ada
 */
export function getNextSequenceNumber(prefix: string, existingNias: string[] = []): string {
  let highestNum = 0;

  for (const rawNia of existingNias) {
    if (!rawNia) continue;
    const clean = rawNia.trim();
    if (clean.startsWith(prefix)) {
      const parts = clean.split('.');
      const lastPart = parts[parts.length - 1];
      const parsed = parseInt(lastPart, 10);
      if (!isNaN(parsed) && parsed > highestNum) {
        highestNum = parsed;
      }
    } else {
      // Periksa nomor urut di bagian paling belakang
      const parts = clean.split('.');
      if (parts.length >= 4) {
        const lastPart = parts[parts.length - 1];
        const parsed = parseInt(lastPart, 10);
        if (!isNaN(parsed) && parsed > highestNum && parsed < 10000) {
          highestNum = parsed;
        }
      }
    }
  }

  const nextNum = highestNum + 1;
  return nextNum.toString().padStart(4, '0');
}

/**
 * Generate NIA otomatis yang unik dan terstandarisasi
 */
export function generateAutomaticNIA({
  statusPimpinan = 'PK',
  existingNias = [],
  year = new Date().getFullYear()
}: NIAParams): string {
  const kodeWilayah = '10'; // PW IPNU Jawa Barat
  const kodeCabang = '20';  // PC IPNU Kabupaten Cirebon
  const kodeTingkat = TINGKAT_CODES[statusPimpinan] || '03';
  const kodeTahun = String(year).slice(-2); // 2 digit tahun, misal '26'

  const prefix = `${kodeWilayah}.${kodeCabang}.${kodeTingkat}.${kodeTahun}`;
  const nextSeq = getNextSequenceNumber(prefix, existingNias);

  return `${prefix}.${nextSeq}`;
}

/**
 * Validasi keunikan NIA
 */
export function isNIAUnique(nia: string, existingNias: string[], currentMemberId?: string, membersList?: Array<{ id: string; nomorIndukAnggota: string }>): boolean {
  if (!nia) return false;
  const cleanNia = nia.trim();
  
  if (membersList && currentMemberId) {
    const duplicate = membersList.find(m => m.id !== currentMemberId && m.nomorIndukAnggota?.trim() === cleanNia);
    return !duplicate;
  }

  return !existingNias.some(existing => existing && existing.trim() === cleanNia);
}

/**
 * Format penjelasan pembacaan NIA
 */
export function parseNIADescription(nia: string): {
  valid: boolean;
  wilayah: string;
  cabang: string;
  tingkat: string;
  tahun: string;
  urutan: string;
} {
  const parts = (nia || '').split('.');
  if (parts.length >= 5) {
    const tingkatLabel = Object.keys(TINGKAT_CODES).find(k => TINGKAT_CODES[k] === parts[2]) || 'Tingkat ' + parts[2];
    return {
      valid: true,
      wilayah: 'PW Jawa Barat (10)',
      cabang: 'PC Kab. Cirebon (20)',
      tingkat: tingkatLabel,
      tahun: `20${parts[3]}`,
      urutan: `No. Urut: ${parts[4]}`
    };
  }
  return {
    valid: false,
    wilayah: '-',
    cabang: '-',
    tingkat: '-',
    tahun: '-',
    urutan: '-'
  };
}
