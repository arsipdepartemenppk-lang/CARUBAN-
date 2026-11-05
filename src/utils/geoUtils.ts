/**
 * Geolocation & Event Schedule Utilities for Caruban Core
 * Validates participant distance to event venue and operational check-in hours.
 */

export interface EventVenue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
}

export const PRESET_VENUES: EventVenue[] = [
  {
    id: 'pcnu-cirebon',
    name: 'Gedung PCNU Kabupaten Cirebon',
    lat: -6.7588,
    lng: 108.4832,
    address: 'Jl. Dewi Sartika No. 9 Sumber, Cirebon'
  },
  {
    id: 'sekretariat-ipnu',
    name: 'Sekretariat PC IPNU Kab. Cirebon',
    lat: -6.7621,
    lng: 108.4876,
    address: 'Komplek PCNU Sumber, Cirebon'
  },
  {
    id: 'islamic-centre',
    name: 'Islamic Centre Cirebon (Tuparev)',
    lat: -6.7135,
    lng: 108.5412,
    address: 'Jl. Tuparev, Cirebon'
  },
  {
    id: 'babakan-ciwaringin',
    name: 'Pondok Pesantren Babakan Ciwaringin',
    lat: -6.6892,
    lng: 108.3814,
    address: 'Ciwaringin, Kabupaten Cirebon'
  },
  {
    id: 'buntet-pesantren',
    name: 'Pondok Buntet Pesantren Astanajapura',
    lat: -6.7794,
    lng: 108.5831,
    address: 'Mertapadapena, Astanajapura, Cirebon'
  },
  {
    id: 'kempek-palimanan',
    name: 'Pondok Pesantren Kempek Palimanan',
    lat: -6.7028,
    lng: 108.4239,
    address: 'Kempek, Gempol, Cirebon'
  },
  {
    id: 'ranggajati-sumber',
    name: 'GOR & Stadion Ranggajati Sumber',
    lat: -6.7612,
    lng: 108.4819,
    address: 'Sumber, Kabupaten Cirebon'
  }
];

/**
 * Calculates distance between two GPS coordinates in meters using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats meter distance into user friendly readable string (e.g. 45m or 1.2 km).
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} meter`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export interface DeviceLocationResult {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

/**
 * Retrieves the device's current GPS coordinates with high accuracy.
 */
export function getDeviceCoordinates(): Promise<DeviceLocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Perangkat atau peramban tidak mendukung sensor lokasi (GPS).'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp
        });
      },
      (err) => {
        let msg = 'Gagal mendeteksi lokasi.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Akses lokasi ditolak. Harap izinkan akses lokasi (GPS) pada peramban Anda.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'Informasi lokasi tidak tersedia. Pastikan GPS perangkat Anda aktif.';
            break;
          case err.TIMEOUT:
            msg = 'Waktu permintaan lokasi habis. Coba posisikan perangkat di area terbuka.';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );
  });
}

export interface AttendanceValidationResult {
  isAllowed: boolean;
  canBypass?: boolean;
  timeStatus: 'before' | 'during' | 'after';
  timeReason?: string;
  locationStatus: 'inside' | 'outside' | 'no_coords' | 'loc_error';
  locationReason?: string;
  distanceMeters?: number;
  allowedRadiusMeters: number;
  targetVenueName: string;
}

/**
 * Validates if the participant is eligible for check-in based on location and schedule.
 */
export function validateAttendanceEligibility(
  agenda: {
    date?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    enforceLocation?: boolean;
    enforceTime?: boolean;
  },
  userCoords?: { lat: number; lng: number } | null
): AttendanceValidationResult {
  const allowedRadius = agenda.radiusMeters || 100; // default 100 meters
  const venueName = agenda.location || 'Lokasi Kegiatan';
  const enforceLocation = agenda.enforceLocation !== false;
  const enforceTime = agenda.enforceTime !== false;

  const now = new Date();
  let timeStatus: 'before' | 'during' | 'after' = 'during';
  let timeReason: string | undefined = undefined;

  // 1. Time / Schedule Validation
  if (enforceTime && agenda.date) {
    const agendaDateStr = agenda.date.slice(0, 10);
    const currentDateStr = now.toISOString().slice(0, 10);

    const startTimeStr = agenda.startTime || agenda.time || '08:00';
    const endTimeStr = agenda.endTime || '23:59';

    // Parse start time date object
    const [startH, startM] = startTimeStr.split(':').map((v) => parseInt(v, 10) || 0);
    const [endH, endM] = endTimeStr.split(':').map((v) => parseInt(v, 10) || 0);

    const eventStartDate = new Date(agendaDateStr);
    eventStartDate.setHours(startH, startM, 0, 0);

    // 45 minutes early check-in buffer before official start
    const earlyCheckinBufferMs = 45 * 60 * 1000;
    const allowedCheckinStart = new Date(eventStartDate.getTime() - earlyCheckinBufferMs);

    const eventEndDate = new Date(agendaDateStr);
    eventEndDate.setHours(endH, endM, 0, 0);

    // Compare with now
    if (now.getTime() < allowedCheckinStart.getTime()) {
      timeStatus = 'before';
      timeReason = `Presensi belum dibuka. Sesi dibuka 45 menit sebelum jadwal (${startTimeStr} WIB).`;
    } else if (now.getTime() > eventEndDate.getTime()) {
      timeStatus = 'after';
      timeReason = `Presensi kegiatan telah ditutup (Berakhir pukul ${endTimeStr} WIB pada ${agendaDateStr}).`;
    } else {
      timeStatus = 'during';
    }
  }

  // 2. Geofence Location Validation
  let locationStatus: 'inside' | 'outside' | 'no_coords' | 'loc_error' = 'inside';
  let locationReason: string | undefined = undefined;
  let distanceMeters: number | undefined = undefined;

  // Check if agenda has coordinates (or fallback to default Gedung PCNU Cirebon if not specified)
  const targetLat = typeof agenda.latitude === 'number' ? agenda.latitude : -6.7588;
  const targetLng = typeof agenda.longitude === 'number' ? agenda.longitude : 108.4832;

  if (enforceLocation) {
    if (!userCoords) {
      locationStatus = 'no_coords';
      locationReason = 'Lokasi GPS belum terdeteksi. Aktifkan GPS untuk memverifikasi kehadiran di lokasi.';
    } else {
      distanceMeters = calculateDistanceMeters(userCoords.lat, userCoords.lng, targetLat, targetLng);
      if (distanceMeters <= allowedRadius) {
        locationStatus = 'inside';
      } else {
        locationStatus = 'outside';
        locationReason = `Anda berada ${formatDistance(distanceMeters)} dari lokasi kegiatan (Batas radius presensi: ${allowedRadius} meter).`;
      }
    }
  }

  const isTimeValid = !enforceTime || timeStatus === 'during';
  const isLocationValid = !enforceLocation || locationStatus === 'inside';

  return {
    isAllowed: isTimeValid && isLocationValid,
    timeStatus,
    timeReason,
    locationStatus,
    locationReason,
    distanceMeters,
    allowedRadiusMeters: allowedRadius,
    targetVenueName: venueName
  };
}
