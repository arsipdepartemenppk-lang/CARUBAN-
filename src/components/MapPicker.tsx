import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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

interface MapPickerProps {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
}

const LocationMarker = ({ position, setPosition, onChange }: { 
  position: [number, number] | null, 
  setPosition: (pos: [number, number]) => void,
  onChange: (lat: number, lng: number) => void
}) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onChange(lat, lng);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
};

const MapPicker: React.FC<MapPickerProps> = ({ lat, lng, onChange }) => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const defaultCenter: [number, number] = [-6.732, 108.552];

  useEffect(() => {
    if (lat && lng) {
      setPosition([lat, lng]);
    }
  }, [lat, lng]);

  return (
    <div className="h-64 w-full rounded-2xl overflow-hidden border border-zinc-200 relative z-0">
      <MapContainer 
        center={position || defaultCenter} 
        zoom={13} 
        style={{ width: '100%', height: '100%' }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Peta Standar">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satelit">
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <LocationMarker position={position} setPosition={setPosition} onChange={onChange} />
      </MapContainer>
      <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-2 text-[10px] font-bold text-zinc-500 text-center border-t border-zinc-200 z-[1000]">
        Klik pada peta untuk memilih lokasi
      </div>
    </div>
  );
};

export default React.memo(MapPicker);
