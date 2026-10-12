"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GeolocationStatus =
  | "not-requested"
  | "requesting"
  | "available"
  | "permission-denied"
  | "unsupported"
  | "error";

export type UserPosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type GeolocationState = {
  status: GeolocationStatus;
  position: UserPosition | null;
  errorMessage: string | null;
};

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 10_000,
};

const INITIAL_STATE: GeolocationState = {
  status: "not-requested",
  position: null,
  errorMessage: null,
};

function getErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your location is currently unavailable. Waiting for another update.";
  }

  if (error.code === error.TIMEOUT) {
    return "The location request timed out. Waiting for another update.";
  }

  return "Unable to retrieve your location. Waiting for another update.";
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(INITIAL_STATE);
  const watcherIdRef = useRef<number | null>(null);
  const watcherSessionRef = useRef(0);

  const clearWatcher = useCallback(() => {
    watcherSessionRef.current += 1;
    if (
      watcherIdRef.current !== null &&
      typeof navigator !== "undefined" &&
      "geolocation" in navigator
    ) {
      navigator.geolocation.clearWatch(watcherIdRef.current);
    }

    watcherIdRef.current = null;
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({
        status: "unsupported",
        position: null,
        errorMessage: null,
      });
      return;
    }

    if (watcherIdRef.current !== null) {
      return;
    }

    setState((currentState) => ({
      status: "requesting",
      position: currentState.position,
      errorMessage: null,
    }));

    const session = ++watcherSessionRef.current;
    watcherIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (watcherSessionRef.current !== session) return;
        setState({
          status: "available",
          position: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
          },
          errorMessage: null,
        });
      },
      (error) => {
        if (watcherSessionRef.current !== session) return;
        if (error.code === error.PERMISSION_DENIED) {
          clearWatcher();
          setState({
            status: "permission-denied",
            position: null,
            errorMessage: null,
          });
          return;
        }

        setState((currentState) => ({
          status: "error",
          position: currentState.position,
          errorMessage: getErrorMessage(error),
        }));
      },
      GEOLOCATION_OPTIONS,
    );
  }, [clearWatcher]);

  useEffect(() => clearWatcher, [clearWatcher]);

  return {
    ...state,
    requestLocation,
  };
}
