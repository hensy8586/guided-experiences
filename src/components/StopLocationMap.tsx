"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker, MapMouseEvent } from "mapbox-gl";

type Coordinates = { latitude: number; longitude: number };
export function StopLocationMap({ coordinates, onSelect }: {
  coordinates: Coordinates | null;
  onSelect: (coordinates: Coordinates) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const latest = useRef({ coordinates, onSelect });
  const [error, setError] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const latitude = coordinates?.latitude;
  const longitude = coordinates?.longitude;

  useEffect(() => {
    latest.current = { coordinates, onSelect };
  }, [coordinates, onSelect]);

  useEffect(() => {
    if (latitude !== undefined && longitude !== undefined && markerRef.current && mapRef.current) {
      const point: [number, number] = [longitude, latitude];
      markerRef.current.setLngLat(point).addTo(mapRef.current);
      mapRef.current.easeTo({ center: point, duration: 250 });
    } else if (latitude === undefined || longitude === undefined) {
      markerRef.current?.remove();
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (!token || !container.current) return;
    let cancelled = false;
    let map: MapboxMap | undefined;
    let observer: ResizeObserver | undefined;
    const click = (event: MapMouseEvent) => {
      latest.current.onSelect({ latitude: event.lngLat.lat, longitude: event.lngLat.wrap().lng });
    };
    const fail = () => { if (!cancelled) setError(true); };
    void (async () => {
      const mapbox = (await import("mapbox-gl")).default;
      if (cancelled || !container.current) return;
      const initial = latest.current.coordinates;
      map = new mapbox.Map({ container: container.current, accessToken: token,
        style: "mapbox://styles/mapbox/standard", zoom: 15,
        center: initial ? [initial.longitude, initial.latitude] : [-92.806, 45.056] });
      mapRef.current = map;
      markerRef.current = new mapbox.Marker({ color: "#dc2626" });
      if (initial) markerRef.current.setLngLat([initial.longitude, initial.latitude]).addTo(map);
      map.on("click", click);
      map.on("error", fail);
      observer = new ResizeObserver(() => map?.resize());
      observer.observe(container.current);
    })().catch(fail);
    return () => {
      cancelled = true;
      observer?.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map?.off("click", click);
      map?.off("error", fail);
      map?.remove();
      mapRef.current = null;
    };
  }, [token]);

  return <div>
    <p className="mb-2 text-sm text-stone-600">Tap the map to choose a location, or enter coordinates below.</p>
    {!token || error ? <p role="status" className="mb-2 text-sm text-red-800">
      {!token ? "Configure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to use the map." : "Map unavailable. You can still enter coordinates below."}
    </p> : null}
    <div ref={container} aria-label="Stop location selection map" className="h-80 w-full overflow-hidden rounded-lg border border-stone-300" />
  </div>;
}
