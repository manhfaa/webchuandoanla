"use client";

import { useEffect, useRef, useState } from "react";
import L, {
  divIcon,
  type LeafletMouseEvent,
  type Map as LeafletMap,
  type Marker as LeafletMarker,
} from "leaflet";

import { useTr } from "@/lib/use-tr";

// The visible dot stays 20px, but the icon box is 44px so a fingertip has
// something to grab. At iconSize [20,20] the target was smaller than the finger
// covering it, which made the pin practically undraggable on a phone.
const markerIcon = divIcon({
  className: "agromindai-map-pin",
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;">
      <div style="width:20px;height:20px;border-radius:999px;background:var(--leaf);border:3px solid var(--surface);box-shadow:var(--shadow-md);"></div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
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
  const tr = useTr();
  const containerRef = useRef<LeafletContainer | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialPositionRef = useRef<[number, number]>([lat, lon]);
  // True while the map is inert on a touch device and waiting for the tap that
  // hands it the gesture. Read by the overlay and by the click handler, which
  // must ignore the activating tap itself.
  const [needsActivation, setNeedsActivation] = useState(false);
  const needsActivationRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Mirrored into a ref because Leaflet's click handler is bound once on mount
  // and would otherwise close over the initial value forever.
  useEffect(() => {
    needsActivationRef.current = needsActivation;
  }, [needsActivation]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // React Strict Mode mounts effects twice in development. Leaflet keeps an
    // internal id on the DOM node, so remove any stale id before reusing it.
    if (container._leaflet_id) delete container._leaflet_id;

    // On a touch device the map starts inert. Leaflet stamps `touch-action: none`
    // on its container as soon as dragging/touchZoom are on, so a one-finger
    // swipe that lands anywhere on this 358x300 box pans the map instead of
    // scrolling the page — and "Tiếp tục" sits below it in a wizard step the
    // grower has to get through. Worse, the instinctive "tap to stop it moving"
    // fires the click handler and silently rewrites the planting coordinates the
    // whole climate analysis is built on. One deliberate tap turns it on.
    const coarsePointer =
      typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

    const map = L.map(container, {
      center: initialPositionRef.current,
      zoom: 12,
      scrollWheelZoom: false,
      dragging: !coarsePointer,
      touchZoom: !coarsePointer,
    });
    mapRef.current = map;
    setNeedsActivation(coarsePointer);

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
      // While inert, a tap is the user asking for control of the map, not a
      // request to move the planting pin.
      if (needsActivationRef.current) return;
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

  function activateMap() {
    const map = mapRef.current;
    if (!map) return;
    map.dragging.enable();
    map.touchZoom.enable();
    setNeedsActivation(false);
  }

  return (
    <div className="relative h-full min-h-[300px]">
      <div
        ref={containerRef}
        className="h-full min-h-[300px]"
        aria-label={tr("Bản đồ chọn vị trí trồng cây", "Map to select planting location")}
      />
      {needsActivation ? (
        <button
          type="button"
          onClick={activateMap}
          className="absolute inset-0 z-[400] flex items-end justify-center bg-[color-mix(in_srgb,var(--forest)_28%,transparent)] p-4 text-sm font-semibold"
        >
          <span className="rounded-full border border-line bg-surface px-4 py-2.5 text-ink shadow-md">
            {tr("Chạm để bật bản đồ", "Tap to activate the map")}
          </span>
        </button>
      ) : null}
    </div>
  );
}
