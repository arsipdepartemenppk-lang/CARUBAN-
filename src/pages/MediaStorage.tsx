import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Camera, Video, Image as ImageIcon, Upload, Search, Filter, 
  Trash2, Download, Share2, Eye, Plus, Folder, Tag, Calendar, 
  User, Check, X, Maximize2, Minimize2, ZoomIn, ZoomOut, 
  RotateCw, Play, Pause, Volume2, HardDrive, Sparkles, Layers,
  ExternalLink, Edit2, AlertCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirebase } from '../components/FirebaseProvider';
import { useToast } from '../components/Toast';
import { 
  MediaStorageItem, 
  MEDIA_FOLDERS, 
  subscribeMediaItems, 
  uploadMediaStorageItem, 
  deleteMediaStorageItem, 
  updateMediaStorageItem,
  recordMediaAccess 
} from '../services/mediaStorageService';
import { cn } from '../lib/utils';
import { formatDisplayDate } from '../utils/dateUtils';

export default function MediaStorage() {
  const { user, userData, role } = useFirebase();
  const { showToast } = useToast();

  const [mediaItems, setMediaItems] = useState<MediaStorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string>('Semua');
  const [activeType, setActiveType] = useState<'all' | 'photo' | 'video'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size' | 'name'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaStorageItem | null>(null);
  const [editingMedia, setEditingMedia] = useState<MediaStorageItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Upload Form states
  const [uploadFiles, setUploadFiles] = useState<{ file: File; title: string; folder: string; tags: string; progress: number }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera Capture states
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [capturedBlob, setCapturedBlob] = useState<{ blob: Blob; type: 'photo' | 'video'; previewUrl: string } | null>(null);
  const [capturedTitle, setCapturedTitle] = useState('');
  const [capturedFolder, setCapturedFolder] = useState<string>(MEDIA_FOLDERS[0]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Lightbox Zoom & Rotate
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Realtime subscription
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeMediaItems(
      (items) => {
        setMediaItems(items);
        setLoading(false);
      },
      activeFolder,
      activeType
    );
    return () => unsubscribe();
  }, [activeFolder, activeType]);

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = mediaItems.length;
    const photos = mediaItems.filter(m => m.fileType === 'photo').length;
    const videos = mediaItems.filter(m => m.fileType === 'video').length;
    const totalSize = mediaItems.reduce((acc, m) => acc + (m.fileSize || 0), 0);
    return { total, photos, videos, totalSize };
  }, [mediaItems]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return mediaItems
      .filter(item => {
        const matchesSearch = 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (item.uploaderName && item.uploaderName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
        return matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'size') return (b.fileSize || 0) - (a.fileSize || 0);
        if (sortBy === 'name') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [mediaItems, searchQuery, sortBy]);

  // Handle files selected for upload
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' '),
        folder: activeFolder !== 'Semua' ? activeFolder : 'Dokumentasi Acara',
        tags: '',
        progress: 0
      }));
      setUploadFiles(prev => [...prev, ...newFiles]);
      setIsUploadModalOpen(true);
    }
  };

  // Process batch uploads
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || uploadFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < uploadFiles.length; i++) {
      const item = uploadFiles[i];
      try {
        const tagsArray = item.tags.split(',').map(t => t.trim()).filter(Boolean);
        await uploadMediaStorageItem(
          item.file,
          {
            title: item.title,
            folder: item.folder,
            tags: tagsArray
          },
          {
            uid: user.uid,
            displayName: userData?.displayName || user.displayName || user.email,
            email: user.email
          },
          (progress) => {
            setUploadFiles(prev => {
              const updated = [...prev];
              if (updated[i]) updated[i].progress = progress;
              return updated;
            });
          }
        );
        successCount++;
      } catch (err: any) {
        console.error('Error uploading item:', err);
        showToast(`Gagal mengunggah ${item.title}: ${err.message}`, 'error');
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      showToast(`Berhasil menyimpan ${successCount} file ke penyimpanan`, 'success');
      setUploadFiles([]);
      setIsUploadModalOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start Camera
  const startCamera = async (mode: 'photo' | 'video' = cameraMode) => {
    setCameraMode(mode);
    setCapturedBlob(null);
    setRecordedChunks([]);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        showToast('Kamera tidak didukung di peramban ini. Gunakan fitur Unggah File.', 'info');
        return;
      }
      const constraints: MediaStreamConstraints = {
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === 'video'
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setIsCameraModalOpen(true);
    } catch (err: any) {
      console.warn('Camera access notice:', err);
      const msg = String(err?.message || err?.name || err);
      if (msg.includes('Timeout') || err?.name === 'AbortError') {
        showToast('Koneksi kamera timeout. Anda dapat menggunakan opsi Unggah File Foto & Video.', 'info');
      } else if (err?.name === 'NotAllowedError') {
        showToast('Izin kamera ditolak. Harap izinkan akses kamera di browser Anda.', 'error');
      } else {
        showToast('Gagal mengakses kamera. Silakan gunakan tombol Unggah File.', 'info');
      }
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (cameraStream) {
      try {
        cameraStream.getTracks().forEach(t => t.stop());
      } catch {}
      setCameraStream(null);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVideo(false);
    setRecordingSeconds(0);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Take photo from stream
  const capturePhoto = () => {
    if (!videoPreviewRef.current) return;
    const video = videoPreviewRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const previewUrl = URL.createObjectURL(blob);
          setCapturedBlob({ blob, type: 'photo', previewUrl });
          setCapturedTitle(`Foto_${new Date().toISOString().slice(0, 10)}`);
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Start video recording
  const startRecording = () => {
    if (!cameraStream) return;
    setRecordedChunks([]);
    try {
      const mediaRecorder = new MediaRecorder(cameraStream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          setRecordedChunks(prev => [...prev, e.data]);
        }
      };
      mediaRecorder.onstop = () => {
        // Will handle in handleFinishRecording
      };
      mediaRecorder.start(1000);
      setIsRecordingVideo(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (e: any) {
      showToast('Gagal merekam video: ' + e.message, 'error');
    }
  };

  // Stop video recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingVideo) {
      mediaRecorderRef.current.stop();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecordingVideo(false);

      setTimeout(() => {
        const fullBlob = new Blob(recordedChunks, { type: 'video/webm' });
        const previewUrl = URL.createObjectURL(fullBlob);
        setCapturedBlob({ blob: fullBlob, type: 'video', previewUrl });
        setCapturedTitle(`Video_${new Date().toISOString().slice(0, 10)}`);
        stopCamera();
      }, 500);
    }
  };

  // Save captured photo/video
  const handleSaveCapturedMedia = async () => {
    if (!capturedBlob || !user) return;
    setIsUploading(true);
    try {
      await uploadMediaStorageItem(
        capturedBlob.blob,
        {
          title: capturedTitle || (capturedBlob.type === 'photo' ? 'Foto Dokumentasi' : 'Video Dokumentasi'),
          folder: capturedFolder,
          tags: ['kamera', capturedBlob.type]
        },
        {
          uid: user.uid,
          displayName: userData?.displayName || user.displayName || user.email,
          email: user.email
        }
      );
      showToast(`${capturedBlob.type === 'photo' ? 'Foto' : 'Video'} berhasil disimpan!`, 'success');
      setCapturedBlob(null);
      setIsCameraModalOpen(false);
    } catch (err: any) {
      showToast('Gagal menyimpan hasil tangkapan: ' + err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Delete Media
  const handleDeleteMedia = async (id: string) => {
    try {
      await deleteMediaStorageItem(id);
      showToast('File media berhasil dihapus', 'success');
      setDeleteConfirmId(null);
      if (selectedMedia?.id === id) setSelectedMedia(null);
    } catch (err: any) {
      showToast('Gagal menghapus media: ' + err.message, 'error');
    }
  };

  // Handle Edit Metadata Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedia) return;
    try {
      await updateMediaStorageItem(editingMedia.id, {
        title: editingMedia.title,
        description: editingMedia.description,
        folder: editingMedia.folder,
        tags: editingMedia.tags
      });
      showToast('Metadata berhasil diperbarui', 'success');
      setEditingMedia(null);
    } catch (err: any) {
      showToast('Gagal memperbarui metadata: ' + err.message, 'error');
    }
  };

  // Copy shareable link
  const handleShareLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Tautan media berhasil disalin ke clipboard!', 'success');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[var(--bg-app)] text-[var(--text-main)] space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <HardDrive size={13} /> Cloud Vault & Storage
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400">
              Foto & Video Realtime
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <Layers className="text-emerald-400" />
            Penyimpanan Media & Dokumentasi
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-2xl">
            Pusat penyimpanan arsip foto dan video kegiatan IPNU secara terpusat, aman, dan mudah diakses oleh pimpinan serta anggota.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg active:scale-95 transition-all"
          >
            <Upload size={16} /> Unggah Foto / Video
          </button>

          <button
            onClick={() => startCamera('photo')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-app)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] shadow-sm active:scale-95 transition-all"
          >
            <Camera size={16} className="text-emerald-400" /> Ambil Foto
          </button>

          <button
            onClick={() => startCamera('video')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-app)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] shadow-sm active:scale-95 transition-all"
          >
            <Video size={16} className="text-rose-400" /> Rekam Video
          </button>

          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFilesSelected}
          />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] block">Total Media</span>
            <span className="text-xl font-black text-[var(--text-main)]">{stats.total} File</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <ImageIcon size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] block">Total Foto</span>
            <span className="text-xl font-black text-[var(--text-main)]">{stats.photos} Item</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
            <Video size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] block">Total Video</span>
            <span className="text-xl font-black text-[var(--text-main)]">{stats.videos} Item</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <HardDrive size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] block">Ukuran Terpakai</span>
            <span className="text-xl font-black text-[var(--text-main)]">{formatBytes(stats.totalSize)}</span>
          </div>
        </div>
      </div>

      {/* Folders & Filters */}
      <div className="space-y-4">
        {/* Folder Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveFolder('Semua')}
            className={cn(
              "px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5",
              activeFolder === 'Semua'
                ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-main)] hover:text-[var(--text-main)]"
            )}
          >
            <Folder size={14} /> Semua Folder
          </button>
          {MEDIA_FOLDERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFolder(f)}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5",
                activeFolder === f
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-main)] hover:text-[var(--text-main)]"
              )}
            >
              <Folder size={14} /> {f}
            </button>
          ))}
        </div>

        {/* Search, Type Filter & Sorting */}
        <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-main)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Cari foto, video, judul, tag, atau pengunggah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl pl-10 pr-4 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
            {/* Type selector */}
            <div className="flex items-center p-1 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-main)]">
              <button
                onClick={() => setActiveType('all')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  activeType === 'all' ? "bg-emerald-600 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                )}
              >
                Semua
              </button>
              <button
                onClick={() => setActiveType('photo')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1",
                  activeType === 'photo' ? "bg-emerald-600 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                )}
              >
                <ImageIcon size={13} /> Foto
              </button>
              <button
                onClick={() => setActiveType('video')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1",
                  activeType === 'video' ? "bg-emerald-600 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                )}
              >
                <Video size={13} /> Video
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl px-3 py-2 text-xs text-[var(--text-main)] font-bold focus:outline-none cursor-pointer"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="size">Ukuran Terbesar</option>
              <option value="name">Nama (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Media Grid & List */}
      {loading ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-12 text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Memuat Galeri Penyimpanan...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <ImageIcon size={32} />
          </div>
          <h3 className="font-black text-lg text-[var(--text-main)]">Belum Ada Media</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Belum ada foto atau video pada folder ini. Mulai unggah file dokumentasi kegiatan Anda sekarang.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-black shadow-md hover:bg-emerald-500 transition-all inline-flex items-center gap-2"
          >
            <Upload size={14} /> Unggah File Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              {/* Media Thumbnail Container */}
              <div 
                className="relative aspect-video bg-black/60 cursor-pointer overflow-hidden flex items-center justify-center"
                onClick={() => {
                  setSelectedMedia(item);
                  setZoomLevel(1);
                  setRotation(0);
                  recordMediaAccess(item.id, 'view');
                }}
              >
                {item.fileType === 'photo' ? (
                  <img
                    src={item.fileUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      src={item.fileUrl}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 group-hover:scale-110 transition-transform">
                        <Play size={20} className="ml-1" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Badge top-left */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                  <span className={cn(
                    "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider backdrop-blur-md text-white border shadow-sm",
                    item.fileType === 'video' ? "bg-rose-600/80 border-rose-400/30" : "bg-emerald-600/80 border-emerald-400/30"
                  )}>
                    {item.fileType === 'video' ? 'Video' : 'Foto'}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10">
                    {formatBytes(item.fileSize)}
                  </span>
                </div>

                {/* Hover overlay quick buttons */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMedia(item);
                    }}
                    className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-all"
                    title="Lihat Detail"
                  >
                    <Maximize2 size={16} />
                  </button>
                  <a
                    href={item.fileUrl}
                    download={item.fileName}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      recordMediaAccess(item.id, 'download');
                    }}
                    className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-all"
                    title="Unduh File"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareLink(item.fileUrl);
                    }}
                    className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-all"
                    title="Salin Tautan"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-bold">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Folder size={11} /> {item.folder}
                  </span>
                  <span>{formatDisplayDate(item.createdAt)}</span>
                </div>

                <h4 className="font-bold text-sm text-[var(--text-main)] line-clamp-1 group-hover:text-emerald-400 transition-colors" title={item.title}>
                  {item.title}
                </h4>

                {item.description && (
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                    {item.description}
                  </p>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[var(--bg-app)] border border-[var(--border-main)] text-[var(--text-muted)]">
                        #{tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-[9px] font-bold text-[var(--text-muted)] self-center">
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer Controls */}
                <div className="pt-2 border-t border-[var(--border-main)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span className="text-[10px] truncate max-w-[120px]">
                    Oleh: {item.uploaderName}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingMedia(item)}
                      className="p-1.5 hover:text-emerald-400 transition-colors"
                      title="Edit Judul & Kategori"
                    >
                      <Edit2 size={13} />
                    </button>
                    {(user?.uid === item.uploadedBy || role === 'admin' || role === 'PC') && (
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 hover:text-rose-400 transition-colors"
                        title="Hapus Media"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox / Media Viewer Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-xl flex flex-col justify-between p-4 md:p-6"
          >
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between text-white z-10 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider",
                  selectedMedia.fileType === 'video' ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                )}>
                  {selectedMedia.fileType === 'video' ? 'Video' : 'Foto'}
                </span>
                <div>
                  <h3 className="font-bold text-base text-white line-clamp-1">{selectedMedia.title}</h3>
                  <p className="text-xs text-zinc-400">
                    {selectedMedia.folder} • {formatBytes(selectedMedia.fileSize)} • {formatDisplayDate(selectedMedia.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedMedia.fileType === 'photo' && (
                  <>
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                      className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all"
                      title="Perbesar"
                    >
                      <ZoomIn size={18} />
                    </button>
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                      className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all"
                      title="Perkecil"
                    >
                      <ZoomOut size={18} />
                    </button>
                    <button
                      onClick={() => setRotation(prev => (prev + 90) % 360)}
                      className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all"
                      title="Putar 90 Derajat"
                    >
                      <RotateCw size={18} />
                    </button>
                  </>
                )}

                <a
                  href={selectedMedia.fileUrl}
                  download={selectedMedia.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5 text-xs font-bold"
                >
                  <Download size={16} /> Unduh
                </a>

                <button
                  onClick={() => handleShareLink(selectedMedia.fileUrl)}
                  className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all"
                  title="Salin Tautan"
                >
                  <Share2 size={18} />
                </button>

                <button
                  onClick={() => setSelectedMedia(null)}
                  className="p-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition-all"
                  title="Tutup"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body / Media Canvas */}
            <div className="flex-1 flex items-center justify-center overflow-hidden relative p-4">
              {selectedMedia.fileType === 'photo' ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto">
                  <img
                    src={selectedMedia.fileUrl}
                    alt={selectedMedia.title}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease-out'
                    }}
                    className="max-h-[75vh] max-w-[85vw] object-contain rounded-xl shadow-2xl select-none"
                  />
                </div>
              ) : (
                <div className="w-full max-w-4xl max-h-[75vh] flex items-center justify-center">
                  <video
                    src={selectedMedia.fileUrl}
                    controls
                    autoPlay
                    className="w-full max-h-[75vh] rounded-2xl shadow-2xl bg-black"
                  />
                </div>
              )}
            </div>

            {/* Modal Bottom Information */}
            <div className="pt-3 border-t border-white/10 text-xs text-zinc-400 flex flex-col md:flex-row items-center justify-between gap-2 z-10">
              <div className="flex items-center gap-2">
                <span>Diupload oleh: <strong className="text-white">{selectedMedia.uploaderName}</strong></span>
                {selectedMedia.description && (
                  <span className="hidden md:inline">• {selectedMedia.description}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedMedia.tags?.map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[10px] font-bold">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Batch Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
                <div className="flex items-center gap-2">
                  <Upload size={18} className="text-emerald-400" />
                  <h3 className="font-black text-base text-[var(--text-main)]">Unggah Foto & Video</h3>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div className="space-y-3">
                  {uploadFiles.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-main)] space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black truncate max-w-[280px] text-[var(--text-main)]">
                          {item.file.name}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--text-muted)]">
                          {formatBytes(item.file.size)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                            Judul Media:
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUploadFiles(prev => {
                                const copy = [...prev];
                                copy[idx].title = val;
                                return copy;
                              });
                            }}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none"
                            placeholder="Contoh: Rapat Pleno Cabang"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                            Folder / Album:
                          </label>
                          <select
                            value={item.folder}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUploadFiles(prev => {
                                const copy = [...prev];
                                copy[idx].folder = val;
                                return copy;
                              });
                            }}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none font-bold"
                          >
                            {MEDIA_FOLDERS.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                          Tag (pisahkan koma):
                        </label>
                        <input
                          type="text"
                          value={item.tags}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUploadFiles(prev => {
                              const copy = [...prev];
                              copy[idx].tags = val;
                              return copy;
                            });
                          }}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none"
                          placeholder="pleno, kaderisasi, 2026"
                        />
                      </div>

                      {item.progress > 0 && (
                        <div className="w-full bg-zinc-700/30 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Tambah File Lain
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-[var(--border-main)] text-xs font-bold text-[var(--text-muted)]"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all flex items-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Mengunggah...
                        </>
                      ) : (
                        <>
                          <Check size={14} /> Simpan ke Penyimpanan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Direct In-Browser Camera / Video Recording Modal */}
      <AnimatePresence>
        {isCameraModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[230] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
                <div className="flex items-center gap-2">
                  {cameraMode === 'photo' ? (
                    <Camera size={18} className="text-emerald-400" />
                  ) : (
                    <Video size={18} className="text-rose-400" />
                  )}
                  <h3 className="font-black text-base text-[var(--text-main)]">
                    {cameraMode === 'photo' ? 'Ambil Foto Dokumentasi' : 'Rekam Video Dokumentasi'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    stopCamera();
                    setIsCameraModalOpen(false);
                  }}
                  className="p-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <X size={18} />
                </button>
              </div>

              {!capturedBlob ? (
                <div className="space-y-4">
                  {/* Camera Viewport */}
                  <div className="relative aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {isRecordingVideo && (
                      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/90 text-white text-xs font-bold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-white" />
                        Merekam: {recordingSeconds} detik
                      </div>
                    )}
                  </div>

                  {/* Camera Action Buttons */}
                  <div className="flex items-center justify-center gap-4">
                    {cameraMode === 'photo' ? (
                      <button
                        onClick={capturePhoto}
                        className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2"
                      >
                        <Camera size={18} /> Ambil Foto
                      </button>
                    ) : !isRecordingVideo ? (
                      <button
                        onClick={startRecording}
                        className="px-8 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2"
                      >
                        <Video size={18} /> Mulai Rekam Video
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="px-8 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2 border border-rose-500"
                      >
                        <Square size={16} className="text-rose-500" /> Selesai Merekam
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Review Captured Media */
                <div className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                    {capturedBlob.type === 'photo' ? (
                      <img src={capturedBlob.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <video src={capturedBlob.previewUrl} controls className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                        Judul File:
                      </label>
                      <input
                        type="text"
                        value={capturedTitle}
                        onChange={(e) => setCapturedTitle(e.target.value)}
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                        Folder / Kategori:
                      </label>
                      <select
                        value={capturedFolder}
                        onChange={(e) => setCapturedFolder(e.target.value)}
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none font-bold"
                      >
                        {MEDIA_FOLDERS.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setCapturedBlob(null);
                        startCamera(cameraMode);
                      }}
                      className="px-4 py-2 rounded-xl border border-[var(--border-main)] text-xs font-bold text-[var(--text-muted)]"
                    >
                      Ulangi
                    </button>
                    <button
                      onClick={handleSaveCapturedMedia}
                      disabled={isUploading}
                      className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all flex items-center gap-2"
                    >
                      {isUploading ? 'Menyimpan...' : 'Simpan Media'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Metadata Modal */}
      <AnimatePresence>
        {editingMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
                <div className="flex items-center gap-2">
                  <Edit2 size={16} className="text-emerald-400" />
                  <h3 className="font-black text-base text-[var(--text-main)]">Edit Info Media</h3>
                </div>
                <button
                  onClick={() => setEditingMedia(null)}
                  className="p-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Judul File:
                  </label>
                  <input
                    type="text"
                    value={editingMedia.title}
                    onChange={(e) => setEditingMedia({ ...editingMedia, title: e.target.value })}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Folder / Kategori:
                  </label>
                  <select
                    value={editingMedia.folder}
                    onChange={(e) => setEditingMedia({ ...editingMedia, folder: e.target.value })}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none font-bold"
                  >
                    {MEDIA_FOLDERS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Deskripsi / Catatan:
                  </label>
                  <textarea
                    rows={3}
                    value={editingMedia.description || ''}
                    onChange={(e) => setEditingMedia({ ...editingMedia, description: e.target.value })}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
                    placeholder="Keterangan acara atau tempat..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingMedia(null)}
                    className="px-4 py-2 rounded-xl border border-[var(--border-main)] text-xs font-bold text-[var(--text-muted)]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[240] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <Trash2 size={28} />
              </div>
              <h3 className="font-black text-base text-[var(--text-main)]">Hapus Media Ini?</h3>
              <p className="text-xs text-[var(--text-muted)]">
                File yang dihapus tidak dapat dipulihkan kembali dari penyimpanan cloud.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-main)] text-xs font-bold text-[var(--text-muted)]"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDeleteMedia(deleteConfirmId)}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Square(props: any) {
  return (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect width="18" height="18" x="3" y="3" rx="2" />
    </svg>
  );
}
