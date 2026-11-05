import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Map as MapIcon, Navigation, MapPin, Layers, Compass, X, BarChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import MapComponent from '../components/MapComponent';
import { useFirebase } from '../components/FirebaseProvider';
import { useTheme } from '../components/ThemeProvider';
import { useToast } from '../components/Toast';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface PKLocation {
  id: string;
  namaPK: string;
  alamat: string;
  zona: string;
  koorzon: string;
  status: string;
  lat?: number;
  lng?: number;
  excellentRating?: number;
  noHp?: string;
  logoUrl?: string;
}

const Maps: React.FC = () => {
  const { user } = useFirebase();
  const { showToast } = useToast();
  const [locations, setLocations] = useState<PKLocation[]>([]);
  const [selectedPK, setSelectedPK] = useState<PKLocation | null>(null);
  const [activeZona, setActiveZona] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'pks'));
    const unsub = onSnapshot(q, (s) => {
      setLocations(s.docs.map(d => ({ id: d.id, ...d.data() })) as PKLocation[]);
    }, (error) => {
      console.warn('Snapshot error for pks:', error);
    });
    return () => unsub();
  }, [user]);

  const zonas = Array.from(new Set(locations.map(l => l.zona).filter(Boolean))).sort();

  return (
    <div className="p-4 lg:p-8 pb-24 min-h-screen font-sans overflow-hidden transition-colors duration-500 bg-[var(--bg-app)] text-[var(--text-main)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase leading-none">PETA PK</h1>
          <p className="text-[var(--accent-primary)] text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <Navigation size={14} className="animate-pulse" /> Sebaran Pimpinan Komisariat
          </p>
        </div>
        <div className="flex bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-main)] shadow-sm">
          <button 
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                  const { latitude, longitude } = position.coords;
                  let nearestPK: PKLocation | null = null;
                  let minDistance = Infinity;
                  locations.forEach(loc => {
                    if (loc.lat && loc.lng) {
                      const dist = Math.sqrt(Math.pow(loc.lat - latitude, 2) + Math.pow(loc.lng - longitude, 2));
                      if (dist < minDistance) {
                        minDistance = dist;
                        nearestPK = loc;
                      }
                    }
                  });
                  if (nearestPK) setSelectedPK(nearestPK);
                  else showToast('PK terdekat tidak ditemukan', 'error');
                }, (err) => showToast('Gagal mendapatkan lokasi: ' + err.message, 'error'));
              } else {
                showToast('Geolokasi tidak didukung', 'error');
              }
            }}
            className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
          >
            <Compass size={14} />
            PK Terdekat
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              viewMode === 'grid' ? "bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]"
            )}
          >
            <Layers size={14} />
            Grid
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              viewMode === 'map' ? "bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]"
            )}
          >
            <MapIcon size={14} />
            Visual
          </button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
        <button
          onClick={() => setActiveZona(null)}
          className={cn(
            "shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
            !activeZona ? "bg-[var(--text-main)] text-[var(--bg-app)] border-[var(--text-main)] shadow-lg" : "bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
          )}
        >
          Semua Zona
        </button>
        {zonas.map((z, idx) => (
          <button
            key={`${z}-${idx}`}
            onClick={() => setActiveZona(z)}
            className={cn(
              "shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
              activeZona === z ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20" : "bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
            )}
          >
            {z}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {locations
              .filter(l => !activeZona || l.zona === activeZona)
              .map(loc => (
                <motion.div
                  layoutId={`card-${loc.id}`}
                  key={`grid-${loc.id}`}
                  onClick={() => setSelectedPK(loc)}
                  className="bg-[var(--bg-card)] border border-[var(--border-main)] p-6 lg:p-8 rounded-[32px] group hover:border-[var(--accent-primary)]/50 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full shadow-sm hover:shadow-xl hover:shadow-[var(--accent-primary)]/5"
                >
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-[var(--accent-primary)]/5 rounded-full blur-3xl group-hover:bg-[var(--accent-primary)]/10 transition-all" />
                  <div className="flex items-start justify-between mb-6">
                    <motion.div 
                      layoutId={`icon-${loc.id}`}
                      className="w-14 h-14 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-main)] flex items-center justify-center text-[var(--accent-primary)] group-hover:scale-110 transition-transform shadow-sm"
                    >
                      <MapPin size={24} />
                    </motion.div>
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] border border-[var(--border-main)] px-4 py-1.5 rounded-full bg-[var(--bg-app)]">
                      {loc.zona}
                    </span>
                  </div>
                  <motion.h3 
                    layoutId={`title-${loc.id}`}
                    className="font-black text-xl leading-tight mb-3 group-hover:text-[var(--accent-primary)] transition-colors text-[var(--text-main)]"
                  >
                    {loc.namaPK}
                  </motion.h3>
                  <p className="text-[var(--text-muted)] text-xs line-clamp-2 mb-6 leading-relaxed flex-1">{loc.alamat}</p>
                  <div className="flex items-center justify-between pt-6 border-t border-[var(--border-main)]">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Koordinator</span>
                      <span className="text-[10px] font-bold text-[var(--text-main)]">{loc.koorzon}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--bg-app)] px-3 py-1.5 rounded-xl border border-[var(--border-main)]">
                      <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        loc.status === 'Aktif' ? "bg-[var(--accent-primary)]" : "bg-zinc-400"
                      )} />
                      <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{loc.status}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
          </motion.div>
        ) : (
          <motion.div 
            key="map"
            initial={{ opacity: 0, scale: 1.02, filter: 'blur(5px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(5px)' }}
            className="relative h-[70vh] lg:h-[75vh] bg-[var(--bg-card)] rounded-[32px] lg:rounded-[48px] border border-[var(--border-main)] overflow-hidden group shadow-xl"
          >
            <MapComponent 
              locations={locations
                .filter(l => !activeZona || l.zona === activeZona)
                .map(loc => ({
                  lat: loc.lat!,
                  lng: loc.lng!
                }))}
            >
              {locations
                .filter(l => !activeZona || l.zona === activeZona)
                .map(loc => (
                  loc.lat && loc.lng && (
                    <Marker
                      key={loc.id}
                      position={[loc.lat, loc.lng]}
                      eventHandlers={{
                        click: () => {
                          const pk = locations.find(p => p.id === loc.id);
                          if (pk) setSelectedPK(pk);
                        },
                      }}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <h3 className="font-bold text-sm mb-1">{loc.namaPK}</h3>
                          <p className="text-xs text-zinc-600 mb-2">{loc.alamat}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}
            </MapComponent>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPK && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPK(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              layoutId={`card-${selectedPK.id}`}
              className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="h-48 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--bg-primary)] p-8 relative overflow-hidden">
                {selectedPK.logoUrl ? (
                  <img src={selectedPK.logoUrl} alt={selectedPK.namaPK} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" referrerPolicy="no-referrer" />
                ) : (
                  <MapIcon className="absolute -right-12 -bottom-12 text-white/10 w-64 h-64 rotate-12" />
                )}
                <button 
                  onClick={() => setSelectedPK(null)}
                  className="absolute top-6 right-6 w-10 h-10 bg-black/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-black/40 transition-all z-20"
                >
                  <X size={18} />
                </button>
                <div className="relative z-10 flex items-start gap-4">
                  <motion.div 
                    layoutId={`icon-${selectedPK.id}`}
                    className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl overflow-hidden"
                  >
                    {selectedPK.logoUrl ? (
                      <img src={selectedPK.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <MapPin size={32} />
                    )}
                  </motion.div>
                  <div>
                    <span className="bg-white/20 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border border-white/20">
                      {selectedPK.zona}
                    </span>
                    <motion.h2 
                      layoutId={`title-${selectedPK.id}`}
                      className="text-3xl font-black text-white tracking-tighter mt-4 leading-none"
                    >
                      {selectedPK.namaPK}
                    </motion.h2>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Koordinator Zona</p>
                    <p className="text-sm font-bold text-[var(--text-main)]">{selectedPK.koorzon}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status PK</p>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        selectedPK.status === 'Aktif' ? "bg-[var(--accent-primary)]" : "bg-zinc-400"
                      )} />
                      <p className="text-sm font-bold text-[var(--text-main)]">{selectedPK.status}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Skor Rata-rata</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <BarChart size={14} />
                      </div>
                      <p className="text-sm font-black text-[var(--text-main)]">{selectedPK.excellentRating?.toFixed(1) || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Kontak</p>
                    <p className="text-sm font-bold text-[var(--text-main)]">{selectedPK.noHp || '-'}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-8">
                  <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Alamat Lengkap</p>
                  <div className="bg-[var(--bg-app)] border border-[var(--border-main)] p-4 rounded-2xl">
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">{selectedPK.alamat}</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const url = selectedPK.lat && selectedPK.lng 
                      ? `https://www.google.com/maps/dir/?api=1&destination=${selectedPK.lat},${selectedPK.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPK.alamat + ' ' + selectedPK.namaPK)}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full bg-[var(--text-main)] text-[var(--bg-app)] font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-95"
                >
                  <Navigation size={20} />
                  LIHAT NAVIGASI
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Maps;
