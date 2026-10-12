"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeHeading } from "@/lib/heading";

export type HeadingStatus =
  | "not-requested"
  | "permission-required"
  | "requesting"
  | "available"
  | "permission-denied"
  | "unsupported"
  | "unavailable"
  | "error";

type HeadingState = {
  status: HeadingStatus;
  heading: number | null;
  errorMessage: string | null;
};

type PermissionAwareDeviceOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: (
    absolute?: boolean,
  ) => Promise<"granted" | "denied">;
};

type CompassDeviceOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

type OrientationEventName =
  | "deviceorientation"
  | "deviceorientationabsolute";

const HEADING_WAIT_TIMEOUT_MS = 3_000;

const INITIAL_STATE: HeadingState = {
  status: "not-requested",
  heading: null,
  errorMessage: null,
};

function getHeading(event: DeviceOrientationEvent): number | null {
  const compassEvent = event as CompassDeviceOrientationEvent;

  if (
    typeof compassEvent.webkitCompassHeading === "number" &&
    Number.isFinite(compassEvent.webkitCompassHeading) &&
    !(
      typeof compassEvent.webkitCompassAccuracy === "number" &&
      compassEvent.webkitCompassAccuracy < 0
    )
  ) {
    return normalizeHeading(compassEvent.webkitCompassHeading);
  }

  if (event.absolute && event.alpha !== null && Number.isFinite(event.alpha)) {
    return normalizeHeading(360 - event.alpha);
  }

  return null;
}

function supportsDeviceOrientation() {
  return (
    "DeviceOrientationEvent" in window &&
    ("ondeviceorientation" in window ||
      "ondeviceorientationabsolute" in window)
  );
}

export function useDeviceHeading() {
  const [state, setState] = useState<HeadingState>(INITIAL_STATE);
  const listenerNameRef = useRef<OrientationEventName | null>(null);
  const timeoutIdRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const nextHeading = getHeading(event);

    if (nextHeading === null) {
      return;
    }

    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    const roundedHeading = Math.round(nextHeading) % 360;

    setState((currentState) => {
      if (
        currentState.status === "available" &&
        currentState.heading === roundedHeading
      ) {
        return currentState;
      }

      return {
        status: "available",
        heading: roundedHeading,
        errorMessage: null,
      };
    });
  }, []);

  const stopListening = useCallback(() => {
    if (listenerNameRef.current) {
      window.removeEventListener(
        listenerNameRef.current,
        handleOrientation as EventListener,
      );
      listenerNameRef.current = null;
    }

    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, [handleOrientation]);

  const startListening = useCallback(() => {
    if (listenerNameRef.current || !supportsDeviceOrientation()) {
      return;
    }

    const eventName: OrientationEventName =
      "ondeviceorientationabsolute" in window
        ? "deviceorientationabsolute"
        : "deviceorientation";

    window.addEventListener(eventName, handleOrientation as EventListener);
    listenerNameRef.current = eventName;
    setState({
      status: "requesting",
      heading: null,
      errorMessage: null,
    });

    timeoutIdRef.current = window.setTimeout(() => {
      setState((currentState) =>
        currentState.status === "requesting"
          ? {
              status: "unavailable",
              heading: null,
              errorMessage: null,
            }
          : currentState,
      );
      timeoutIdRef.current = null;
    }, HEADING_WAIT_TIMEOUT_MS);
  }, [handleOrientation]);

  const requestHeading = useCallback(async () => {
    if (!window.isSecureContext) {
      setState({
        status: "error",
        heading: null,
        errorMessage: "Compass access requires HTTPS.",
      });
      return;
    }

    if (!supportsDeviceOrientation()) {
      setState({
        status: "unsupported",
        heading: null,
        errorMessage: null,
      });
      return;
    }

    if (listenerNameRef.current) {
      return;
    }

    const orientationEvent = window.DeviceOrientationEvent as PermissionAwareDeviceOrientationEvent;
    const requestPermission = orientationEvent.requestPermission;

    if (!requestPermission) {
      startListening();
      return;
    }

    setState({
      status: "requesting",
      heading: null,
      errorMessage: null,
    });

    try {
      const permission = await requestPermission.call(orientationEvent, true);

      if (!mountedRef.current) {
        return;
      }

      if (permission !== "granted") {
        setState({
          status: "permission-denied",
          heading: null,
          errorMessage: null,
        });
        return;
      }

      startListening();
    } catch {
      if (mountedRef.current) {
        setState({
          status: "error",
          heading: null,
          errorMessage: "Compass permission could not be requested.",
        });
      }
    }
  }, [startListening]);

  useEffect(() => {
    mountedRef.current = true;

    const setupId = window.setTimeout(() => {
      if (!mountedRef.current) {
        return;
      }

      if (!window.isSecureContext) {
        setState({
          status: "error",
          heading: null,
          errorMessage: "Compass access requires HTTPS.",
        });
      } else if (!supportsDeviceOrientation()) {
        setState({
          status: "unsupported",
          heading: null,
          errorMessage: null,
        });
      } else {
        const orientationEvent = window.DeviceOrientationEvent as PermissionAwareDeviceOrientationEvent;

        if (typeof orientationEvent.requestPermission === "function") {
          setState({
            status: "permission-required",
            heading: null,
            errorMessage: null,
          });
        } else {
          startListening();
        }
      }
    }, 0);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(setupId);
      stopListening();
    };
  }, [startListening, stopListening]);

  return {
    ...state,
    requestHeading,
  };
}
