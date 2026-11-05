/**
 * Layanan Asbabun Nuzul Al-Qur'an
 * Menggabungkan analisis kitab Lubabun Nuqul fi Asbabin Nuzul (Imam As-Suyuti),
 * Asbabun Nuzul Imam Al-Wahidi, Tafsir Kemenag RI, dan AI Gemini dengan caching offline.
 */

export interface AsbabunNuzulResult {
  text: string;
  source: 'Imam As-Suyuti (AI)' | 'Tafsir Kemenag RI' | 'Konteks Surah';
  surahNumber: number;
  verseNumber: number;
  surahName: string;
}

const CACHE_NAME = 'asbabun-nuzul-cache-v1';

/**
 * Mengambil teks Asbabun Nuzul dari cache lokal jika pernah dimuat
 */
async function getFromCache(surahNumber: number, verseNumber: number): Promise<AsbabunNuzulResult | null> {
  try {
    const key = `asbab_${surahNumber}_${verseNumber}`;
    const local = localStorage.getItem(key);
    if (local) {
      return JSON.parse(local);
    }
  } catch (e) {
    console.warn('Gagal membaca cache lokal Asbabun Nuzul:', e);
  }
  return null;
}

/**
 * Menyimpan teks Asbabun Nuzul ke cache lokal
 */
function saveToCache(surahNumber: number, verseNumber: number, data: AsbabunNuzulResult): void {
  try {
    const key = `asbab_${surahNumber}_${verseNumber}`;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Gagal menyimpan cache Asbabun Nuzul:', e);
  }
}

/**
 * Mengambil konteks tafsir & asbabun nuzul dari API Kemenag RI (equran.id)
 */
async function fetchFromKemenag(surahNumber: number, verseNumber: number, surahName: string): Promise<string | null> {
  try {
    const response = await fetch(`https://equran.id/api/v2/tafsir/${surahNumber}`);
    if (response.ok) {
      const json = await response.json();
      if (json.data && json.data.tafsir) {
        const item = json.data.tafsir.find((t: any) => t.ayat === verseNumber);
        if (item && item.teks) {
          // Potong teks jika terlalu panjang agar nyaman dibaca
          const fullText = item.teks.trim();
          return fullText;
        }
      }
    }
  } catch (err) {
    console.warn('Kemenag Tafsir API error:', err);
  }
  return null;
}

/**
 * Fungsi utama untuk mendapatkan Asbabun Nuzul ayat
 */
export async function getAsbabunNuzul(
  surahNumber: number,
  verseNumber: number,
  surahName: string,
  verseArabic?: string,
  translationText?: string
): Promise<AsbabunNuzulResult> {
  // 1. Periksa cache terlebih dahulu
  const cached = await getFromCache(surahNumber, verseNumber);
  if (cached && cached.text) {
    return cached;
  }

  // 2. Coba menggunakan Gemini API melalui server-side endpoint
  if (navigator.onLine) {
    try {
      const response = await fetch('/api/gemini/asbabun-nuzul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surahNumber,
          verseNumber,
          surahName,
          verseArabic,
          translationText
        })
      });

      if (response.ok) {
        const json = await response.json();
        const text = json.text;
        if (text && text.trim().length > 20) {
          const result: AsbabunNuzulResult = {
            text: text.trim(),
            source: 'Imam As-Suyuti (AI)',
            surahNumber,
            verseNumber,
            surahName
          };
          saveToCache(surahNumber, verseNumber, result);
          return result;
        }
      }
    } catch (aiErr: any) {
      console.warn('Server Asbabun Nuzul error, mencoba fallback ke Kemenag RI:', aiErr?.message || aiErr);
    }
  }

  // 3. Fallback ke API Kemenag RI
  if (navigator.onLine) {
    const kemenagText = await fetchFromKemenag(surahNumber, verseNumber, surahName);
    if (kemenagText) {
      const result: AsbabunNuzulResult = {
        text: kemenagText,
        source: 'Tafsir Kemenag RI',
        surahNumber,
        verseNumber,
        surahName
      };
      saveToCache(surahNumber, verseNumber, result);
      return result;
    }
  }

  // 4. Fallback jika offline dan belum tercache
  const fallbackResult: AsbabunNuzulResult = {
    text: `Surah ${surahName} ayat ${verseNumber} merupakan bagian dari petunjuk agung Al-Qur'an. Ayat ini menerangkan ketetapan dan hikmah Ilahi yang diturunkan kepada Rasulullah SAW untuk membimbing umat manusia. Untuk telaah riwayat sabab nuzul lengkap secara offline, Anda dapat membuka dokumen rujukan Kitab Asbabun Nuzul melalui tombol PDF di atas.`,
    source: 'Konteks Surah',
    surahNumber,
    verseNumber,
    surahName
  };
  return fallbackResult;
}
