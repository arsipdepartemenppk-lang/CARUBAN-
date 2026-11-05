import React, { useState, useEffect } from 'react';
import { Joyride, Step } from 'react-joyride';

const OnboardingTour: React.FC = () => {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      setRun(true);
    }
  }, []);

  const steps: Step[] = [
    {
      target: '#tour-logo',
      content: 'Selamat datang di CARUBAN Core Platform! Ini adalah pusat kendali Anda.',
    },
    {
      target: '#tour-nav-home',
      content: 'Beranda: Akses ringkasan dan informasi terbaru di sini.',
    },
    {
      target: '#tour-nav-anggota',
      content: 'Anggota: Lihat daftar dan kelola data anggota.',
    },
    {
      target: '#tour-nav-agenda',
      content: 'Agenda: Pantau jadwal kegiatan dan acara penting.',
    },
    {
      target: '#tour-nav-alquran',
      content: 'Al-Quran: Baca dan pelajari Al-Quran dengan fitur pendukung.',
    },
    {
      target: '#tour-nav-amaliah',
      content: 'Amaliah: Catat dan pantau kegiatan amaliah harian.',
    },
    {
      target: '#tour-nav-perpustakaan',
      content: 'Perpustakaan: Akses koleksi buku dan materi pembelajaran.',
    },
    {
      target: '#tour-nav-chat',
      content: 'Chat E2EE: Komunikasi aman antar anggota.',
    },
    {
      target: '#tour-nav-kaderisasi',
      content: 'Kaderisasi: Pantau proses pengembangan kader.',
    },
    {
      target: '#tour-nav-beasiswa',
      content: 'Beasiswa: Informasi dan pengajuan beasiswa.',
    },
    {
      target: '#tour-nav-core',
      content: 'Modul CORE: Akses aturan dan leaderboard CORE.',
    },
    {
      target: '#tour-nav-database-pimpinan',
      content: 'Database Pimpinan: Kelola data pimpinan organisasi.',
    },
    {
      target: '#tour-nav-visitasi',
      content: 'Visitasi: Jadwal dan laporan kunjungan.',
    },
    {
      target: '#tour-nav-maps',
      content: 'Peta PK: Lihat persebaran Pimpinan Komisariat.',
    },
    {
      target: '#tour-nav-laporan',
      content: 'Dashboard: Analisis data dan laporan kinerja.',
    },
    {
      target: '#tour-notifications',
      content: 'Pantau notifikasi penting dan update terbaru di sini.',
    },
    {
      target: '#tour-profile',
      content: 'Kelola profil, pengaturan, dan logout dari akun Anda.',
    },
  ];

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    if (status === 'finished' || status === 'skipped') {
      localStorage.setItem('hasSeenTour', 'true');
      setRun(false);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
    />
  );
};

export default OnboardingTour;
