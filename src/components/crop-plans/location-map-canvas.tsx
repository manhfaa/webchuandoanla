"use client";

import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { divIcon, type LatLngExpression } from "leaflet";

const markerIcon = divIcon({
  className: "agromindai-map-pin",
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:999px;background:var(--leaf);border:3px solid var(--surface);box-shadow:var(--shadow-md);"></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function MapEventBinder({
  onChange,
}: {
  onChange: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export function LocationMapCanvas({
  lat,
  lon,
  onChange,
}: {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
}) {
  const center: LatLngExpression = [lat, lon];

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full min-h-[300px]">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={center}
        icon={markerIcon}
        draggable
        eventHandlers={{
          dragend(event) {
            const marker = event.target;
            const next = marker.getLatLng();
            onChange(next.lat, next.lng);
          },
        }}
      />
      <MapEventBinder onChange={onChange} />
    </MapContainer>
  );
}
