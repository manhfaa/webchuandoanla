"use client";

import { useEffect, useRef } from "react";
import L, {
  divIcon,
  type LeafletMouseEvent,
  type Map as LeafletMap,
  type Marker as LeafletMarker,
} from "leaflet";

const markerIcon = divIcon({
  className: "agromindai-map-pin",
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:999px;background:var(--leaf);border:3px solid var(--surface);box-shadow:var(--shadow-md);"></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

type LeafletContainer = HTMLDivElement & { _leaflet_id?: number };

export function LocationMapCanvas({
  lat,
  lon,
  onChange,
}: {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
}) {
  const containerRef = useRef<LeafletContainer | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialPositionRef = useRef<[number, number]>([lat, lon]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // React Strict Mode mounts effects twice in development. Leaflet keeps an
    // internal id on the DOM node, so remove any stale id before reusing it.
    if (container._leaflet_id) delete container._leaflet_id;

    const map = L.map(container, {
      center: initialPositionRef.current,
      zoom: 12,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker(initialPositionRef.current, {
      icon: markerIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    const handleMapClick = (event: LeafletMouseEvent) => {
      marker.setLatLng(event.latlng);
      onChangeRef.current(event.latlng.lat, event.latlng.lng);
    };
    const handleMarkerDrag = () => {
      const next = marker.getLatLng();
      onChangeRef.current(next.lat, next.lng);
    };

    map.on("click", handleMapClick);
    marker.on("dragend", handleMarkerDrag);

    return () => {
      marker.off("dragend", handleMarkerDrag);
      map.off("click", handleMapClick);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      delete container._leaflet_id;
    };
  }, []);

  useEffect(() => {
    const nextPosition: [number, number] = [lat, lon];
    markerRef.current?.setLatLng(nextPosition);
    mapRef.current?.panTo(nextPosition, { animate: true });
  }, [lat, lon]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[300px]"
      aria-label="Bản đồ chọn vị trí trồng cây"
    />
  );
}
