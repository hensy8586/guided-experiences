"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import {
  useGeolocation,
  type GeolocationStatus,
  type UserPosition,
} from "@/hooks/useGeolocation";
import type { Experience } from "@/domain/experience";
import {
  useDeviceHeading,
  type HeadingStatus,
} from "@/hooks/useDeviceHeading";
import { getDistanceInMeters } from "@/lib/geo";
import { getCompassDirection } from "@/lib/heading";

type MapboxGl = (typeof import("mapbox-gl"))["default"];

const STATUS_MESSAGES: Record<Exclude<GeolocationStatus, "error">, string> = {
  "not-requested": "Location off",
  requesting: "Getting location…",
  available: "Location ready",
  "permission-denied": "Location permission denied",
  unsupported: "Location unavailable",
};

const HEADING_STATUS_MESSAGES: Record<
  Exclude<HeadingStatus, "available" | "error">,
  string
> = {
  "not-requested": "Compass off",
  "permission-required": "Compass off",
  requesting: "Getting heading…",
  "permission-denied": "Compass permission denied",
  unsupported: "Compass unavailable",
  unavailable: "Compass unavailable",
};

const USER_HEADING_INDICATOR = "data-user-heading-indicator";

function placeUserMarker(
  mapboxgl: MapboxGl,
  map: MapboxMap,
  marker: MapboxMarker | null,
  position: UserPosition,
) {
  const coordinates: [number, number] = [
    position.longitude,
    position.latitude,
  ];

  if (marker) {
    marker.setLngLat(coordinates);
    return marker;
  }

  const userMarker = new mapboxgl.Marker({ color: "#047857" })
    .setLngLat(coordinates)
    .addTo(map);
  userMarker.getElement().setAttribute("aria-label", "Your location");

  return userMarker;
}

function updateUserMarkerHeading(
  marker: MapboxMarker,
  heading: number | null,
  bearing: number,
) {
  const markerElement = marker.getElement();
  let indicator = markerElement.querySelector<HTMLElement>(
    `[${USER_HEADING_INDICATOR}]`,
  );

  if (heading === null) {
    indicator?.setAttribute("hidden", "");
    return;
  }

  if (!indicator) {
    indicator = document.createElement("span");
    indicator.setAttribute(USER_HEADING_INDICATOR, "");
    indicator.setAttribute("aria-hidden", "true");
    indicator.textContent = "▲";
    Object.assign(indicator.style, {
      color: "#065f46",
      fontSize: "14px",
      height: "16px",
      left: "50%",
      lineHeight: "16px",
      marginLeft: "-8px",
      position: "absolute",
      textAlign: "center",
      textShadow: "0 0 2px white",
      top: "-14px",
      transformOrigin: "center",
      transition: "transform 120ms linear",
      width: "16px",
    });
    markerElement.appendChild(indicator);
  }

  indicator.removeAttribute("hidden");
  indicator.style.transform = `rotate(${heading - bearing}deg)`;
}

function formatDistance(distanceInMeters: number) {
  if (distanceInMeters < 1_000) {
    return `${Math.round(distanceInMeters)} m`;
  }

  const distanceInKilometers = Math.round(distanceInMeters / 100) / 10;
  return `${distanceInKilometers} km`;
}

export function Map({ experience }: { experience: Experience }) {
  if (experience.stops.length === 0) return <p>No Stops available.</p>;
  return <ExperienceMap key={experience.id} experience={experience} />;
}

function ExperienceMap({ experience }: { experience: Experience }) {
  const [stopIndex, setStopIndex] = useState(0);
  const activeStop = experience.stops[Math.min(stopIndex, experience.stops.length - 1)];
  const activeStopRef = useRef(activeStop);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [mapLoadError, setMapLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const mapboxglRef = useRef<MapboxGl | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);
  const destinationMarkerRef = useRef<MapboxMarker | null>(null);
  const latestPositionRef = useRef<UserPosition | null>(null);
  const latestHeadingRef = useRef<number | null>(null);
  const hasCenteredOnUserRef = useRef(false);
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const { status, position, requestLocation } = useGeolocation();
  const {
    status: headingStatus,
    heading,
    requestHeading,
  } = useDeviceHeading();

  useEffect(() => {
    activeStopRef.current = activeStop;
    destinationMarkerRef.current?.setLngLat([activeStop.longitude, activeStop.latitude]);
    destinationMarkerRef.current?.getElement().setAttribute("aria-label", activeStop.title);
  }, [activeStop]);

  useEffect(() => {
    if (!accessToken || !containerRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;
    let map: MapboxMap | null = null;

    function handleMapError() {
      if (!cancelled) setMapLoadError(true);
    }

    function handleMapLoad() {
      if (!cancelled) setMapLoadError(false);
    }

    function updateHeadingForBearing() {
      if (map && markerRef.current) {
        updateUserMarkerHeading(markerRef.current, latestHeadingRef.current, map.getBearing());
      }
    }

    function disposeMap() {
      markerRef.current?.remove();
      markerRef.current = null;
      destinationMarkerRef.current?.remove();
      destinationMarkerRef.current = null;
      map?.off("rotate", updateHeadingForBearing);
      map?.off("error", handleMapError);
      map?.off("load", handleMapLoad);
      map?.remove();
      if (mapRef.current === map) mapRef.current = null;
      map = null;
      mapboxglRef.current = null;
      hasCenteredOnUserRef.current = false;
    }

    async function initializeMap() {
      const mapboxgl = (await import("mapbox-gl")).default;

      if (cancelled || !containerRef.current || mapRef.current) {
        return;
      }

      map = new mapboxgl.Map({
        accessToken,
        container: containerRef.current,
        center: [activeStopRef.current.longitude, activeStopRef.current.latitude],
        zoom: 14,
        style: "mapbox://styles/mapbox/standard",
      });
      mapRef.current = map;
      mapboxglRef.current = mapboxgl;
      map.on("rotate", updateHeadingForBearing);
      map.on("error", handleMapError);
      map.on("load", handleMapLoad);

      const destinationMarker = new mapboxgl.Marker({ color: "#dc2626" })
        .setLngLat([
          activeStopRef.current.longitude,
          activeStopRef.current.latitude,
        ])
        .addTo(map);
      destinationMarker
        .getElement()
        .setAttribute("aria-label", activeStopRef.current.title);
      destinationMarkerRef.current = destinationMarker;

      if (latestPositionRef.current) {
        const currentPosition = latestPositionRef.current;
        markerRef.current = placeUserMarker(
          mapboxgl,
          map,
          markerRef.current,
          currentPosition,
        );
        updateUserMarkerHeading(
          markerRef.current,
          latestHeadingRef.current,
          map.getBearing(),
        );
        map.easeTo({
          center: [currentPosition.longitude, currentPosition.latitude],
          zoom: 16,
          duration: 1_200,
        });
        hasCenteredOnUserRef.current = true;
      }
      setMapStatus("ready");
    }

    void initializeMap().catch(() => {
      if (cancelled) return;
      disposeMap();
      setMapStatus("error");
    });

    return () => {
      cancelled = true;
      disposeMap();
    };
  }, [accessToken]);

  useEffect(() => {
    latestPositionRef.current = position;

    if (!position) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const map = mapRef.current;
    const mapboxgl = mapboxglRef.current;

    if (!map || !mapboxgl) {
      return;
    }

    markerRef.current = placeUserMarker(
      mapboxgl,
      map,
      markerRef.current,
      position,
    );
    updateUserMarkerHeading(markerRef.current, latestHeadingRef.current, map.getBearing());

    if (!hasCenteredOnUserRef.current) {
      map.easeTo({
        center: [position.longitude, position.latitude],
        zoom: 16,
        duration: 1_200,
      });
      hasCenteredOnUserRef.current = true;
    }
  }, [position]);

  useEffect(() => {
    latestHeadingRef.current = heading;

    if (markerRef.current && mapRef.current) {
      updateUserMarkerHeading(markerRef.current, heading, mapRef.current.getBearing());
    }
  }, [heading]);

  const canRequestLocation =
    status === "not-requested" || status === "permission-denied";
  const statusMessage =
    status === "error"
      ? "Location temporarily unavailable"
      : STATUS_MESSAGES[status];
  const distance = position
    ? getDistanceInMeters(position, activeStop)
    : null;
  const distanceLabel =
    distance === null ? "Distance unavailable" : `${formatDistance(distance)} away${status === "error" ? " (last known)" : ""}`;
  const canRequestHeading =
    headingStatus === "permission-required" ||
    headingStatus === "permission-denied";
  const headingMessage =
    headingStatus === "available" && heading !== null
      ? `Heading: ${heading}° ${getCompassDirection(heading)}`
      : headingStatus === "error"
        ? "Compass unavailable"
        : headingStatus === "available"
          ? "Compass unavailable"
          : HEADING_STATUS_MESSAGES[headingStatus];

  function centerOnUser() {
    const map = mapRef.current;

    if (!map || !position) {
      return;
    }

    map.easeTo({
      center: [position.longitude, position.latitude],
      zoom: 16,
      duration: 1_200,
    });
    hasCenteredOnUserRef.current = true;
  }

  function showDestination() {
    mapRef.current?.easeTo({
      center: [activeStop.longitude, activeStop.latitude],
      zoom: 16,
      duration: 1_200,
    });
  }

  return (
    <section className="w-full" aria-label="Guided experience player">
      {accessToken ? (
        <div
          ref={containerRef}
          className="h-[58svh] min-h-88 max-h-160 w-full overflow-hidden rounded-t-2xl sm:h-[62vh] sm:max-h-176"
          aria-label="Experience map with current destination"
        />
      ) : (
        <div
          className="flex h-[58svh] min-h-88 max-h-160 items-center justify-center rounded-t-2xl border border-amber-300 bg-amber-50 p-6 text-center text-sm leading-6 text-amber-950 sm:h-[62vh] sm:max-h-176"
          role="status"
        >
          Configure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local to display the
          map.
        </div>
      )}
      {accessToken && (mapStatus === "error" || mapLoadError) && (
        <p className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
          The map could not fully load. Check your connection, map access token, and WebGL support, then reload. Stop details remain available below.
        </p>
      )}

      <div className="-mt-px overflow-hidden rounded-b-2xl border border-stone-200 bg-white">
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
            Experience
          </p>
          <p className="mt-1 text-sm font-semibold text-stone-800 break-words">
            {experience.title}
          </p>
          {experience.description && <p className="mt-2 text-sm text-stone-600 whitespace-pre-wrap break-words">{experience.description}</p>}
          <p aria-live="polite" className="mt-3 text-xs font-medium tracking-wide text-stone-500 uppercase">
            Stop {activeStop.position + 1} of {experience.stops.length}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950 break-words">
            {activeStop.title}
          </h2>
          {activeStop.description && <p className="mt-2 text-sm text-stone-800 whitespace-pre-wrap break-words">{activeStop.description}</p>}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button type="button" disabled={stopIndex === 0} onClick={() => setStopIndex(index => Math.max(0, index - 1))} className="min-h-11 rounded-lg border border-stone-300 px-3 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-40">Previous Stop</button>
            <button type="button" disabled={stopIndex >= experience.stops.length - 1} onClick={() => setStopIndex(index => Math.min(experience.stops.length - 1, index + 1))} className="min-h-11 rounded-lg border border-stone-300 px-3 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-40">Next Stop</button>
          </div>
          <p className="mt-3 text-xs text-stone-500">Straight-line distance, not a walking route</p>
          <p
            className="mt-1 text-2xl font-semibold tracking-tight text-emerald-800"
            aria-live="polite"
          >
            {distanceLabel}
          </p>

          {canRequestLocation && (
            <button
              type="button"
              onClick={requestLocation}
              className="mt-4 min-h-11 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 active:bg-emerald-900"
            >
              Use my location
            </button>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={centerOnUser}
              disabled={!position || !accessToken || mapStatus !== "ready"}
              className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 active:bg-stone-200 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
            >
              Center on me
            </button>
            <button
              type="button"
              onClick={showDestination}
              disabled={!accessToken || mapStatus !== "ready"}
              className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 active:bg-stone-200 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
            >
              Show destination
            </button>
          </div>
        </div>

        <div className="border-t border-stone-200 bg-stone-50 px-4 py-3 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-6">
            <div>
              <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
                Location
              </p>
              <p className="mt-1 text-sm text-stone-700" aria-live="polite">
                {statusMessage}
              </p>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
                  Compass
                </p>
                {canRequestHeading && (
                  <button
                    type="button"
                    onClick={requestHeading}
                    className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 active:bg-stone-200"
                  >
                    Enable compass
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-stone-700">
                {headingMessage}
              </p>
            </div>
          </div>

          {position && (
            <details className="mt-3 border-t border-stone-200">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-inset">
                Location details
              </summary>
              <dl className="grid grid-cols-3 gap-3 pb-2 text-xs">
                <div>
                  <dt className="text-stone-500">Latitude</dt>
                  <dd className="mt-0.5 font-mono text-stone-800">
                    {position.latitude.toFixed(5)}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Longitude</dt>
                  <dd className="mt-0.5 font-mono text-stone-800">
                    {position.longitude.toFixed(5)}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Accuracy</dt>
                  <dd className="mt-0.5 font-mono text-stone-800">
                    {position.accuracy.toFixed(0)} m
                  </dd>
                </div>
              </dl>
            </details>
          )}
        </div>
      </div>
    </section>
  );
}
