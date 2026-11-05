import React, { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import MapComponent from './MapComponent';
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

interface MemberMapProps {
  members: any[];
}

const MemberMap: React.FC<MemberMapProps> = ({ members }) => {
  const [selected, setSelected] = useState<any | null>(null);

  const validMembers = (members || []).filter(m => {
    if (!m) return false;
    const lat = parseFloat(String(m.lat));
    const lng = parseFloat(String(m.lng));
    return !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng);
  });

  if (validMembers.length === 0) {
    return (
      <div className="h-96 bg-slate-50 border border-zinc-100 rounded-[32px] flex flex-col items-center justify-center text-zinc-400 gap-4">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
          <div className="w-6 h-6 bg-emerald-500 rounded-full opacity-20" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest">Tidak ada lokasi tersedia</p>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-emerald-600/5 blur-3xl rounded-[32px] -z-10 group-hover:bg-emerald-600/10 transition-all duration-500"></div>
      <div className="h-[600px] w-full rounded-[32px] border border-white shadow-xl overflow-hidden z-0">
        <MapComponent 
          locations={validMembers.map(m => ({ lat: Number(m.lat), lng: Number(m.lng) }))}
        >
          {validMembers.map(member => (
            <Marker 
              key={member.id} 
              position={[Number(member.lat), Number(member.lng)]}
              eventHandlers={{
                click: () => setSelected(member)
              }}
            >
              <Popup>
                <div className="p-2 flex flex-col items-center gap-3 min-w-[180px]">
                  {member.fotoUrl ? (
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-50 shadow-md">
                      <img src={member.fotoUrl} alt={member.namaLengkap} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xl border-2 border-emerald-100 shadow-md">
                      {(member.namaLengkap || '').charAt(0)}
                    </div>
                  )}
                  <div className="text-center space-y-1">
                    <h3 className="font-black text-sm text-zinc-900 tracking-tight leading-tight">{member.namaLengkap}</h3>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                        {member.statusPimpinan}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                        {member.domisili}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapComponent>
      </div>
    </div>
  );
};

export default MemberMap;
