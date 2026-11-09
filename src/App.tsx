import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazyWithRetry } from './components/LazyRoute';
import { ThemeProvider } from './components/ThemeProvider';
import { FirebaseProvider } from './components/FirebaseProvider';
import { NotificationProvider } from './components/NotificationProvider';
import { ToastProvider } from './components/Toast';
import AppLayout from './components/Layout/AppLayout';
import { AIWidget } from './components/AIWidget';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy-loaded pages with retry
const Beranda = lazyWithRetry(() => import('./pages/Beranda'));
const DataAnggota = lazyWithRetry(() => import('./pages/DataAnggota'));
const DataMasterPK = lazyWithRetry(() => import('./pages/DataMasterPK'));
const DataVisitasi = lazyWithRetry(() => import('./pages/DataVisitasi'));
const Maps = lazyWithRetry(() => import('./pages/Maps'));
const Pelaporan = lazyWithRetry(() => import('./pages/Pelaporan'));
const AlQuran = lazyWithRetry(() => import('./pages/AlQuran'));
const Amaliah = lazyWithRetry(() => import('./pages/Amaliah'));
const PerpustakaanAI = lazyWithRetry(() => import('./pages/PerpustakaanAI'));
const ChatE2EE = lazyWithRetry(() => import('./pages/ChatE2EE'));
const PengembanganKader = lazyWithRetry(() => import('./pages/PengembanganKader'));
const ProfilPengguna = lazyWithRetry(() => import('./pages/ProfilPengguna'));
const Panduan = lazyWithRetry(() => import('./pages/Panduan'));
const Donasi = lazyWithRetry(() => import('./pages/Donasi'));
const Stories = lazyWithRetry(() => import('./pages/Stories'));
const Beasiswa = lazyWithRetry(() => import('./pages/Beasiswa'));
const Agenda = lazyWithRetry(() => import('./pages/Agenda'));
const TemplateSurat = lazyWithRetry(() => import('./pages/TemplateSurat'));
const SuratMasuk = lazyWithRetry(() => import('./pages/SuratMasuk'));
const SuratKeluar = lazyWithRetry(() => import('./pages/SuratKeluar'));
const Core = lazyWithRetry(() => import('./pages/Core'));
const CoreRules = lazyWithRetry(() => import('./pages/CoreRules'));
const Leaderboard = lazyWithRetry(() => import('./pages/Leaderboard'));
const DatabasePimpinan = lazyWithRetry(() => import('./pages/DatabasePimpinan'));
const AdminUserManagement = lazyWithRetry(() => import('./pages/AdminUserManagement'));
const AdminPKManagement = lazyWithRetry(() => import('./pages/AdminPKManagement'));
const PengaturanUser = lazyWithRetry(() => import('./pages/PengaturanUser'));
const ZakatFitrah = lazyWithRetry(() => import('./pages/ZakatFitrah'));
const AttendanceSystem = lazyWithRetry(() => import('./pages/AttendanceSystem'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const VerifySurat = lazyWithRetry(() => import('./pages/VerifySurat'));
const EventSummary = lazyWithRetry(() => import('./pages/EventSummary'));

const PublicAttendance = lazyWithRetry(() => import('./pages/PublicAttendance'));
const MediaStorage = lazyWithRetry(() => import('./pages/MediaStorage'));

// Page loader placeholder
const PageLoader = () => (
  <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center gap-3">
    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Memuat Halaman...</p>
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <FirebaseProvider>
        <NotificationProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Authentication & Verification Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/verify/:id" element={<VerifySurat />} />
                  <Route path="/verify" element={<VerifySurat />} />
                  <Route path="/event-summary/:agendaId/:attendanceId" element={<EventSummary />} />
                  <Route path="/event-summary/:agendaId" element={<EventSummary />} />
                  <Route path="/presensi/public/:agendaId" element={<PublicAttendance />} />

                  {/* Authenticated Application Layout Routes */}
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Beranda />} />
                    <Route path="/anggota" element={<DataAnggota />} />
                    
                    {/* Master PK */}
                    <Route path="/master-pk" element={<DataMasterPK />} />
                    <Route path="/pk" element={<DataMasterPK />} />
                    <Route path="/pk-management" element={
                      <ProtectedRoute allowedRoles={['admin', 'developer', 'PC']}>
                        <AdminPKManagement />
                      </ProtectedRoute>
                    } />

                    {/* Visitasi & Monitoring */}
                    <Route path="/visitasi" element={
                      <ProtectedRoute allowedRoles={['admin', 'developer', 'PC', 'PAC', 'PK']}>
                        <DataVisitasi />
                      </ProtectedRoute>
                    } />
                    
                    {/* Maps & Geolocation */}
                    <Route path="/maps" element={<Maps />} />
                    <Route path="/peta" element={<Maps />} />

                    {/* Laporan & Analytics */}
                    <Route path="/laporan" element={
                      <ProtectedRoute allowedRoles={['admin', 'developer', 'PC', 'PAC', 'PK']}>
                        <Pelaporan />
                      </ProtectedRoute>
                    } />
                    <Route path="/pelaporan" element={
                      <ProtectedRoute allowedRoles={['admin', 'developer', 'PC', 'PAC', 'PK']}>
                        <Pelaporan />
                      </ProtectedRoute>
                    } />

                    {/* Layanan Keagamaan */}
                    <Route path="/alquran" element={<AlQuran />} />
                    <Route path="/amaliah" element={<Amaliah />} />
                    <Route path="/zakat" element={<ZakatFitrah />} />

                    {/* AI & Perpustakaan */}
                    <Route path="/perpustakaan" element={<PerpustakaanAI />} />

                    {/* Komunikasi */}
                    <Route path="/chat" element={<ChatE2EE />} />
                    <Route path="/stories" element={<Stories />} />

                    {/* Kaderisasi & Beasiswa */}
                    <Route path="/kaderisasi" element={<PengembanganKader />} />
                    <Route path="/beasiswa" element={<Beasiswa />} />
                    <Route path="/donasi" element={<Donasi />} />

                    {/* Administrasi & Persuratan */}
                    <Route path="/agenda" element={<Agenda />} />
                    <Route path="/presensi" element={<AttendanceSystem />} />
                    <Route path="/attendance" element={<AttendanceSystem />} />
                    <Route path="/media" element={<MediaStorage />} />
                    <Route path="/penyimpanan-media" element={<MediaStorage />} />
                    <Route path="/galeri-media" element={<MediaStorage />} />
                    <Route path="/templates" element={<TemplateSurat />} />
                    <Route path="/template-surat" element={<TemplateSurat />} />
                    <Route path="/surat-masuk" element={<SuratMasuk />} />
                    <Route path="/surat-keluar" element={<SuratKeluar />} />

                    {/* Modul CORE & Evaluasi */}
                    <Route path="/core" element={
                      <ProtectedRoute allowedRoles={['admin', 'developer', 'PC', 'PAC', 'PK']}>
                        <Core />
                      </ProtectedRoute>
                    } />
                    <Route path="/core-rules" element={<CoreRules />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/database-pimpinan" element={
                      <ProtectedRoute allowedRoles={['admin', 'developer', 'PC', 'PAC', 'PK', 'PR', 'Pengurus']}>
                        <DatabasePimpinan />
                      </ProtectedRoute>
                    } />

                    {/* Pengaturan & Profil */}
                    <Route path="/profile" element={<ProfilPengguna />} />
                    <Route path="/settings" element={<PengaturanUser />} />
                    <Route path="/pengaturan" element={<PengaturanUser />} />
                    <Route path="/panduan" element={<Panduan />} />

                    {/* Admin Panel - Strict Super Admin & Developer Only */}
                    <Route path="/admin/users" element={
                      <ProtectedRoute allowedRoles={['admin', 'developer']}>
                        <AdminUserManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/roles" element={
                      <ProtectedRoute allowedRoles={['admin', 'developer']}>
                        <AdminUserManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/hak-akses" element={
                      <ProtectedRoute allowedRoles={['admin', 'developer']}>
                        <AdminUserManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/pk" element={
                      <ProtectedRoute allowedRoles={['admin', 'developer']}>
                        <AdminPKManagement />
                      </ProtectedRoute>
                    } />
                  </Route>

                  {/* Fallback Catch-all Route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>

              {/* Floating AI Assistant Widget */}
              <AIWidget />
            </BrowserRouter>
          </ToastProvider>
        </NotificationProvider>
      </FirebaseProvider>
    </ThemeProvider>
  );
}
