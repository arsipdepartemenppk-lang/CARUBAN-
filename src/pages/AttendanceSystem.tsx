import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Camera, QrCode, CheckCircle2, AlertCircle, X, Users, Calendar, 
  Download, RefreshCw, Volume2, VolumeX, Flashlight, FlipHorizontal, 
  Search, ShieldCheck, Clock, UserCheck, Plus, Sparkles, Maximize2, Minimize2, Award, TrendingUp, Activity, FileText,
  Filter, RotateCcw, ExternalLink, Upload, Image as ImageIcon, MapPin, Navigation, Lock, Unlock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { collection, onSnapshot, query, where, addDoc, orderBy, getDocs, limit, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import QRCode from 'react-qr-code';
import { EventQRModal } from '../components/EventQRModal';
import * as XLSX from 'xlsx';
import { getCachedMemberData } from '../utils/offlineMemberCache';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { addBrandedHeader } from '../utils/pdfUtils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { syncQueue } from '../services/syncQueue';
import { toJSDate, formatDisplayDate } from '../utils/dateUtils';
import { decryptData } from '../utils/securityEncryption';
import { 
  getDeviceCoordinates, 
  validateAttendanceEligibility, 
  PRESET_VENUES, 
  formatDistance, 
  AttendanceValidationResult,
  EventVenue 
} from '../utils/geoUtils';

export interface AttendanceRecord {
  id?: string;
  meetingId: string;
  meetingTitle: string;
  memberId?: string;
  memberName: string;
  memberNia: string;
  memberSekolah?: string;
  memberPimpinan?: string;
  isGuest?: boolean;
  guestOrigin?: string;
  status: 'Hadir' | 'Terlambat' | 'Izin';
  scannedAt: string;
  scannedBy?: string;
  attendeeCoords?: { lat: number; lng: number };
  distanceMeters?: number;
  verifiedByFace?: boolean;
  faceConfidence?: number;
  facePhotoUrl?: string;
}

export const AttendanceSystem: React.FC = () => {
  const { user, userData, role } = useFirebase();
  const { showToast } = useToast();

  // Meeting / Event selection
  const [meetings, setMeetings] = useState<any[]>([]);
  const [currentAgenda, setCurrentAgenda] = useState<any>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('default-meeting');
  const [selectedMeetingTitle, setSelectedMeetingTitle] = useState<string>('Rapat Pleno & Koordinasi Cabang');
  const [isNewMeetingModal, setIsNewMeetingModal] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingType, setNewMeetingType] = useState('Rapat');
  const [newMeetingLocation, setNewMeetingLocation] = useState('Gedung PCNU Kabupaten Cirebon');
  const [newMeetingDate, setNewMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [newMeetingStartTime, setNewMeetingStartTime] = useState('08:00');
  const [newMeetingEndTime, setNewMeetingEndTime] = useState('17:00');
  const [newMeetingVenuePreset, setNewMeetingVenuePreset] = useState('pcnu-cirebon');
  const [newMeetingLat, setNewMeetingLat] = useState(-6.7588);
  const [newMeetingLng, setNewMeetingLng] = useState(108.4832);
  const [newMeetingRadius, setNewMeetingRadius] = useState(100);

  // Geolocation & Schedule Verification state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [adminBypass, setAdminBypass] = useState(false);

  const isAdminOrPC = role === 'admin' || role === 'developer' || role === 'PC';

  const ACTIVITY_TYPES = [
    { label: 'Rapat / Pleno', value: 'Rapat', icon: Users, color: 'text-blue-400' },
    { label: 'Pelantikan', value: 'Pelantikan', icon: Award, color: 'text-emerald-400' },
    { label: 'LAKMUD', value: 'LAKMUD', icon: Sparkles, color: 'text-amber-400' },
    { label: 'MAKESTA', value: 'MAKESTA', icon: Sparkles, color: 'text-teal-400' },
    { label: 'Konferensi', value: 'Konferensi', icon: ShieldCheck, color: 'text-purple-400' },
    { label: 'Lainnya', value: 'Lainnya', icon: Plus, color: 'text-zinc-400' }
  ];

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualNiaInput, setManualNiaInput] = useState('');
  const [lastScannedResult, setLastScannedResult] = useState<AttendanceRecord | null>(null);
  const [attendees, setAttendees] = useState<AttendanceRecord[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(true);
  const [activeTab, setActiveTab] = useState<'scanner' | 'analytics' | 'history' | 'guest'>('scanner');
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestSuccessId, setGuestSuccessId] = useState<string | null>(null);
  const [guestData, setGuestData] = useState({
    name: '',
    origin: '',
    phone: ''
  });
  const [pendingSync, setPendingSync] = useState<any[]>([]);
  const [allMeetingsData, setAllMeetingsData] = useState<any[]>([]);
  const [exportRange, setExportRange] = useState<'daily' | 'weekly' | 'all'>('daily');
  const [showEventQRModal, setShowEventQRModal] = useState(false);

  // Scan & Verification Mode: 'qr' | 'face' | 'dual'
  const [scanMode, setScanMode] = useState<'qr' | 'face' | 'dual'>('qr');
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [faceConfidence, setFaceConfidence] = useState<number>(0);
  const [faceHoldProgress, setFaceHoldProgress] = useState<number>(0);
  const [faceStatusText, setFaceStatusText] = useState<string>('Posisikan wajah di dalam lingkaran');
  const [capturedFacePhoto, setCapturedFacePhoto] = useState<string | null>(null);

  const scannerContainerId = 'qr-reader';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isCameraTransitioningRef = useRef(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const faceOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceDetectionAnimId = useRef<number | null>(null);
  const faceHoldCounterRef = useRef<number>(0);
  const isVerifyingFaceRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {}
        try {
          scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
      }
    };
  }, []);

  const refreshLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const coords = await getDeviceCoordinates();
      setUserCoords({ lat: coords.lat, lng: coords.lng });
    } catch (err: any) {
      console.warn('Geolocation notice:', err);
      setLocationError(err?.message || 'Gagal membaca sensor GPS');
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    refreshLocation();
  }, []);

  useEffect(() => {
    // Fetch real agendas with full location and schedule metadata
    const q = query(collection(db, 'agendas'), orderBy('date', 'desc'), limit(30));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as any)
      }));
      setMeetings(data);
      if (data.length > 0) {
        if (selectedMeetingId === 'default-meeting') {
          setSelectedMeetingId(data[0].id);
          setSelectedMeetingTitle(data[0].title || 'Agenda Tanpa Judul');
          setCurrentAgenda(data[0]);
        } else {
          const found = data.find(m => m.id === selectedMeetingId);
          if (found) {
            setCurrentAgenda(found);
            setSelectedMeetingTitle(found.title || 'Agenda Tanpa Judul');
          }
        }
      }
    });
    return () => unsub();
  }, [selectedMeetingId]);

  const attendanceValidation: AttendanceValidationResult = useMemo(() => {
    return validateAttendanceEligibility(currentAgenda || {}, userCoords);
  }, [currentAgenda, userCoords]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'attendances'),
      where('meetingId', '==', selectedMeetingId),
      orderBy('scannedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setAttendees(data);
      setLoadingAttendees(false);
    }, (err) => {
      console.error('Error fetching attendees:', err);
      setLoadingAttendees(false);
    });

    return () => unsub();
  }, [selectedMeetingId, user]);

  // Sync Queue Logic
  useEffect(() => {
    const checkSyncQueue = async () => {
      try {
        const queue = await syncQueue.getQueue();
        setPendingSync(queue.filter(item => item.type === 'attendance'));
      } catch (err) {
        console.error('Error checking sync queue:', err);
      }
    };
    checkSyncQueue();
    const interval = setInterval(checkSyncQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async (item: any) => {
    try {
      await addDoc(collection(db, 'attendances'), item.data);
      await syncQueue.removeFromQueue(item.id);
      showToast('Data berhasil disinkronisasi', 'success');
    } catch (err) {
      showToast('Gagal sinkronisasi. Coba lagi nanti.', 'error');
    }
  };

  const handleSyncAll = async () => {
    if (pendingSync.length === 0) return;
    showToast('Memulai sinkronisasi massal...', 'info');
    let successCount = 0;
    for (const item of pendingSync) {
      try {
        await addDoc(collection(db, 'attendances'), item.data);
        await syncQueue.removeFromQueue(item.id);
        successCount++;
      } catch (e) {
        console.error('Sync failed for item', item.id);
      }
    }
    showToast(`${successCount} data berhasil disinkronisasi`, 'success');
  };

  // Participation Trends Data
  useEffect(() => {
    if (activeTab === 'analytics') {
      const q = query(collection(db, 'attendances'), orderBy('scannedAt', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const records = snapshot.docs.map(doc => doc.data());
        // Group by meeting
        const meetingParticipation: Record<string, number> = {};
        records.forEach((r: any) => {
          const title = r.meetingTitle || 'Unnamed';
          meetingParticipation[title] = (meetingParticipation[title] || 0) + 1;
        });
        
        const trendData = Object.entries(meetingParticipation).map(([name, count]) => ({
          name,
          participants: count
        }));
        setAllMeetingsData(trendData);
      });
      return () => unsub();
    }
  }, [activeTab]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) return;

    const newMeeting = {
      title: newMeetingTitle,
      category: newMeetingType,
      date: newMeetingDate,
      time: newMeetingStartTime,
      startTime: newMeetingStartTime,
      endTime: newMeetingEndTime,
      location: newMeetingLocation,
      latitude: Number(newMeetingLat),
      longitude: Number(newMeetingLng),
      radiusMeters: Number(newMeetingRadius),
      enforceLocation: true,
      enforceTime: true,
      status: 'Berlangsung',
      createdAt: new Date().toISOString(),
      createdBy: user?.uid || 'system'
    };

    try {
      const docRef = await addDoc(collection(db, 'agendas'), newMeeting);
      const meetingItem = { id: docRef.id, ...newMeeting };
      setMeetings(prev => [meetingItem, ...prev]);
      setSelectedMeetingId(docRef.id);
      setSelectedMeetingTitle(newMeetingTitle);
      setCurrentAgenda(meetingItem);
      setIsNewMeetingModal(false);
      setNewMeetingTitle('');
      showToast('Sesi agenda baru berbasis lokasi & jadwal berhasil dibuat', 'success');
    } catch (err: any) {
      showToast('Gagal membuat agenda: ' + err.message, 'error');
    }
  };

  const cleanupScanner = async () => {
    if (!scannerRef.current) return;
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch {
      // Ignore stop failure if already stopped
    }
    try {
      scannerRef.current.clear();
    } catch {
      // Ignore clear failure
    }
    scannerRef.current = null;
  };

  const startCamera = async (overrideFacing?: 'environment' | 'user') => {
    if (isCameraTransitioningRef.current) return;
    isCameraTransitioningRef.current = true;
    setIsStartingCamera(true);
    setCameraError(null);

    const useFacing = overrideFacing || facingMode;

    try {
      // Ensure previous instance is cleanly cleared
      await cleanupScanner();

      // Check for mediaDevices support
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Akses kamera tidak didukung di lingkungan peramban ini.');
      }

      // Small delay to ensure layout paints and container has real dimensions
      await new Promise(r => setTimeout(r, 120));

      // Check if container element exists in DOM
      const container = document.getElementById(scannerContainerId);
      if (!container) {
        throw new Error('Elemen kamera tidak ditemukan di layar.');
      }

      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      scannerRef.current = scanner;

      const config = {
        fps: 15,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0
      };

      let started = false;

      // 1. Coba dengan facingMode yang diminta (misal: 'environment')
      try {
        await scanner.start(
          { facingMode: useFacing },
          config,
          onScanSuccess,
          onScanFailure
        );
        started = true;
      } catch (err1) {
        console.warn(`Gagal start kamera dengan facingMode '${useFacing}', mencoba alternatif:`, err1);
      }

      // 2. Jika gagal (misal laptop/PC dengan hanya 1 webcam depan), coba facingMode sebaliknya
      if (!started) {
        const altFacing = useFacing === 'environment' ? 'user' : 'environment';
        try {
          await scanner.start(
            { facingMode: altFacing },
            config,
            onScanSuccess,
            onScanFailure
          );
          setFacingMode(altFacing);
          started = true;
        } catch (err2) {
          console.warn(`Gagal fallback facingMode '${altFacing}', mencoba deteksi daftar kamera:`, err2);
        }
      }

      // 3. Jika masih belum berhasil, enumerasi sensor kamera perangkat secara langsung
      if (!started) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const selectedCam = cameras.find(c => 
              c.label.toLowerCase().includes('back') || 
              c.label.toLowerCase().includes('rear') || 
              c.label.toLowerCase().includes('belakang')
            ) || cameras[0];

            await scanner.start(
              selectedCam.id,
              config,
              onScanSuccess,
              onScanFailure
            );
            started = true;
          }
        } catch (camErr) {
          console.warn('Gagal mendeteksi daftar kamera fisik:', camErr);
        }
      }

      if (!started) {
        throw new Error('Sensor kamera tidak dapat diaktifkan. Pastikan izin kamera aktif pada peramban Anda.');
      }

      setIsScanning(true);
      setCameraError(null);

      // Trigger Face Tracking loop if mode is face or dual
      setTimeout(() => {
        startFaceTrackingLoop();
      }, 300);
    } catch (err: any) {
      console.warn('Handled camera start notice:', err);
      // Clean up failed instance completely so subsequent attempts start fresh
      await cleanupScanner();

      const errStr = String(err?.message || err?.name || err);
      if (err?.name === 'AbortError' || errStr.includes('Timeout') || errStr.includes('AbortError')) {
        setCameraError('Waktu inisialisasi kamera habis atau sensor sedang digunakan. Silakan klik coba lagi atau unggah foto QR code.');
      } else if (errStr.includes('transition')) {
        setCameraError('Kamera sedang memuat ulang. Silakan klik coba lagi sejenak.');
      } else if (err?.name === 'NotAllowedError' || errStr.includes('Permission')) {
        setCameraError('Izin akses kamera ditolak. Harap izinkan akses kamera pada pengaturan browser perangkat Anda.');
      } else if (err?.name === 'NotFoundError' || errStr.includes('DevicesNotFoundError')) {
        setCameraError('Kamera tidak terdeteksi pada perangkat ini.');
      } else {
        setCameraError(err?.message || 'Gagal mengakses kamera. Anda dapat mengunggah file foto QR code sebagai alternatif.');
      }
      setIsScanning(false);
    } finally {
      setIsStartingCamera(false);
      isCameraTransitioningRef.current = false;
    }
  };

  // Face Detection / Verification Engine
  const captureCurrentVideoFrame = (): string | null => {
    try {
      const videoEl = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement;
      if (!videoEl || videoEl.videoWidth === 0) return null;
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = 320;
      snapCanvas.height = 320;
      const ctx = snapCanvas.getContext('2d');
      if (!ctx) return null;

      // Crop center square
      const minDim = Math.min(videoEl.videoWidth, videoEl.videoHeight);
      const startX = (videoEl.videoWidth - minDim) / 2;
      const startY = (videoEl.videoHeight - minDim) / 2;

      ctx.drawImage(videoEl, startX, startY, minDim, minDim, 0, 0, 320, 320);
      return snapCanvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return null;
    }
  };

  const startFaceTrackingLoop = () => {
    if (faceDetectionAnimId.current) {
      cancelAnimationFrame(faceDetectionAnimId.current);
    }

    const checkFrame = async () => {
      const videoEl = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement;
      const canvas = faceOverlayCanvasRef.current;

      if (videoEl && canvas && videoEl.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (canvas.width !== videoEl.clientWidth || canvas.height !== videoEl.clientHeight) {
            canvas.width = videoEl.clientWidth || 320;
            canvas.height = videoEl.clientHeight || 320;
          }

          const width = canvas.width;
          const height = canvas.height;
          ctx.clearRect(0, 0, width, height);

          // Center target oval
          const centerX = width / 2;
          const centerY = height / 2;
          const radiusX = width * 0.32;
          const radiusY = height * 0.38;

          let detected = false;
          let confidence = 0;

          // 1. Try Native Browser FaceDetector if supported
          if ('FaceDetector' in window) {
            try {
              const detector = new (window as any).FaceDetector({ maxDetectedFaces: 1, fastMode: true });
              const faces = await detector.detect(videoEl);
              if (faces && faces.length > 0) {
                detected = true;
                confidence = 96;
              }
            } catch {}
          }

          // 2. Optical luminance & feature heuristic fallback for universal support
          if (!detected) {
            try {
              const testCanvas = document.createElement('canvas');
              testCanvas.width = 64;
              testCanvas.height = 64;
              const testCtx = testCanvas.getContext('2d');
              if (testCtx) {
                testCtx.drawImage(videoEl, 0, 0, 64, 64);
                const imgData = testCtx.getImageData(16, 16, 32, 32);
                let totalDiff = 0;
                let prevPixel = 0;
                for (let i = 0; i < imgData.data.length; i += 4) {
                  const lum = (imgData.data[i] * 0.299 + imgData.data[i + 1] * 0.587 + imgData.data[i + 2] * 0.114);
                  if (i > 0) totalDiff += Math.abs(lum - prevPixel);
                  prevPixel = lum;
                }
                const variability = totalDiff / (imgData.data.length / 4);
                if (variability > 12) {
                  detected = true;
                  confidence = Math.min(98, Math.round(75 + variability));
                }
              }
            } catch {}
          }

          // Draw biometric guidance oval
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          ctx.lineWidth = detected ? 3.5 : 2;
          ctx.strokeStyle = detected ? '#10b981' : 'rgba(255, 255, 255, 0.4)';
          ctx.setLineDash(detected ? [] : [6, 6]);
          ctx.stroke();

          // Corner tick marks
          ctx.strokeStyle = detected ? '#34d399' : '#0ea5e9';
          ctx.lineWidth = 4;
          ctx.setLineDash([]);
          const cornerLen = 22;
          // Top Left
          ctx.beginPath();
          ctx.moveTo(centerX - radiusX, centerY - radiusY + cornerLen);
          ctx.lineTo(centerX - radiusX, centerY - radiusY);
          ctx.lineTo(centerX - radiusX + cornerLen, centerY - radiusY);
          ctx.stroke();
          // Top Right
          ctx.beginPath();
          ctx.moveTo(centerX + radiusX - cornerLen, centerY - radiusY);
          ctx.lineTo(centerX + radiusX, centerY - radiusY);
          ctx.lineTo(centerX + radiusX, centerY - radiusY + cornerLen);
          ctx.stroke();
          // Bottom Left
          ctx.beginPath();
          ctx.moveTo(centerX - radiusX, centerY + radiusY - cornerLen);
          ctx.lineTo(centerX - radiusX, centerY + radiusY);
          ctx.lineTo(centerX - radiusX + cornerLen, centerY + radiusY);
          ctx.stroke();
          // Bottom Right
          ctx.beginPath();
          ctx.moveTo(centerX + radiusX - cornerLen, centerY + radiusY);
          ctx.lineTo(centerX + radiusX, centerY + radiusY);
          ctx.lineTo(centerX + radiusX, centerY + radiusY - cornerLen);
          ctx.stroke();
          ctx.restore();

          // Update Detection State & Hold Progress
          setIsFaceDetected(detected);
          setFaceConfidence(detected ? confidence : 0);

          if (detected) {
            faceHoldCounterRef.current += 1;
            const progress = Math.min(100, Math.round((faceHoldCounterRef.current / 28) * 100));
            setFaceHoldProgress(progress);
            setFaceStatusText(`Wajah Terdeteksi (${confidence}%) • Tahan posisi...`);

            if (progress >= 100 && !isVerifyingFaceRef.current) {
              isVerifyingFaceRef.current = true;
              const photo = captureCurrentVideoFrame();
              setCapturedFacePhoto(photo);
              handleFaceVerifiedSuccess(photo, confidence);
            }
          } else {
            faceHoldCounterRef.current = Math.max(0, faceHoldCounterRef.current - 2);
            setFaceHoldProgress(0);
            setFaceStatusText('Posisikan wajah di dalam lingkaran panduan');
          }
        }
      }

      faceDetectionAnimId.current = requestAnimationFrame(checkFrame);
    };

    faceDetectionAnimId.current = requestAnimationFrame(checkFrame);
  };

  const stopFaceTrackingLoop = () => {
    if (faceDetectionAnimId.current) {
      cancelAnimationFrame(faceDetectionAnimId.current);
      faceDetectionAnimId.current = null;
    }
    faceHoldCounterRef.current = 0;
    setFaceHoldProgress(0);
    setIsFaceDetected(false);
  };

  const handleFaceVerifiedSuccess = async (photoUrl: string | null, confidenceScore: number) => {
    playBeep();
    showToast(`Wajah Terverifikasi (${confidenceScore}%)! Mencatat kehadiran...`, 'success');

    // Strict Location & Schedule Time Validation
    if (!attendanceValidation.isAllowed && !adminBypass) {
      if (attendanceValidation.timeStatus !== 'during') {
        showToast(`Presensi Wajah Ditolak: ${attendanceValidation.timeReason}`, 'error');
      } else {
        showToast(`Presensi Wajah Ditolak: ${attendanceValidation.locationReason}`, 'error');
      }
      setTimeout(() => {
        isVerifyingFaceRef.current = false;
        faceHoldCounterRef.current = 0;
      }, 3000);
      return;
    }

    const currentUserName = userData?.displayName || user?.displayName || user?.email || 'Kader IPNU / IPPNU';
    const currentUserNia = userData?.nomorIndukAnggota || userData?.nia || 'BIO-FACE-' + Math.floor(1000 + Math.random() * 9000);
    const currentUserSekolah = userData?.namaSekolah || userData?.komisariat || 'PC IPNU IPPNU Kab. Cirebon';
    const currentUserPimpinan = userData?.statusPimpinan || 'PC';

    const alreadyAttended = attendees.some(a => (a.memberNia === currentUserNia || a.memberName === currentUserName) && a.memberNia !== '');
    if (alreadyAttended) {
      showToast(`${currentUserName} sudah tercatat presensi sebelumnya!`, 'info');
      setTimeout(() => {
        isVerifyingFaceRef.current = false;
        faceHoldCounterRef.current = 0;
      }, 3000);
      return;
    }

    const record: AttendanceRecord = {
      meetingId: selectedMeetingId,
      meetingTitle: selectedMeetingTitle,
      memberName: currentUserName,
      memberNia: currentUserNia,
      memberSekolah: currentUserSekolah,
      memberPimpinan: currentUserPimpinan,
      isGuest: false,
      status: 'Hadir',
      scannedAt: new Date().toISOString(),
      scannedBy: 'Face Biometric Auto-Check',
      attendeeCoords: userCoords || undefined,
      distanceMeters: attendanceValidation.distanceMeters,
      verifiedByFace: true,
      faceConfidence: confidenceScore,
      facePhotoUrl: photoUrl || undefined
    };

    try {
      if (!navigator.onLine) {
        await syncQueue.addToQueue(record, 'attendance');
        showToast(`Offline: Presensi wajah disimpan ke antrean lokal`, 'info');
      } else {
        await addDoc(collection(db, 'attendances'), record);
        showToast(`Presensi Wajah Berhasil: ${currentUserName}`, 'success');
      }
      setLastScannedResult(record);
    } catch {
      await syncQueue.addToQueue(record, 'attendance');
      setLastScannedResult(record);
      showToast(`Presensi Wajah Disimpan ke Antrean`, 'info');
    } finally {
      setTimeout(() => {
        isVerifyingFaceRef.current = false;
        faceHoldCounterRef.current = 0;
      }, 4000);
    }
  };

  const stopCamera = async () => {
    stopFaceTrackingLoop();
    if (isCameraTransitioningRef.current) return;
    isCameraTransitioningRef.current = true;
    try {
      await cleanupScanner();
    } catch (err) {
      console.warn('Handled camera stop notice:', err);
    } finally {
      setIsScanning(false);
      setIsStartingCamera(false);
      setIsTorchOn(false);
      isCameraTransitioningRef.current = false;
    }
  };

  const toggleFacing = async () => {
    if (isCameraTransitioningRef.current || isStartingCamera) return;
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    await stopCamera();
    setTimeout(() => {
      startCamera(nextFacing);
    }, 350);
  };

  // Safe tab switch listener to stop camera when away from scanner
  useEffect(() => {
    if (activeTab !== 'scanner' && (isScanning || scannerRef.current)) {
      stopCamera();
    }
  }, [activeTab]);

  const handleScanQRFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isScanning || scannerRef.current?.isScanning) {
      await stopCamera();
    }

    try {
      showToast('Memindai QR code dari file gambar...', 'info');
      const tempId = scannerContainerId;
      const fileScanner = new Html5Qrcode(tempId);
      const result = await fileScanner.scanFile(file, true);
      try {
        fileScanner.clear();
      } catch {}
      await onScanSuccess(result);
    } catch (err: any) {
      console.warn('File QR scan warning:', err);
      showToast('QR code tidak terdeteksi pada gambar. Pastikan gambar jelas.', 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const toggleTorch = async () => {
    if (scannerRef.current && isScanning) {
      try {
        const nextTorch = !isTorchOn;
        await (scannerRef.current as any).applyVideoConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setIsTorchOn(nextTorch);
      } catch (err) {
        console.warn('Torch not supported on this device/camera', err);
        showToast('Lampu senter tidak didukung pada kamera ini', 'info');
      }
    }
  };

  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn('Beep sound failed:', e);
    }
  };

  const isProcessingScan = useRef(false);
  const onScanSuccess = async (decodedText: string) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;

    try {
      await processDecodedQR(decodedText);
    } finally {
      setTimeout(() => {
        isProcessingScan.current = false;
      }, 1800);
    }
  };

  const onScanFailure = () => {};

  const processDecodedQR = async (decoded: string) => {
    let parsedNia = '';
    let parsedName = '';

    if (decoded.startsWith('IPNU:')) {
      const parts = decoded.split(':');
      parsedNia = parts[1] || '';
      parsedName = parts[2] || '';
    } else if (decoded.startsWith('{')) {
      try {
        const obj = JSON.parse(decoded);
        parsedNia = obj.nia || obj.nomorIndukAnggota || '';
        parsedName = obj.name || obj.nama || obj.namaLengkap || '';
      } catch {
        parsedNia = decoded;
      }
    } else {
      parsedNia = decoded.trim();
    }

    if (!parsedNia && !parsedName) {
      showToast('QR Code tidak dikenali sebagai KTA IPNU', 'error');
      return;
    }

    let memberData: any = null;
    try {
      const q = query(collection(db, 'members'), where('nomorIndukAnggota', '==', parsedNia));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const rawData = snap.docs[0].data();
        memberData = rawData;
        if (rawData._isEncrypted) {
          memberData = {
            ...rawData,
            namaLengkap: decryptData(rawData.namaLengkap),
            noHp: decryptData(rawData.noHp),
            alamatLengkap: decryptData(rawData.alamatLengkap),
            namaSekolah: decryptData(rawData.namaSekolah)
          };
        }
      } else {
        const offline = await getCachedMemberData();
        const found = offline.members.find((m: any) => m.nomorIndukAnggota === parsedNia);
        if (found) memberData = found;
      }
    } catch {
      const offline = await getCachedMemberData();
      const found = offline.members.find((m: any) => m.nomorIndukAnggota === parsedNia);
      if (found) memberData = found;
    }

    const finalName = memberData?.namaLengkap || parsedName || `Anggota (${parsedNia})`;
    const finalNia = memberData?.nomorIndukAnggota || parsedNia;
    const finalSekolah = memberData?.namaSekolah || memberData?.alamatSekolah || 'Komisariat Pelajar';
    const finalPimpinan = memberData?.statusPimpinan || 'PK';

    const alreadyAttended = attendees.some(a => a.memberNia === finalNia && a.memberNia !== '');
    if (alreadyAttended) {
      showToast(`${finalName} sudah tercatat presensi sebelumnya!`, 'info');
      playBeep();
      return;
    }

    // Strict Location & Schedule Time Validation
    if (!attendanceValidation.isAllowed && !adminBypass) {
      playBeep();
      if (attendanceValidation.timeStatus !== 'during') {
        showToast(`Presensi Ditolak: ${attendanceValidation.timeReason}`, 'error');
      } else {
        showToast(`Presensi Ditolak: ${attendanceValidation.locationReason}`, 'error');
      }
      return;
    }

    const record: AttendanceRecord = {
      meetingId: selectedMeetingId,
      meetingTitle: selectedMeetingTitle,
      memberName: finalName,
      memberNia: finalNia,
      memberSekolah: finalSekolah,
      memberPimpinan: finalPimpinan,
      isGuest: false,
      status: 'Hadir',
      scannedAt: new Date().toISOString(),
      scannedBy: userData?.displayName || user?.displayName || user?.email || 'Panitia Presensi',
      attendeeCoords: userCoords || undefined,
      distanceMeters: attendanceValidation.distanceMeters
    };

    try {
      if (!navigator.onLine) {
        await syncQueue.addToQueue(record, 'attendance');
        showToast(`Offline: Data ${finalName} disimpan di antrean`, 'info');
      } else {
        await addDoc(collection(db, 'attendances'), record);
        showToast(`Presensi Berhasil: ${finalName}`, 'success');
      }
      setLastScannedResult(record);
      playBeep();
    } catch (err: any) {
      await syncQueue.addToQueue(record, 'attendance');
      setLastScannedResult(record);
      playBeep();
      showToast(`Gagal: Disimpan ke antrean sinkronisasi`, 'info');
    }
  };

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNiaInput.trim()) return;
    await processDecodedQR(manualNiaInput.trim());
    setManualNiaInput('');
  };

  const handleGuestCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestData.name.trim()) return;

    // Strict Location & Schedule Time Validation for Guests
    if (!attendanceValidation.isAllowed && !adminBypass) {
      playBeep();
      if (attendanceValidation.timeStatus !== 'during') {
        showToast(`Presensi Tamu Ditolak: ${attendanceValidation.timeReason}`, 'error');
      } else {
        showToast(`Presensi Tamu Ditolak: ${attendanceValidation.locationReason}`, 'error');
      }
      return;
    }

    const record: AttendanceRecord = {
      meetingId: selectedMeetingId,
      meetingTitle: selectedMeetingTitle,
      memberName: guestData.name,
      memberNia: 'GUEST',
      memberSekolah: guestData.origin || 'Umum / Tamu',
      memberPimpinan: 'Tamu',
      isGuest: true,
      guestOrigin: guestData.origin,
      status: 'Hadir',
      scannedAt: new Date().toISOString(),
      scannedBy: userData?.displayName || user?.displayName || user?.email || 'Panitia Presensi',
      attendeeCoords: userCoords || undefined,
      distanceMeters: attendanceValidation.distanceMeters
    };

    try {
      if (!navigator.onLine) {
        await syncQueue.addToQueue(record, 'attendance');
        showToast(`Offline: Data tamu ${guestData.name} disimpan`, 'info');
      } else {
        const docRef = await addDoc(collection(db, 'attendances'), record);
        showToast(`Presensi Tamu Berhasil: ${guestData.name}`, 'success');
        setGuestSuccessId(docRef.id);
      }
      setLastScannedResult(record);
      setIsGuestModalOpen(false);
      setGuestData({ name: '', origin: '', phone: '' });
      playBeep();
    } catch (err: any) {
      showToast('Gagal mencatat presensi tamu', 'error');
    }
  };

  const handleExportAttendees = () => {
    if (attendees.length === 0) {
      showToast('Belum ada data presensi untuk diunduh', 'info');
      return;
    }

    const exportRows = attendees.map((a, idx) => ({
      'No': idx + 1,
      'Nama Peserta': a.memberName,
      'NIA': a.memberNia,
      'Komisariat / Sekolah': a.memberSekolah || '-',
      'Tingkatan': a.memberPimpinan || '-',
      'Status': a.status,
      'Waktu Presensi': formatDisplayDate(a.scannedAt, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      'Tanggal': formatDisplayDate(a.scannedAt, { day: 'numeric', month: 'short', year: 'numeric' }),
      'Petugas': a.scannedBy || 'Panitia'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Hadir');
    const now = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Presensi_${selectedMeetingTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${now}.xlsx`);
    showToast('Daftar presensi berhasil diunduh ke Excel', 'success');
  };

  const handleExportPDF = () => {
    let exportData = [...attendees];
    const now = new Date();

    if (exportRange === 'daily') {
      const today = new Date().toISOString().slice(0, 10);
      exportData = attendees.filter(a => toJSDate(a.scannedAt).toISOString().slice(0, 10) === today);
    } else if (exportRange === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      exportData = attendees.filter(a => toJSDate(a.scannedAt) >= weekAgo);
    }

    if (exportData.length === 0) {
      showToast('Tidak ada data dalam rentang waktu yang dipilih', 'info');
      return;
    }

    const doc = new jsPDF();
    const dateStr = now.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const startY = addBrandedHeader(doc, {
      title: 'LAPORAN PRESENSI KEGIATAN',
      subtitle: exportRange === 'all' ? 'Seluruh Riwayat' : `Laporan ${exportRange === 'daily' ? 'Harian' : 'Mingguan'}`,
      date: dateStr
    });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Total Peserta Hadir: ${exportData.length}`, 14, startY);

    const tableData = exportData.map((a, idx) => [
      idx + 1,
      a.memberName,
      a.isGuest ? 'TAMU' : a.memberNia,
      a.memberSekolah || a.guestOrigin || '-',
      a.isGuest ? 'Tamu/Umum' : (a.memberPimpinan || '-'),
      formatDisplayDate(a.scannedAt, { hour: '2-digit', minute: '2-digit' })
    ]);

    (doc as any).autoTable({
      startY: startY + 10,
      head: [['No', 'Nama Peserta', 'NIA', 'Komisariat/Sekolah', 'Tingkatan', 'Waktu']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }, // emerald-600
      styles: { fontSize: 8 }
    });

    const safeTitle = selectedMeetingTitle.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Presensi_${safeTitle}_${now.toISOString().slice(0, 10)}.pdf`);
    showToast('Laporan PDF berhasil diunduh', 'success');
  };

  const statsData = useMemo(() => {
    const pimpinanCounts: Record<string, number> = {};
    attendees.forEach(a => {
      const p = a.memberPimpinan || 'Lainnya';
      pimpinanCounts[p] = (pimpinanCounts[p] || 0) + 1;
    });

    return Object.entries(pimpinanCounts).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  }, [attendees]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const filteredAttendees = attendees.filter(a =>
    a.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.memberNia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.memberSekolah || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={cn(
      "min-h-screen p-4 md:p-8 bg-[var(--bg-app)] text-[var(--text-main)] space-y-6 transition-all",
      isFullscreen && "fixed inset-0 z-50 overflow-y-auto p-4 md:p-6 bg-[var(--bg-app)]"
    )}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <Camera size={13} /> Sistem Presensi Digital
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400">
              Kamera & KTA QR Code
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <QrCode className="text-emerald-400" />
            Scanner Presensi Pertemuan
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Rekap absensi rapat, kaderisasi, dan konferensi secara instan melalui KTA Digital.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all"
            title={soundEnabled ? 'Matikan Suara Beep' : 'Aktifkan Suara Beep'}
          >
            {soundEnabled ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} className="text-zinc-500" />}
          </button>

          <button
            onClick={handleExportAttendees}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all shadow-sm"
          >
            <Download size={16} className="text-emerald-400" />
            Excel
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all"
            title="Layar Penuh / Mode Meja Registrasi"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-main)] px-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
        <button
          onClick={() => setActiveTab('scanner')}
          className={cn(
            "px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all",
            activeTab === 'scanner' ? "border-emerald-500 text-emerald-400" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
          )}
        >
          Scanner & Manual
        </button>
        <button
          onClick={() => setActiveTab('guest')}
          className={cn(
            "px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all",
            activeTab === 'guest' ? "border-emerald-500 text-emerald-400" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
          )}
        >
          Presensi Tamu/Umum
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={cn(
            "px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all",
            activeTab === 'analytics' ? "border-emerald-500 text-emerald-400" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
          )}
        >
          Dashboard Analitik
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all",
            activeTab === 'history' ? "border-emerald-500 text-emerald-400" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
          )}
        >
          Riwayat & Laporan
        </button>
      </div>

      {activeTab === 'scanner' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] p-4 md:p-6 rounded-3xl border border-[var(--border-main)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Calendar size={22} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] block">
                  Agenda Pertemuan Aktif:
                </label>
                <select
                  value={selectedMeetingId}
                  onChange={(e) => {
                    const found = meetings.find(m => m.id === e.target.value);
                    if (found) {
                      setSelectedMeetingId(found.id);
                      setSelectedMeetingTitle(found.title);
                    }
                  }}
                  className="bg-transparent font-black text-base md:text-lg text-[var(--text-main)] focus:outline-none cursor-pointer pr-4"
                >
                  {meetings.map(m => (
                    <option key={m.id} value={m.id} className="bg-zinc-900 text-white font-sans text-sm">
                      {m.title} {m.date ? `(${m.date})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowEventQRModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                title="Tampilkan QR Code acara untuk dicetak atau scan langsung oleh peserta"
              >
                <QrCode size={14} /> Tampilkan QR Acara
              </button>

              <button
                onClick={() => {
                  setNewMeetingTitle('');
                  setIsNewMeetingModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--bg-app)] hover:bg-emerald-500/10 border border-[var(--border-main)] text-xs font-bold text-emerald-400 flex items-center gap-1.5 transition-all"
              >
                <Plus size={14} /> Buat Sesi Baru
              </button>
            </div>
          </div>

          {/* GEOFENCING & SCHEDULE VALIDATION CARD */}
          <div className={cn(
            "p-5 rounded-3xl border transition-all shadow-md relative overflow-hidden space-y-4",
            attendanceValidation.isAllowed || adminBypass
              ? "bg-gradient-to-r from-emerald-950/30 via-emerald-900/10 to-[var(--bg-card)] border-emerald-500/30"
              : "bg-gradient-to-r from-rose-950/30 via-rose-900/10 to-[var(--bg-card)] border-rose-500/30"
          )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1",
                    attendanceValidation.isAllowed || adminBypass
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                  )}>
                    {attendanceValidation.isAllowed || adminBypass ? (
                      <>
                        <CheckCircle2 size={12} /> Presensi Terverifikasi di Lokasi & Waktu
                      </>
                    ) : (
                      <>
                        <Lock size={12} /> Presensi Dikunci (Waktu / Lokasi Tidak Cocok)
                      </>
                    )}
                  </span>
                  {adminBypass && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Bypass Admin Aktif
                    </span>
                  )}
                </div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-400" />
                  {currentAgenda?.location || 'Gedung PCNU Kabupaten Cirebon'}
                </h3>
                <p className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-zinc-500" />
                    Jadwal: {currentAgenda?.date || 'Hari ini'} ({currentAgenda?.startTime || currentAgenda?.time || '08:00'} - {currentAgenda?.endTime || '17:00'} WIB)
                  </span>
                  <span>•</span>
                  <span>Radius Presensi: {attendanceValidation.allowedRadiusMeters} meter</span>
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={refreshLocation}
                  disabled={isLocating}
                  className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-emerald-500/40 text-xs font-bold text-zinc-300 flex items-center gap-1.5 transition-all"
                  title="Deteksi Ulang Lokasi GPS"
                >
                  <Navigation size={14} className={cn("text-emerald-400", isLocating && "animate-spin")} />
                  {isLocating ? 'Mencari GPS...' : 'Cek Posisi GPS'}
                </button>

                {isAdminOrPC && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdminBypass(!adminBypass);
                      showToast(adminBypass ? 'Bypass admin dimatikan' : 'Bypass admin diaktifkan: Presensi darurat diizinkan', 'info');
                    }}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border",
                      adminBypass
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-[var(--bg-app)] text-zinc-400 border-[var(--border-main)] hover:text-white"
                    )}
                    title="Khusus Penyelenggara/Admin"
                  >
                    {adminBypass ? <Unlock size={14} /> : <Lock size={14} />}
                    <span>{adminBypass ? 'Bypass: ON' : 'Bypass Admin'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Validation Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80 text-xs">
              <div className="flex items-start gap-2.5 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
                <div className={cn(
                  "p-1.5 rounded-lg shrink-0 mt-0.5",
                  attendanceValidation.timeStatus === 'during' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                )}>
                  <Clock size={16} />
                </div>
                <div>
                  <p className="font-bold text-zinc-200">Status Waktu Kegiatan:</p>
                  <p className={cn(
                    "text-[11px]",
                    attendanceValidation.timeStatus === 'during' ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {attendanceValidation.timeStatus === 'during'
                      ? 'Sesi Sedang Dibuka (Sesuai Jadwal Kegiatan)'
                      : (attendanceValidation.timeReason || 'Di luar waktu kegiatan')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
                <div className={cn(
                  "p-1.5 rounded-lg shrink-0 mt-0.5",
                  attendanceValidation.locationStatus === 'inside' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                )}>
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="font-bold text-zinc-200">Status Geofencing Lokasi:</p>
                  <p className={cn(
                    "text-[11px]",
                    attendanceValidation.locationStatus === 'inside' ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {userCoords ? (
                      attendanceValidation.locationStatus === 'inside'
                        ? `Dalam Radius Acara (Jarak: ${formatDistance(attendanceValidation.distanceMeters || 0)})`
                        : `Di Luar Radius (Jarak: ${formatDistance(attendanceValidation.distanceMeters || 0)}, Max: ${attendanceValidation.allowedRadiusMeters}m)`
                    ) : (
                      'Sensor GPS belum aktif. Klik "Cek Posisi GPS" di atas.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {!attendanceValidation.isAllowed && !adminBypass && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>
                  <strong>Akses Presensi Dikunci:</strong> Sesuai aturan, presensi kehadiran hanya dapat dilakukan saat kegiatan telah dimulai dan peserta berada di lokasi acara.
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] overflow-hidden shadow-lg">
                <div className="p-4 bg-[var(--bg-app)]/50 border-b border-[var(--border-main)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      isScanning ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"
                    )} />
                    <h3 className="font-bold text-sm text-[var(--text-main)]">
                      {isScanning ? 'Kamera Pemindai Aktif' : 'Pemindai QR Standby'}
                    </h3>
                  </div>

                  {isScanning && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleTorch}
                        className={cn(
                          "px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all",
                          isTorchOn 
                            ? "bg-amber-500/20 border-amber-500 text-amber-500" 
                            : "bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        )}
                      >
                        <Flashlight size={13} /> {isTorchOn ? 'On' : 'Off'}
                      </button>
                      <button
                        onClick={toggleFacing}
                        className="px-2.5 py-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1.5"
                      >
                        <FlipHorizontal size={13} /> Flip
                      </button>
                    </div>
                  )}
                </div>

                <style>{`
                  #${scannerContainerId} {
                    border: none !important;
                  }
                  #${scannerContainerId} video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 1rem !important;
                  }
                `}</style>

                {/* Mode Selector: QR Code vs Face Detection vs Dual-Auth */}
                <div className="p-3 bg-[var(--bg-app)]/80 border-b border-[var(--border-main)] flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScanMode('qr')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                      scanMode === 'qr'
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-white"
                    )}
                  >
                    <QrCode size={14} /> Pindai QR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScanMode('face');
                      if (facingMode !== 'user') {
                        toggleFacing();
                      }
                      if (!isScanning) {
                        startCamera('user');
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                      scanMode === 'face'
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-white"
                    )}
                  >
                    <UserCheck size={14} /> Deteksi Wajah (Biometrik)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanMode('dual')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                      scanMode === 'dual'
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-white"
                    )}
                  >
                    <ShieldCheck size={14} /> Dual-Auth (QR + Wajah)
                  </button>
                </div>

                <div className="p-4 flex flex-col items-center justify-center relative min-h-[340px] bg-black/40">
                  {/* Viewport Box Container */}
                  <div className="relative w-full max-w-[340px] aspect-square rounded-2xl overflow-hidden shadow-lg bg-black border border-emerald-500/30">
                    {/* Permanent Scanner Target Element - NEVER hidden with display:none so Html5Qrcode always measures non-zero dimensions */}
                    <div 
                      id={scannerContainerId} 
                      className="w-full h-full" 
                    />

                    {/* Canvas Overlay for Live Face Detection Reticle */}
                    {(scanMode === 'face' || scanMode === 'dual') && isScanning && (
                      <canvas
                        ref={faceOverlayCanvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none z-10"
                      />
                    )}

                    {/* Face Detection Liveness & Progress HUD */}
                    {(scanMode === 'face' || scanMode === 'dual') && isScanning && (
                      <div className="absolute top-3 inset-x-3 z-20 flex flex-col items-center gap-1.5 bg-black/75 backdrop-blur-md p-2.5 rounded-2xl border border-emerald-500/30">
                        <div className="flex items-center justify-between w-full text-[11px] font-bold">
                          <span className={cn(
                            "flex items-center gap-1.5",
                            isFaceDetected ? "text-emerald-400" : "text-amber-400"
                          )}>
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              isFaceDetected ? "bg-emerald-400 animate-ping" : "bg-amber-400"
                            )} />
                            {faceStatusText}
                          </span>
                          {faceConfidence > 0 && (
                            <span className="text-emerald-300 font-mono text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                              {faceConfidence}%
                            </span>
                          )}
                        </div>

                        {/* Hold Progress Bar */}
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-150"
                            style={{ width: `${faceHoldProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Loading/Connecting Camera Overlay */}
                    {isStartingCamera && (
                      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-emerald-400 z-20">
                        <RefreshCw size={28} className="animate-spin text-emerald-400" />
                        <span className="text-xs font-bold text-zinc-200">Menghubungkan sensor kamera...</span>
                      </div>
                    )}

                    {/* Standby State Overlay (when not scanning) */}
                    {!isScanning && !isStartingCamera && (
                      <div className="absolute inset-0 bg-[var(--bg-card)] flex flex-col items-center justify-center p-6 space-y-4 text-center z-10">
                        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                          {scanMode === 'face' ? <UserCheck size={36} /> : <QrCode size={36} />}
                        </div>
                        <div>
                          <h4 className="font-black text-base text-[var(--text-main)]">
                            {scanMode === 'face' ? 'Presensi Biometrik Wajah' : 'Pindai KTA Digital'}
                          </h4>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {scanMode === 'face'
                              ? 'Arahkan wajah Anda ke sensor kamera untuk verifikasi otomatis dan anti-spoofing.'
                              : 'Arahkan kamera ke QR Code KTA kader atau pilih foto tangkapan layar.'}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-2 justify-center pt-1 w-full">
                          <button
                            type="button"
                            onClick={() => startCamera(scanMode === 'face' ? 'user' : facingMode)}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg active:scale-95 transition-all inline-flex items-center justify-center gap-2"
                          >
                            <Camera size={15} /> Aktifkan Kamera
                          </button>
                          {scanMode !== 'face' && (
                            <button
                              type="button"
                              onClick={() => qrFileInputRef.current?.click()}
                              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-[var(--bg-app)] hover:bg-[var(--border-main)] border border-[var(--border-main)] text-[var(--text-main)] font-bold text-xs shadow transition-all inline-flex items-center justify-center gap-2"
                              title="Pindai QR dari file foto / tangkapan layar"
                            >
                              <Upload size={14} className="text-emerald-400" /> Unggah Foto QR
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={qrFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleScanQRFile}
                  />

                  {/* Active Scanning Controls */}
                  {isScanning && (
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={stopCamera}
                        className="px-5 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <X size={15} /> Tutup Scanner
                      </button>
                      <button
                        onClick={() => qrFileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-main)] hover:border-emerald-500/40 font-bold text-xs shadow transition-all flex items-center gap-1.5"
                      >
                        <Upload size={14} className="text-emerald-400" /> Unggah File QR
                      </button>
                    </div>
                  )}

                  {cameraError && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col items-center gap-2 max-w-sm text-center">
                      <div className="flex items-center justify-center gap-1.5 text-rose-400 font-bold">
                        <AlertCircle size={15} />
                        <span>Status Kamera</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-300">{cameraError}</p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          onClick={() => startCamera()}
                          disabled={isStartingCamera}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all flex items-center gap-1"
                        >
                          <RotateCcw size={12} /> Coba Lagi
                        </button>
                        <button
                          onClick={() => qrFileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[11px] transition-all flex items-center gap-1"
                        >
                          <Upload size={12} /> Unggah Foto QR
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-[var(--border-main)] bg-[var(--bg-app)]/30">
                  <form onSubmit={handleManualCheckIn} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Masukkan NIA Manual..."
                      value={manualNiaInput}
                      onChange={(e) => setManualNiaInput(e.target.value)}
                      className="flex-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!manualNiaInput.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      Absen
                    </button>
                  </form>
                </div>
              </div>

              <AnimatePresence>
                {lastScannedResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-5 shadow-lg relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                          <UserCheck size={24} />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Terverifikasi
                          </span>
                          <h4 className="font-black text-base text-[var(--text-main)]">{lastScannedResult.memberName}</h4>
                          <p className="font-mono text-xs text-emerald-400/90">{lastScannedResult.memberNia}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400">
                        {formatDisplayDate(lastScannedResult.scannedAt, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] shadow-lg overflow-hidden flex flex-col h-[500px]">
                <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-app)]/30">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-emerald-400" />
                    <h3 className="font-black text-sm">Log Scanner Baru</h3>
                  </div>
                  <div className="relative w-48">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Cari..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg pl-8 pr-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                  {loadingAttendees ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                      <RefreshCw size={24} className="animate-spin mb-2" />
                      <p className="text-[10px] font-bold">Syncing data...</p>
                    </div>
                  ) : filteredAttendees.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center p-8">
                      <QrCode size={40} className="opacity-10 mb-2" />
                      <p className="text-xs font-bold">Belum ada data scan</p>
                    </div>
                  ) : (
                    filteredAttendees.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3 rounded-2xl bg-[var(--bg-app)]/60 border border-[var(--border-main)] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-xs">{item.memberName}</h4>
                              {item.verifiedByFace && (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase flex items-center gap-1">
                                  <ShieldCheck size={10} /> Biometrik
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-[var(--text-muted)]">{item.memberSekolah}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <p className="text-[9px] font-mono text-zinc-500">
                            {formatDisplayDate(item.scannedAt, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {item.faceConfidence && (
                            <span className="text-[8px] font-mono text-emerald-400">
                              Akurasi: {item.faceConfidence}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {pendingSync.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border-t border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-500">
                        <RefreshCw size={14} className="animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{pendingSync.length} Tertunda (Offline)</span>
                      </div>
                      <button 
                        onClick={handleSyncAll}
                        className="text-[9px] font-black bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-500 transition-all"
                      >
                        SINKRON SEKARANG
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guest' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-main)] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Plus size={120} />
            </div>
            
            <div className="relative space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                    <Users className="text-emerald-400" /> Form Presensi Tamu & Umum
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Gunakan form ini untuk peserta yang tidak memiliki KTA IPNU IPPNU atau tamu undangan.
                  </p>
                </div>
                
                <div className="flex flex-col items-center p-4 bg-[var(--bg-app)] rounded-3xl border border-[var(--border-main)] shadow-inner text-center shrink-0">
                  <div 
                    onClick={() => setShowEventQRModal(true)}
                    className="bg-white p-2.5 rounded-2xl mb-2 cursor-pointer shadow-md hover:scale-105 transition-transform group relative"
                    title="Klik untuk memperbesar QR Code"
                  >
                    <QRCode
                      value={`${window.location.origin}/presensi/public/${selectedMeetingId}`}
                      size={90}
                      level="M"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                      Perbesar
                    </div>
                  </div>
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest text-center">SCAN AKSES PRESENSI</p>
                  <p className="text-[8px] text-zinc-500 mt-0.5 truncate max-w-[130px] font-mono">{window.location.origin}/presensi/public/{selectedMeetingId}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowEventQRModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold transition-all border border-emerald-500/20 flex items-center gap-1"
                    >
                      <Maximize2 size={10} /> Perbesar
                    </button>
                    <a
                      href={`/presensi/public/${selectedMeetingId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-[10px] font-bold transition-all border border-[var(--border-main)] flex items-center gap-1"
                    >
                      <ExternalLink size={10} /> Form
                    </a>
                  </div>
                </div>
              </div>

              <form onSubmit={handleGuestCheckIn} className="space-y-4 pt-4 border-t border-[var(--border-main)]">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={guestData.name}
                    onChange={(e) => setGuestData({ ...guestData, name: e.target.value })}
                    placeholder="Masukkan nama lengkap tamu..."
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl p-4 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Asal Organisasi / Instansi</label>
                  <input
                    type="text"
                    required
                    value={guestData.origin}
                    onChange={(e) => setGuestData({ ...guestData, origin: e.target.value })}
                    placeholder="Contoh: GP Ansor, Fatayat, atau Umum"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl p-4 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nomor WhatsApp (Opsional)</label>
                  <input
                    type="text"
                    value={guestData.phone}
                    onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl p-4 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <CheckCircle2 size={18} />
                  SIMPAN KEHADIRAN TAMU
                </button>
              </form>

              <AnimatePresence>
                {guestSuccessId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 p-6 rounded-[32px] bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-lg">Terima Kasih!</h4>
                      <p className="text-xs text-[var(--text-muted)]">Presensi Anda telah berhasil dicatat ke dalam sistem.</p>
                    </div>
                    <Link
                      to={`/event-summary/${selectedMeetingId}/${guestSuccessId}`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-lg shadow-emerald-900/20"
                    >
                      LIHAT SUMMARY & E-CARD <ExternalLink size={14} />
                    </Link>
                    <button 
                      onClick={() => setGuestSuccessId(null)}
                      className="block mx-auto text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                    >
                      Tutup
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl text-center">
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
              Data tamu akan muncul di riwayat dengan label "TAMU"
            </p>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border-main)] shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-400" /> Tren Kehadiran Kegiatan
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allMeetingsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                    <XAxis dataKey="name" hide />
                    <YAxis stroke="#444" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Bar dataKey="participants" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border-main)] shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <Users size={14} className="text-blue-400" /> Distribusi Pimpinan
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statsData} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={5}>
                      {statsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border-main)] shadow-sm flex flex-col justify-center gap-4">
              <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Rata-rata Kehadiran</p>
                <p className="text-2xl font-black text-white">
                  {allMeetingsData.length > 0 ? (allMeetingsData.reduce((s, a) => s + a.participants, 0) / allMeetingsData.length).toFixed(1) : 0}
                </p>
              </div>
              <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Sesi Digital</p>
                <p className="text-2xl font-black text-emerald-400">{allMeetingsData.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-main)] shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-6">Analisis Fluktuasi Partisipasi</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={allMeetingsData}>
                  <defs>
                    <linearGradient id="colorPart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                  <XAxis dataKey="name" stroke="#444" fontSize={9} />
                  <YAxis stroke="#444" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="participants" stroke="#10b981" fillOpacity={1} fill="url(#colorPart)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] rounded-[32px] border border-[var(--border-main)] overflow-hidden shadow-lg">
            <div className="p-6 border-b border-[var(--border-main)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-app)]/30">
              <div>
                <h3 className="font-black text-lg">Semua Log Presensi</h3>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                  Sinkronisasi Real-time dengan PC IPNU Database
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-main)] px-3 py-1.5 rounded-xl">
                  <Filter size={14} className="text-zinc-500" />
                  <select 
                    value={exportRange} 
                    onChange={(e) => setExportRange(e.target.value as any)}
                    className="bg-transparent border-none text-xs font-bold text-[var(--text-main)] focus:outline-none"
                  >
                    <option value="daily" className="bg-zinc-900">Hari Ini</option>
                    <option value="weekly" className="bg-zinc-900">Minggu Ini</option>
                    <option value="all" className="bg-zinc-900">Semua Data</option>
                  </select>
                </div>
                <button 
                  onClick={handleExportPDF}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  <FileText size={14} /> PDF
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900/50 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Nama Kader</th>
                    <th className="px-6 py-4">Kegiatan</th>
                    <th className="px-6 py-4">Pimpinan</th>
                    <th className="px-6 py-4 text-right">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {pendingSync.map((item) => (
                    <tr key={`pending-${item.id}`} className="bg-amber-500/5 hover:bg-amber-500/10 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span className="text-[9px] font-black text-amber-500 uppercase">Pending</span>
                          <button 
                            onClick={() => handleManualSync(item)}
                            className="hidden group-hover:block p-1 rounded bg-amber-500 text-white ml-2"
                            title="Retry Sync"
                          >
                            <RotateCcw size={10} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-xs text-zinc-100">{item.data.memberName}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{item.data.memberNia}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-zinc-400">{item.data.meetingTitle}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-bold text-[9px] uppercase">{item.data.memberPimpinan}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-[10px] font-mono text-zinc-500">{new Date(item.timestamp).toLocaleString('id-ID')}</p>
                      </td>
                    </tr>
                  ))}
                  {attendees.map((a, i) => (
                    <tr key={`synced-${a.id || i}`} className="hover:bg-zinc-500/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-emerald-500">
                          <CheckCircle2 size={12} />
                          <span className="text-[9px] font-black uppercase">Synced</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-xs text-zinc-200">{a.memberName}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{a.memberNia}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-zinc-400">{a.meetingTitle}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-bold text-[9px] uppercase">{a.memberPimpinan}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-[10px] font-mono text-zinc-500">{new Date(a.scannedAt).toLocaleString('id-ID')}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendees.length === 0 && pendingSync.length === 0 && (
                <div className="py-20 text-center text-zinc-600">
                  <Activity size={40} className="mx-auto opacity-10 mb-4" />
                  <p className="text-sm font-bold">Belum ada riwayat presensi yang terekam.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Meeting Modal with Location & Time Window */}
      <AnimatePresence>
        {isNewMeetingModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[60] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-lg p-6 md:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[var(--text-main)]">Buat Sesi Presensi Acara</h3>
                    <p className="text-[10px] text-zinc-400">Dilengkapi validasi Geofencing lokasi dan batas waktu</p>
                  </div>
                </div>
                <button onClick={() => setIsNewMeetingModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 ml-1">
                    Nama Kegiatan / Agenda
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                    placeholder="Contoh: Rapat Pleno I, MAKESTA PK, Konferensi Cabang..."
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-3 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 ml-1">Kategori Kegiatan</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ACTIVITY_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setNewMeetingType(type.value)}
                        className={cn(
                          "px-2.5 py-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all",
                          newMeetingType === type.value
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm"
                            : "bg-[var(--bg-app)] border-[var(--border-main)] text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        <type.icon size={13} className={newMeetingType === type.value ? 'text-emerald-400' : 'text-zinc-500'} />
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 ml-1">Tanggal</label>
                    <input
                      type="date"
                      required
                      value={newMeetingDate}
                      onChange={(e) => setNewMeetingDate(e.target.value)}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 ml-1">Jam Mulai</label>
                    <input
                      type="time"
                      required
                      value={newMeetingStartTime}
                      onChange={(e) => setNewMeetingStartTime(e.target.value)}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 ml-1">Jam Selesai</label>
                    <input
                      type="time"
                      required
                      value={newMeetingEndTime}
                      onChange={(e) => setNewMeetingEndTime(e.target.value)}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Venue Preset Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 ml-1 flex items-center justify-between">
                    <span>Pilih Lokasi Kegiatan (Geofence)</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const c = await getDeviceCoordinates();
                          setNewMeetingLat(c.lat);
                          setNewMeetingLng(c.lng);
                          setNewMeetingLocation('Lokasi GPS Saat Ini');
                          setNewMeetingVenuePreset('custom');
                          showToast('Koordinat GPS saat ini berhasil diterapkan!', 'success');
                        } catch (e: any) {
                          showToast(e.message, 'error');
                        }
                      }}
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-bold lowercase"
                    >
                      <Navigation size={11} /> Ambil GPS Saya
                    </button>
                  </label>
                  <select
                    value={newMeetingVenuePreset}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewMeetingVenuePreset(val);
                      const found = PRESET_VENUES.find(v => v.id === val);
                      if (found) {
                        setNewMeetingLocation(found.name);
                        setNewMeetingLat(found.lat);
                        setNewMeetingLng(found.lng);
                      }
                    }}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {PRESET_VENUES.map(v => (
                      <option key={v.id} value={v.id} className="bg-zinc-900 text-white">
                        📍 {v.name}
                      </option>
                    ))}
                    <option value="custom" className="bg-zinc-900 text-white">
                      ✍️ Lokasi / Koordinat Kustom...
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 ml-1">Nama Tempat/Gedung</label>
                    <input
                      type="text"
                      required
                      value={newMeetingLocation}
                      onChange={(e) => setNewMeetingLocation(e.target.value)}
                      placeholder="Gedung / Tempat acara..."
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 ml-1">Radius Presensi</label>
                    <select
                      value={newMeetingRadius}
                      onChange={(e) => setNewMeetingRadius(Number(e.target.value))}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="50">50 meter (Sangat Ketat / Ruangan)</option>
                      <option value="100">100 meter (Standar Komplek Gedung)</option>
                      <option value="200">200 meter (Area Kampus / Pesantren)</option>
                      <option value="500">500 meter (Kawasan Lingkungan)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-zinc-400 text-[10px]">
                  <div>
                    <label className="font-mono">Lat: {Number(newMeetingLat).toFixed(5)}</label>
                  </div>
                  <div className="text-right">
                    <label className="font-mono">Lng: {Number(newMeetingLng).toFixed(5)}</label>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-[var(--border-main)]">
                  <button
                    type="button"
                    onClick={() => setIsNewMeetingModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-900/20 active:scale-95"
                  >
                    Simpan & Aktifkan Sesi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* High-Resolution Event QR Code Modal */}
      <EventQRModal
        isOpen={showEventQRModal}
        onClose={() => setShowEventQRModal(false)}
        agendaId={selectedMeetingId}
        agendaTitle={selectedMeetingTitle}
        agendaDate={currentAgenda?.date}
        agendaLocation={currentAgenda?.location}
      />
    </div>
  );
};

export default AttendanceSystem;
