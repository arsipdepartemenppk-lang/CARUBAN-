import React, { useState, useEffect } from 'react';
import { Camera, Mic, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PermissionStatus {
  name: string;
  state: PermissionState | 'not-supported';
  icon: React.ElementType;
}

export const PermissionManager: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionStatus[]>([]);

  const checkPermissions = async () => {
    const permissionNames = [
      { name: 'camera', label: 'Kamera', icon: Camera },
      { name: 'microphone', label: 'Mikrofon', icon: Mic },
      { name: 'geolocation', label: 'Lokasi', icon: MapPin }
    ];

    const statuses = await Promise.all(
      permissionNames.map(async (p) => {
        try {
          if (p.name === 'geolocation') {
            return { name: p.label, state: 'prompt' as PermissionState, icon: p.icon };
          }
          const status = await navigator.permissions.query({ name: p.name as PermissionName });
          return { name: p.label, state: status.state, icon: p.icon };
        } catch {
          return { name: p.label, state: 'not-supported' as const, icon: p.icon };
        }
      })
    );
    setPermissions(statuses);
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  const requestPermission = async (name: string) => {
    if (name === 'Kamera' || name === 'Mikrofon') {
      await navigator.mediaDevices.getUserMedia({ video: name === 'Kamera', audio: name === 'Mikrofon' });
    } else if (name === 'Lokasi') {
      navigator.geolocation.getCurrentPosition(() => {});
    }
    checkPermissions();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">Status Izin Aplikasi</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {permissions.map((p) => (
          <div key={p.name} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p.icon className={p.state === 'granted' ? 'text-emerald-500' : 'text-zinc-500'} size={24} />
              <span className="text-sm font-bold text-zinc-300">{p.name}</span>
            </div>
            {p.state === 'granted' ? (
              <CheckCircle2 className="text-emerald-500" size={20} />
            ) : p.state === 'not-supported' ? (
              <AlertCircle className="text-zinc-600" size={20} />
            ) : (
              <button 
                onClick={() => requestPermission(p.name)}
                className="text-xs font-black bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700"
              >
                Izinkan
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
