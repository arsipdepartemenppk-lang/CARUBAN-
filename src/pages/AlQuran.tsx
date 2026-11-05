import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Book, ArrowLeft, Play, Pause, Settings2, Info, Download, 
  CloudDownload, HelpCircle, Loader2, Volume2, Repeat, Repeat1, 
  QrCode, Copy, Check, Share2, Sparkles, BookOpen, ExternalLink, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { retry } from '../utils/errorHandling';
import { useToast } from '../components/Toast';
import { cn } from '../lib/utils';
import { getAsbabunNuzul } from '../services/asbabunNuzulService';
import { QuranQRModal, QuranQRScanner, QuranQRData } from '../components/QuranQRModal';

interface Surah {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_complex: string;
  name_simple?: string;
  name_arabic: string;
  verses_count: number;
  translated_name: {
    name: string;
  };
}

interface Verse {
  id: number;
  verse_number: number;
  verse_key: string;
  juz_number?: number;
  text_uthmani: string;
  text_uthmani_tajweed: string;
  translations: {
    text: string;
    resource_name: string;
  }[];
  audio: {
    url?: string;
    audio_url?: string;
    audio_file_url?: string;
  };
  asbabun_nuzul?: string;
  asbabun_nuzul_source?: string;
}

const RECITERS = [
  { id: 7, name: 'Mishary Rashid Alafasy', qiraah: 'Hafs an Asim' },
  { id: 1, name: 'AbdulBaset AbdulSamad', qiraah: 'Mujawwad' },
  { id: 2, name: 'AbdulBaset AbdulSamad', qiraah: 'Murattal' },
  { id: 6, name: 'Khalil Al-Husary', qiraah: 'Hafs an Asim' },
  { id: 12, name: 'Khalil Al-Husary', qiraah: 'Muallim' },
  { id: 8, name: 'Mohamed Siddiq al-Minshawi', qiraah: 'Mujawwad' },
  { id: 9, name: 'Mohamed Siddiq al-Minshawi', qiraah: 'Murattal' },
  { id: 3, name: 'Abdur-Rahman as-Sudais', qiraah: 'Hafs an Asim' },
  { id: 10, name: 'Saud al-Shuraim', qiraah: 'Hafs an Asim' },
  { id: 4, name: 'Abu Bakr al-Shatri', qiraah: 'Hafs an Asim' },
  { id: 5, name: 'Hani ar-Rifai', qiraah: 'Hafs an Asim' },
  { id: 11, name: 'Mohamed al-Tablawi', qiraah: 'Hafs an Asim' },
];

const fetchWithCache = async (url: string) => {
  try {
    const cache = await caches.open('quran-cache-v1');
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      return await cachedResponse.json();
    }
    
    if (!navigator.onLine) {
      throw new Error('OFFLINE');
    }

    const response = await fetch(url);
    if (response.ok) {
      if (response.status === 200) {
        try {
          cache.put(url, response.clone());
        } catch (e) {
          console.warn('Cache put failed:', e);
        }
      }
      return await response.json();
    }
    throw new Error('Network response was not ok');
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

const toArabicNumber = (num: number): string => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicDigits[parseInt(d, 10)] || d).join('');
};

const AlQuran: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [selectedReciterId, setSelectedReciterId] = useState(7);
  const [viewMode, setViewMode] = useState<'list' | 'mushaf'>('list');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [repeatMode, setRepeatMode] = useState<'none' | 'ayah' | 'surah'>('none');
  const [showTajwid, setShowTajwid] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [qariSearch, setQariSearch] = useState('');
  const [fontSize, setFontSize] = useState(40);
  const [verseFilter, setVerseFilter] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<{ total: number; current: number; label?: string } | null>(null);
  const [loadingAsbab, setLoadingAsbab] = useState<number | null>(null);
  const [copiedAsbabId, setCopiedAsbabId] = useState<number | null>(null);
  const [activeMushafAyah, setActiveMushafAyah] = useState<Verse | null>(null);

  // QR Code States
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalData, setQRModalData] = useState<QuranQRData | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [highlightedAyah, setHighlightedAyah] = useState<number | null>(null);

  const fetchAsbabunNuzul = async (verse: Verse) => {
    if (!selectedSurah) return;
    setLoadingAsbab(verse.id);
    try {
      const result = await getAsbabunNuzul(
        selectedSurah.id,
        verse.verse_number,
        selectedSurah.name_complex,
        verse.text_uthmani,
        verse.translations[0]?.text
      );
      
      setVerses(prev => prev.map(v => v.id === verse.id ? { 
        ...v, 
        asbabun_nuzul: result.text,
        asbabun_nuzul_source: result.source 
      } : v));
      showToast(`Asbabun Nuzul dimuat (${result.source})`, 'success');
    } catch (error: any) {
      console.error('Error fetching Asbabun Nuzul:', error);
      showToast('Gagal memuat Asbabun Nuzul', 'error');
    } finally {
      setLoadingAsbab(null);
    }
  };

  const handleOpenVerseQR = (verse: Verse) => {
    if (!selectedSurah) return;
    setQRModalData({
      surahId: selectedSurah.id,
      surahName: selectedSurah.name_complex,
      verseNumber: verse.verse_number,
      textArabic: verse.text_uthmani,
      translation: verse.translations[0]?.text
    });
    setShowQRModal(true);
  };

  const handleOpenSurahQR = (surah: Surah) => {
    setQRModalData({
      surahId: surah.id,
      surahName: surah.name_complex,
      translation: surah.translated_name.name
    });
    setShowQRModal(true);
  };

  const handleQRScanResult = (surahId: number, ayahNumber?: number) => {
    fetchVerses(surahId).then(() => {
      if (ayahNumber) {
        setHighlightedAyah(ayahNumber);
        setTimeout(() => {
          const el = document.getElementById(`ayah-${ayahNumber}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 600);
      }
    });
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const downloadAllSurahs = async () => {
    setDownloadProgress({ total: 114, current: 0, label: 'Mengunduh Daftar Surah...' });
    try {
      const cache = await caches.open('quran-cache-v1');
      const surahListUrl = 'https://api.quran.com/api/v4/chapters?language=id';
      const surahListRes = await fetch(surahListUrl);
      if (surahListRes.ok) {
        if (surahListRes.status === 200) {
          try {
            await cache.put(surahListUrl, surahListRes.clone());
          } catch (e) {
            console.warn('Cache put failed:', e);
          }
        }
        const data = await surahListRes.json();
        const chapters = data.chapters || [];
        
        setDownloadProgress({ total: chapters.length, current: 0, label: 'Mengunduh Teks Ayat...' });
        
        for (let i = 0; i < chapters.length; i++) {
          const surah = chapters[i];
          const perPage = surah.verses_count || 300;
          const versesUrl = `https://api.quran.com/api/v4/verses/by_chapter/${surah.id}?language=id&words=false&translations=33&fields=text_uthmani,text_uthmani_tajweed&per_page=${perPage}`;
          
          const cachedVerses = await cache.match(versesUrl);
          if (!cachedVerses) {
            const versesRes = await fetch(versesUrl);
            if (versesRes.ok && versesRes.status === 200) {
              try {
                await cache.put(versesUrl, versesRes.clone());
              } catch (e) {
                console.warn('Cache put failed:', e);
              }
            }
          }
          
          setDownloadProgress({ total: chapters.length, current: i + 1, label: `Mengunduh ${surah.name_complex}...` });
        }
        
        showToast('Seluruh teks Al-Qur\'an berhasil diunduh untuk offline', 'success');
      }
    } catch (error) {
      console.error('Download all error:', error);
      showToast('Gagal mengunduh Al-Qur\'an', 'error');
    } finally {
      setDownloadProgress(null);
    }
  };

  const downloadSurahAudio = async () => {
    if (!selectedSurah || verses.length === 0) return;
    
    setDownloadProgress({ total: verses.length, current: 0 });
    let current = 0;
    
    try {
      const cache = await caches.open('quran-audio-cache-v1');
      const chunkSize = 5;
      for (let i = 0; i < verses.length; i += chunkSize) {
        const chunk = (verses || []).slice(i, i + chunkSize);
        
        await Promise.all(chunk.map(async (verse) => {
          let url = typeof verse.audio === 'string' ? verse.audio : (verse.audio?.url || verse.audio?.audio_url || verse.audio?.audio_file_url);
          if (!url) return;
          
          const fullUrl = url.startsWith('http') 
            ? url 
            : url.startsWith('//') 
              ? `https:${url}` 
              : `https://audio.qurancdn.com/${url}`;
              
          const cachedResponse = await cache.match(fullUrl);
          if (!cachedResponse) {
            try {
              const response = await fetch(fullUrl);
              if (response.ok && response.status === 200) {
                try {
                  await cache.put(fullUrl, response.clone());
                } catch (e) {
                  console.warn('Cache put failed:', e);
                }
              }
            } catch (e) {
              console.error('Failed to cache audio:', e);
            }
          }
        }));
        
        current += chunk.length;
        setDownloadProgress({ total: verses.length, current: Math.min(current, verses.length) });
      }
      
      showToast('Surah berhasil diunduh untuk offline', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Gagal mengunduh surah', 'error');
    } finally {
      setDownloadProgress(null);
    }
  };

  const fetchSurahs = async () => {
    setLoading(true);
    try {
      const data = await retry(() => 
        fetchWithCache('https://api.quran.com/api/v4/chapters?language=id')
      );
      setSurahs(data.chapters);
    } catch (err) {
      console.error('Failed to fetch surahs:', err);
      showToast('Gagal memuat daftar surah. Pastikan Anda terhubung ke internet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurahs();
  }, []);

  const fetchVerses = async (chapterId: number) => {
    setLoading(true);
    try {
      let surah = surahs.find(s => s.id === chapterId);
      if (!surah) {
        try {
          const chData = await retry(() => fetchWithCache(`https://api.quran.com/api/v4/chapters/${chapterId}?language=id`));
          if (chData?.chapter) surah = chData.chapter;
        } catch (e) {
          console.warn('Fallback chapter fetch error', e);
        }
      }

      const perPage = surah?.verses_count || 300;
      const data = await retry(() => 
        fetchWithCache(`https://api.quran.com/api/v4/verses/by_chapter/${chapterId}?language=id&words=false&translations=33&fields=text_uthmani,text_uthmani_tajweed&per_page=${perPage}`)
      );
      
      if (!data.verses || data.verses.length === 0) {
        throw new Error('No verses found');
      }
      
      let audioMap = new Map();
      try {
        const audioData = await retry(() => 
          fetchWithCache(`https://api.quran.com/api/v4/recitations/${selectedReciterId}/by_chapter/${chapterId}?per_page=${perPage}`)
        );
        
        if (audioData.audio_files) {
          audioData.audio_files.forEach((file: any) => {
            audioMap.set(file.verse_key, file);
          });
        }
      } catch (audioError) {
        console.warn('Failed to fetch audio metadata, continuing without audio', audioError);
      }

      const combinedVerses = data.verses.map((v: any) => ({
        ...v,
        audio: audioMap.get(v.verse_key)
      }));

      setVerses(combinedVerses);
      setSelectedSurah(surah || null);
    } catch (error) {
      console.error('Error fetching verses:', error);
      showToast('Gagal memuat ayat. Pastikan Anda terhubung ke internet atau sudah mengunduh surah ini.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Deteksi tautan QR Code dari URL parameter (?surah=2&ayah=255)
  useEffect(() => {
    const surahParam = searchParams.get('surah');
    const ayahParam = searchParams.get('ayah');
    if (surahParam) {
      const sId = parseInt(surahParam, 10);
      if (!isNaN(sId) && sId >= 1 && sId <= 114) {
        fetchVerses(sId).then(() => {
          if (ayahParam) {
            const aNum = parseInt(ayahParam, 10);
            setHighlightedAyah(aNum);
            setTimeout(() => {
              const el = document.getElementById(`ayah-${aNum}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 600);
          }
        });
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedSurah) {
      fetchVerses(selectedSurah.id);
    }
  }, [selectedReciterId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleAudioEnded = () => {
    if (playingAudio === null) return;
    const currentIndex = verses.findIndex(v => v.id === playingAudio);
    
    if (repeatMode === 'ayah') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      let nextIndex = currentIndex + 1;
      while (nextIndex < verses.length && (!verses[nextIndex].audio || !(verses[nextIndex].audio.url || verses[nextIndex].audio.audio_url || verses[nextIndex].audio.audio_file_url))) {
        nextIndex++;
      }
      if (nextIndex < verses.length) {
        const nextVerse = verses[nextIndex];
        playAudio(nextVerse.audio, nextVerse.id);
      } else if (repeatMode === 'surah') {
        let firstIndex = 0;
        while (firstIndex < verses.length && (!verses[firstIndex].audio || !(verses[firstIndex].audio.url || verses[firstIndex].audio.audio_url || verses[firstIndex].audio.audio_file_url))) {
          firstIndex++;
        }
        if (firstIndex < verses.length) {
          const firstVerse = verses[firstIndex];
          playAudio(firstVerse.audio, firstVerse.id);
        } else {
          setPlayingAudio(null);
        }
      } else {
        setPlayingAudio(null);
      }
    }
  };

  const playAudio = async (audio: any, id: number) => {
    let url = typeof audio === 'string' ? audio : (audio?.url || audio?.audio_url || audio?.audio_file_url);
    if (!url) {
      showToast('Audio tidak tersedia untuk ayat ini', 'error');
      setPlayingAudio(null);
      return;
    }

    const fullUrl = url.startsWith('http') 
      ? url 
      : url.startsWith('//') 
        ? `https:${url}` 
        : `https://audio.qurancdn.com/${url}`;
        
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (playingAudio === id) {
      setPlayingAudio(null);
      return;
    }

    setPlayingAudio(id);
    
    try {
      const cache = await caches.open('quran-audio-cache-v1');
      let cachedResponse = await cache.match(fullUrl);
      let blobUrl = fullUrl;
      
      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        blobUrl = URL.createObjectURL(blob);
      } else if (navigator.onLine) {
        try {
          const response = await fetch(fullUrl);
          if (response.ok && response.status === 200) {
            try {
              await cache.put(fullUrl, response.clone());
            } catch (e) {
              console.warn('Cache put failed:', e);
            }
            const blob = await response.blob();
            blobUrl = URL.createObjectURL(blob);
          } else {
            throw new Error('Network response not ok');
          }
        } catch (e) {
          console.error('Audio fetch failed:', e);
          throw e;
        }
      } else {
        throw new Error('OFFLINE_NO_CACHE');
      }

      if (audioRef.current) {
        audioRef.current.src = blobUrl;
        audioRef.current.playbackRate = playbackSpeed;
        await audioRef.current.play();
      }
    } catch (error: any) {
      console.error('Audio playback failed:', error);
      showToast(error.message === 'OFFLINE_NO_CACHE' ? 'Audio belum diunduh. Silakan hubungkan internet.' : 'Gagal memutar audio', 'error');
      setPlayingAudio(null);
    }
  };

  const filteredSurahs = surahs.filter(s => 
    s.name_complex.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toString().includes(searchTerm)
  );

  const filteredVerses = verses.filter(v => {
    const searchLower = searchTerm.toLowerCase();
    const translationMatch = v.translations[0]?.text?.toLowerCase().includes(searchLower);
    const verseMatch = v.verse_number.toString() === searchTerm;
    const filterMatch = verseFilter === '' || v.verse_number.toString() === verseFilter;
    
    return (translationMatch || verseMatch || searchTerm === '') && filterMatch;
  });

  return (
    <div className="p-3 sm:p-4 pb-12 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] font-sans selection:bg-[var(--accent-primary)]/30">
      <audio ref={audioRef} onEnded={handleAudioEnded} onError={(e) => console.error('Audio element error:', e)} />
      
      {!selectedSurah ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mb-6 sm:mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter mb-1 sm:mb-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--bg-primary)] bg-clip-text text-transparent">Al-Qur'an Digital</h1>
              <p className="text-zinc-500 text-[10px] sm:text-sm uppercase tracking-widest font-bold">7 Qira'ah & Tajwid Akurat</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowScanner(true)}
                className="p-2 sm:p-3 bg-emerald-600/10 border border-emerald-500/30 rounded-xl sm:rounded-2xl text-emerald-400 hover:bg-emerald-600/20 transition-all flex items-center gap-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest backdrop-blur-sm shadow-sm"
                title="Pindai QR Code Ayat Al-Qur'an"
              >
                <QrCode size={14} className="sm:w-4 sm:h-4 text-emerald-400" />
                <span className="hidden xs:inline">Scan QR</span>
              </button>
              <button
                onClick={downloadAllSurahs}
                disabled={downloadProgress !== null}
                className="p-2 sm:p-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl sm:rounded-2xl text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 transition-all flex items-center gap-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest backdrop-blur-sm disabled:opacity-50"
                title="Download Semua Teks Surah"
              >
                {downloadProgress?.label?.includes('Surah') || downloadProgress?.label?.includes('Ayat') ? (
                  <div className="w-3 h-3 border-2 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full animate-spin" />
                ) : (
                  <CloudDownload size={14} className="sm:w-4 sm:h-4" />
                )}
                <span className="hidden xs:inline">Unduh Semua Teks</span>
              </button>
              <button
                onClick={() => window.open('https://dn790003.ca.archive.org/0/items/asbabunnuzul/Asbabun%20Nuzul.pdf', '_blank')}
                className="p-2 sm:p-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl sm:rounded-2xl text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 transition-all flex items-center gap-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest backdrop-blur-sm"
                title="Asbabun Nuzul PDF"
              >
                <Download size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Asbabun Nuzul</span>
              </button>
            </div>
          </div>

          {downloadProgress && downloadProgress.label && (
            <div className="mb-6 p-4 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-2xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)]">{downloadProgress.label}</span>
                <span className="text-[10px] font-black text-[var(--accent-primary)]">{Math.round((downloadProgress.current / downloadProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  className="bg-[var(--accent-primary)] h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
            <input
              type="text"
              placeholder="Cari Surah..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3.5 sm:py-4 pl-11 sm:pl-12 pr-4 text-xs sm:text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-all backdrop-blur-sm"
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full animate-spin" />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Memuat...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {filteredSurahs.map((surah) => (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  key={surah.id}
                  onClick={() => fetchVerses(surah.id)}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl sm:rounded-3xl hover:bg-zinc-800/50 transition-all group backdrop-blur-sm"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-800 flex items-center justify-center text-[var(--accent-primary)] font-black group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-all text-xs sm:text-base">
                    {surah.id}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="font-bold text-white text-xs sm:text-sm truncate">{surah.name_complex}</h3>
                    <p className="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-wider truncate">{surah.translated_name.name} • {surah.verses_count} Ayat</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg sm:text-xl font-arabic text-[var(--accent-primary)]">{surah.name_arabic}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8 sticky top-0 bg-black/80 backdrop-blur-md py-3 sm:py-4 z-10">
            <button onClick={() => setSelectedSurah(null)} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl font-black truncate">{selectedSurah.name_complex}</h1>
              <p className="text-[8px] sm:text-xs text-zinc-500 uppercase tracking-widest truncate">{selectedSurah.translated_name.name}</p>
            </div>
            <button 
              onClick={() => {
                if (playingAudio !== null) {
                  if (audioRef.current) audioRef.current.pause();
                  setPlayingAudio(null);
                } else if (verses.length > 0) {
                  let firstIndex = 0;
                  while (firstIndex < verses.length && (!verses[firstIndex].audio || !(verses[firstIndex].audio.url || verses[firstIndex].audio.audio_url || verses[firstIndex].audio.audio_file_url))) {
                    firstIndex++;
                  }
                  if (firstIndex < verses.length) {
                    const firstVerse = verses[firstIndex];
                    if (firstVerse.audio) {
                      playAudio(firstVerse.audio, firstVerse.id);
                    }
                  } else {
                    showToast('Audio tidak tersedia untuk surah ini', 'error');
                  }
                }
              }}
              className="p-2.5 sm:p-3 bg-[var(--accent-primary)] text-white rounded-xl sm:rounded-2xl hover:bg-[var(--bg-primary)] transition-all shadow-lg shadow-[var(--accent-primary)]/20"
            >
              {playingAudio !== null ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
            </button>
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 items-center gap-0.5 sm:gap-1">
              {downloadProgress !== null ? (
                <div className="px-2 py-1.5 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full animate-spin" />
                  <span className="text-[8px] font-bold text-[var(--accent-primary)]">{Math.round((downloadProgress.current / downloadProgress.total) * 100)}%</span>
                </div>
              ) : (
                <button 
                  onClick={downloadSurahAudio}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-all"
                  title="Unduh Audio untuk Offline"
                >
                  <CloudDownload size={14} />
                </button>
              )}
              <div className="w-px h-4 bg-zinc-800 mx-0.5 sm:mx-1" />
              <button 
                onClick={() => selectedSurah && handleOpenSurahQR(selectedSurah)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 transition-all"
                title="Kode QR Surah Ini"
              >
                <QrCode size={14} />
              </button>
              <div className="w-px h-4 bg-zinc-800 mx-0.5 sm:mx-1" />
              <button 
                onClick={() => window.open('https://dn790003.ca.archive.org/0/items/asbabunnuzul/Asbabun%20Nuzul.pdf', '_blank')}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-[var(--accent-primary)] transition-all"
                title="Asbabun Nuzul PDF"
              >
                <Book size={14} />
              </button>
              <div className="w-px h-4 bg-zinc-800 mx-0.5 sm:mx-1" />
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg transition-all ${
                  showSettings ? 'bg-[var(--accent-primary)] text-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <Settings2 size={14} />
              </button>
              <div className="w-px h-4 bg-zinc-800 mx-0.5 sm:mx-1" />
              <button 
                onClick={() => setViewMode('list')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[7px] sm:text-[8px] font-black uppercase tracking-widest transition-all ${
                  viewMode === 'list' ? 'bg-[var(--accent-primary)] text-white' : 'text-zinc-500'
                }`}
              >
                List
              </button>
              <button 
                onClick={() => setViewMode('mushaf')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-[7px] sm:text-[8px] font-black uppercase tracking-widest transition-all ${
                  viewMode === 'mushaf' ? 'bg-[var(--accent-primary)] text-white' : 'text-zinc-500'
                }`}
              >
                Mushaf
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-6 backdrop-blur-md">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Pilih Qari (7 Qira'ah & Lainnya)</label>
                      <div className="relative w-40">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600" size={12} />
                        <input 
                          type="text" 
                          placeholder="Cari Qari..." 
                          value={qariSearch}
                          onChange={(e) => setQariSearch(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1 pl-7 pr-2 text-[10px] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {RECITERS.filter(r => r.name.toLowerCase().includes(qariSearch.toLowerCase())).map((reciter) => (
                        <button
                          key={reciter.id}
                          onClick={() => setSelectedReciterId(reciter.id)}
                          className={`flex flex-col items-start p-3 rounded-2xl border transition-all ${
                            selectedReciterId === reciter.id 
                              ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]' 
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <span className="text-xs font-bold">{reciter.name}</span>
                          <span className="text-[9px] opacity-70 uppercase tracking-tighter">{reciter.qiraah}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Kecepatan</label>
                      <div className="flex gap-2">
                        {[0.5, 1, 1.5, 2].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                              playbackSpeed === speed 
                                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white' 
                                : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Mode Ulang</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRepeatMode(repeatMode === 'ayah' ? 'none' : 'ayah')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1 ${
                            repeatMode === 'ayah' ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                          }`}
                        >
                          <Repeat1 size={12} /> Ayah
                        </button>
                        <button
                          onClick={() => setRepeatMode(repeatMode === 'surah' ? 'none' : 'surah')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1 ${
                            repeatMode === 'surah' ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                          }`}
                        >
                          <Repeat size={12} /> Surah
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
                          <Info size={16} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block">Tampilkan Tajwid</span>
                          <span className="text-[8px] text-zinc-500 uppercase tracking-tighter">Indikator Warna & Bold</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowTajwid(!showTajwid)}
                        className={`w-12 h-6 rounded-full transition-all relative ${showTajwid ? 'bg-[var(--accent-primary)]' : 'bg-zinc-800'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showTajwid ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    {showTajwid && (
                      <div className="p-3 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                        <label className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 block">Legenda Tajwid</label>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#ff0000]" /><span className="text-[7px] text-zinc-500 uppercase">Ghunnah</span></div>
                          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#ff8000]" /><span className="text-[7px] text-zinc-500 uppercase">Ikhfa</span></div>
                          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#008000]" /><span className="text-[7px] text-zinc-500 uppercase">Idgham</span></div>
                          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#0000ff]" /><span className="text-[7px] text-zinc-500 uppercase">Iqlab</span></div>
                          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#800080]" /><span className="text-[7px] text-zinc-500 uppercase">Qalqalah</span></div>
                          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#ff00ff]" /><span className="text-[7px] text-zinc-500 uppercase">Madda</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl sm:rounded-[32px] flex flex-col gap-4 sm:gap-6 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <input
                type="text"
                placeholder="Cari ayat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-[120px] bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 sm:px-4 text-[10px] sm:text-xs text-white"
              />
              <input
                type="number"
                placeholder="#"
                value={verseFilter}
                onChange={(e) => setVerseFilter(e.target.value)}
                className="w-14 sm:w-20 bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 sm:px-4 text-[10px] sm:text-xs text-white"
              />
              <div className="flex items-center gap-2 flex-1 min-w-[100px]">
                <span className="text-[8px] text-zinc-500 font-bold uppercase">Size</span>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1 accent-[var(--accent-primary)] h-1"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full animate-spin" />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Memuat...</p>
            </div>
          ) : (
            viewMode === 'list' ? (
              <div className="space-y-8 sm:space-y-12">
                {selectedSurah?.bismillah_pre && (
                  <div className="text-center mb-6 sm:mb-8 text-3xl sm:text-4xl font-arabic text-[var(--accent-primary)]">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </div>
                )}
                {filteredVerses.map((verse) => (
                  <motion.div 
                    key={verse.id} 
                    id={`ayah-${verse.verse_number}`}
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className={cn(
                      "space-y-4 sm:space-y-6 border-b border-zinc-900 pb-8 sm:pb-12 last:border-0 p-3 sm:p-5 rounded-3xl transition-all duration-500",
                      highlightedAyah === verse.verse_number && "bg-emerald-500/10 border-2 border-emerald-500/50 shadow-xl shadow-emerald-500/10"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-zinc-900 flex items-center justify-center text-[10px] sm:text-xs font-black text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 shadow-sm">
                        {verse.verse_number}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenVerseQR(verse)}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-zinc-900 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 border border-zinc-800 flex items-center justify-center transition-all shadow-sm"
                          title="Kode QR & Bagikan Ayat"
                        >
                          <QrCode size={15} />
                        </button>
                        <button
                          onClick={() => verse.audio && playAudio(verse.audio, verse.id)}
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
                            playingAudio === verse.id ? 'bg-[var(--bg-primary)] text-white' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                          }`}
                          title={playingAudio === verse.id ? "Jeda Audio" : "Putar Audio Ayat"}
                        >
                          {playingAudio === verse.id ? <Pause size={16} fill="white" /> : <Volume2 size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="text-2xl sm:text-4xl text-right font-arabic leading-[2.5] mb-4 sm:mb-6 text-[var(--text-main)]" dir="rtl" style={{ fontSize: `${fontSize}px` }}>
                      {showTajwid ? (
                        <span dangerouslySetInnerHTML={{ __html: verse.text_uthmani_tajweed }} />
                      ) : (
                        <span>{verse.text_uthmani}</span>
                      )}
                    </div>

                    <div className="p-3 sm:p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-medium">
                        {verse.translations[0]?.text.replace(/<[^>]*>?/gm, '')}
                      </p>
                    </div>

                    <div className="mt-4">
                      {!verse.asbabun_nuzul ? (
                        <button
                          onClick={() => fetchAsbabunNuzul(verse)}
                          disabled={loadingAsbab === verse.id}
                          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/25 transition-all disabled:opacity-50 shadow-sm"
                        >
                          {loadingAsbab === verse.id ? (
                            <Loader2 size={13} className="animate-spin text-emerald-400" />
                          ) : (
                            <BookOpen size={13} className="text-emerald-400" />
                          )}
                          <span>{loadingAsbab === verse.id ? 'Menggali Asbabun Nuzul...' : 'Lihat Asbabun Nuzul'}</span>
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 sm:p-5 bg-gradient-to-br from-emerald-950/30 via-zinc-900/70 to-zinc-950/90 border border-emerald-500/30 rounded-2xl sm:rounded-3xl shadow-lg space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                            <div className="flex items-center gap-2">
                              <BookOpen size={15} className="text-emerald-400" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                Asbabun Nuzul & Latar Belakang
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {verse.asbabun_nuzul_source && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                                  {verse.asbabun_nuzul_source}
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  if (!selectedSurah) return;
                                  navigator.clipboard.writeText(`Asbabun Nuzul QS. ${selectedSurah.name_complex} Ayat ${verse.verse_number}:\n\n${verse.asbabun_nuzul}`);
                                  setCopiedAsbabId(verse.id);
                                  showToast('Asbabun Nuzul disalin ke clipboard', 'success');
                                  setTimeout(() => setCopiedAsbabId(null), 2000);
                                }}
                                className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
                                title="Salin Asbabun Nuzul"
                              >
                                {copiedAsbabId === verse.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                              </button>
                              <button
                                onClick={() => setVerses(prev => prev.map(v => v.id === verse.id ? { ...v, asbabun_nuzul: undefined } : v))}
                                className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                                title="Tutup Asbabun Nuzul"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal whitespace-pre-line">
                            {verse.asbabun_nuzul}
                          </p>

                          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[9px] text-zinc-500">
                            <span>Rujukan: Lubabun Nuqul (As-Suyuti) & Kemenag RI</span>
                            <button
                              onClick={() => window.open('https://dn790003.ca.archive.org/0/items/asbabunnuzul/Asbabun%20Nuzul.pdf', '_blank')}
                              className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                            >
                              <span>Buka Kitab PDF</span>
                              <ExternalLink size={10} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Authentic Mushaf Rasm Utsmani Frame */}
                <div className="bg-[#FFFDF7] text-[#1A1A1A] border-4 border-[#C29D59]/70 rounded-[28px] sm:rounded-[36px] p-2.5 sm:p-5 shadow-2xl relative overflow-hidden select-text">
                  {/* Subtle Ornamental Background Filigree */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#1E6247_1px,transparent_1px)] [background-size:16px_16px]" />

                  {/* Inner Decorative Islamic Border */}
                  <div className="border-2 border-[#1E6247]/60 rounded-[22px] sm:rounded-[28px] p-4 sm:p-8 bg-[#FFFEFC] relative">
                    {/* Ornamental Corner Motifs */}
                    <div className="absolute top-2 left-2 text-[#C29D59] text-base select-none pointer-events-none">۞</div>
                    <div className="absolute top-2 right-2 text-[#C29D59] text-base select-none pointer-events-none">۞</div>
                    <div className="absolute bottom-2 left-2 text-[#C29D59] text-base select-none pointer-events-none">۞</div>
                    <div className="absolute bottom-2 right-2 text-[#C29D59] text-base select-none pointer-events-none">۞</div>

                    {/* Top Mushaf Page Header Bar (Kop Halaman Mushaf) */}
                    <div className="flex items-center justify-between pb-3.5 mb-5 border-b-2 border-[#D4AF37]/40 text-[#1E6247] text-xs sm:text-sm font-semibold select-none px-2">
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <span className="font-bold text-[#1E6247]">
                          سُوْرَةُ {selectedSurah?.name_arabic}
                        </span>
                      </div>
                      <div className="px-3 py-0.5 rounded-full bg-[#1E6247]/10 border border-[#1E6247]/30 text-[#1E6247] font-bold text-xs">
                        مُصْحَفُ الرَّسْمِ العُثْمَانِيِّ
                      </div>
                      <div className="text-zinc-600 text-xs sm:text-sm">
                        <span>{selectedSurah?.revelation_place === 'makkah' ? 'مَكِّيَّةٌ' : 'مَدَنِيَّةٌ'} • {selectedSurah?.verses_count} آيَةً</span>
                      </div>
                    </div>

                    {/* Ornate Surah Header Band (Kepala Surah Rasm Utsmani) */}
                    {selectedSurah && (
                      <div className="mb-6 relative">
                        <div className="mx-auto max-w-xl bg-gradient-to-r from-[#174634] via-[#21674E] to-[#174634] border-2 border-[#D4AF37] rounded-2xl py-3 px-6 text-center shadow-md relative overflow-hidden">
                          {/* Inner gold frame line */}
                          <div className="absolute inset-1 border border-[#D4AF37]/50 rounded-xl pointer-events-none" />
                          <div className="relative z-10">
                            <span className="text-[#F3E5AB] text-[10px] sm:text-xs font-bold tracking-widest uppercase block mb-0.5">
                              {selectedSurah.name_complex} • Surah Ke-{selectedSurah.id}
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-bold text-[#FFF8DC] font-utsmani tracking-wide">
                              سُوْرَةُ {selectedSurah.name_arabic}
                            </h3>
                            <div className="flex items-center justify-center gap-2 mt-1 text-[11px] text-[#E2D29D]">
                              <span>{selectedSurah.revelation_place === 'makkah' ? 'Makkiyyah' : 'Madaniyyah'}</span>
                              <span>•</span>
                              <span>{selectedSurah.verses_count} Ayat</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ornate Bismillah Cartouche */}
                    {selectedSurah?.bismillah_pre && (
                      <div className="text-center my-6 sm:my-8">
                        <div className="inline-block px-8 py-2.5 rounded-full bg-[#FBF7ED] border border-[#D4AF37]/60 shadow-sm">
                          <span className="text-2xl sm:text-4xl text-[#174634] font-utsmani tracking-wider font-semibold">
                            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Continuous Rasm Utsmani Text Flow */}
                    <div 
                      className="text-justify font-utsmani leading-[3.6] sm:leading-[4.2] text-[#222222] select-text" 
                      dir="rtl" 
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {filteredVerses.map((verse) => {
                        const isPlaying = playingAudio === verse.id;
                        const isSelected = activeMushafAyah?.id === verse.id;

                        return (
                          <span 
                            key={verse.id} 
                            onClick={() => {
                              setActiveMushafAyah(verse);
                              playAudio(verse.audio, verse.id);
                            }}
                            className={`group inline cursor-pointer transition-all rounded-lg px-1 py-0.5 ${
                              isPlaying 
                                ? 'bg-emerald-500/20 text-[#124430] font-semibold' 
                                : isSelected 
                                  ? 'bg-amber-500/15' 
                                  : 'hover:bg-amber-500/10'
                            }`}
                            title={`Ayat ${verse.verse_number} (Klik untuk dengar & lihat arti)`}
                          >
                            {showTajwid ? (
                              <span dangerouslySetInnerHTML={{ __html: verse.text_uthmani_tajweed }} />
                            ) : (
                              <span>{verse.text_uthmani}</span>
                            )}
                            
                            {/* Authentic Utsmani End of Ayah Medallion */}
                            <span className="inline-flex items-center justify-center relative mx-1.5 sm:mx-2 align-middle select-none">
                              <span className={`inline-flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 transition-all shadow-sm ${
                                isPlaying 
                                  ? 'bg-[#1E6247] border-amber-300 text-white shadow-emerald-500/40 scale-110' 
                                  : 'bg-gradient-to-br from-[#FFF9E6] to-[#F1DFC0] border-[#C29D59] text-[#1E6247] group-hover:border-[#1E6247]'
                              }`}>
                                <span className="text-[11px] sm:text-[13px] font-bold font-arabic pt-0.5">
                                  {toArabicNumber(verse.verse_number)}
                                </span>
                              </span>
                            </span>
                          </span>
                        );
                      })}
                    </div>

                    {/* Mushaf Page Footer */}
                    <div className="mt-8 pt-4 border-t-2 border-[#D4AF37]/30 flex flex-col sm:flex-row items-center justify-between text-xs text-[#1E6247] font-medium gap-2 select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#1E6247]" />
                        <span>Rasm Utsmani Standar Madinah / Kemenag RI</span>
                      </div>
                      <span className="text-zinc-500 text-[11px]">
                        Petunjuk: Klik pada ayat untuk mendengarkan bacaan & terjemahan
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Drawer / Translation Box for Selected Ayah */}
                <AnimatePresence>
                  {activeMushafAyah && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] shadow-xl relative"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                            {activeMushafAyah.verse_number}
                          </span>
                          <div>
                            <h4 className="text-xs sm:text-sm font-black text-[var(--text-main)]">
                              Surah {selectedSurah?.name_complex} • Ayat {activeMushafAyah.verse_number}
                            </h4>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              Terjemahan Resmi Kementerian Agama RI
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => playAudio(activeMushafAyah.audio, activeMushafAyah.id)}
                            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-all"
                          >
                            <Play size={14} className={playingAudio === activeMushafAyah.id ? 'animate-pulse' : ''} />
                            <span className="hidden sm:inline">
                              {playingAudio === activeMushafAyah.id ? 'Memutar' : 'Putar'}
                            </span>
                          </button>
                          <button
                            onClick={() => fetchAsbabunNuzul(activeMushafAyah)}
                            disabled={loadingAsbab === activeMushafAyah.id}
                            className="p-2 rounded-xl bg-[var(--bg-app)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-emerald-400 text-xs font-bold flex items-center gap-1 transition-all"
                            title="Buka Asbabun Nuzul"
                          >
                            <BookOpen size={14} />
                            <span className="hidden sm:inline">Asbabun Nuzul</span>
                          </button>
                          <button
                            onClick={() => setActiveMushafAyah(null)}
                            className="p-2 rounded-xl bg-[var(--bg-app)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-white transition-all"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="pt-3 space-y-2">
                        <p className="text-right text-lg sm:text-xl font-utsmani text-emerald-400 leading-loose" dir="rtl">
                          {activeMushafAyah.text_uthmani}
                        </p>
                        <p className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed italic">
                          "{activeMushafAyah.translations?.[0]?.text?.replace(/<[^>]*>?/gm, '')}"
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          )}
        </motion.div>
      )}

      {/* Modal QR Code Display */}
      <QuranQRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        data={qrModalData}
      />

      {/* Modal QR Code Scanner */}
      <QuranQRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanResult={handleQRScanResult}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Scheherazade+New:wght@400;700&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        .font-arabic, .font-utsmani {
          font-family: 'Amiri Quran', 'Scheherazade New', 'Amiri', serif;
        }
        tajweed { display: inline; }
        .ghunnah { color: #d97706; font-weight: bold; }
        .ikhafa, .ikhfa { color: #dc2626; font-weight: bold; }
        .ikhafa_shafawi { color: #dc2626; font-weight: bold; }
        .idgham_shafawi { color: #059669; font-weight: bold; }
        .iqlab { color: #2563eb; font-weight: bold; }
        .idgham_with_ghunnah, .idgham_bighunnah { color: #7c3aed; font-weight: bold; }
        .idgham_without_ghunnah, .idgham_bilaghunnah { color: #ca8a04; font-weight: bold; }
        .idgham_mutajanisayn { color: #b91c1c; font-weight: bold; }
        .idgham_mutaqaribayn { color: #b91c1c; font-weight: bold; }
        .qalaqah, .qalqalah { color: #b45309; font-weight: bold; }
        .madda_normal { color: #0284c7; font-weight: bold; }
        .madda_permissible { color: #16a34a; font-weight: bold; }
        .madda_necessity { color: #9333ea; font-weight: bold; }
        .madda_obligatory { color: #0284c7; font-weight: bold; }
        .madda_drop { color: #9ca3af; }
        .slnt { color: #9ca3af; }
        .ham_wasl, .hamzat_wasl { color: #9ca3af; }
        .laam_shamsiyah { color: #9ca3af; }
        .lam_jalalah { color: #db2777; font-weight: bold; }
      `}</style>
    </div>
  );
};

export default AlQuran;
