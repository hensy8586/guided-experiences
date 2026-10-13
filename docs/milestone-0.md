# Milestone 0 — Mobile Location Prototype

## Goal

Milestone 0 tested whether a mobile-web-first implementation could support the
fundamental consumer-side capabilities of a location-based guided experience:
map display, opt-in location, a destination, distance, and optional heading.
It was a prototype, not the final product.

## Implemented

- Next.js and TypeScript web application.
- Mapbox GL JS map, deployed over HTTPS through Vercel.
- Explicit browser geolocation opt-in with continuous `watchPosition` updates.
- Current-location marker and one hard-coded destination marker.
- Straight-line Haversine distance to the destination.
- `Center on me` and `Show destination` map controls.
- Optional browser device heading/compass support and a user-marker heading
  indicator.
- Mobile-first responsive player UI, permission and error states, and developer
  location details for latitude, longitude, and accuracy.

## Architecture

```text
User phone/browser
├── Next.js / React UI
├── Browser Geolocation API
├── Device Orientation API
├── Mapbox GL JS
│
└── Vercel hosting / HTTPS
```

Vercel hosts and deploys the application. Mapbox renders the map and marker
visualization. The browser and device provide location and orientation data.
The application calculates straight-line distance itself with Haversine math.

There is no backend database, authentication, routing service, Supabase, or AI
functionality at this stage.

## Important technical decisions

- Mobile web first rather than native iOS.
- Next.js with TypeScript and Mapbox GL JS.
- Browser-native geolocation and orientation APIs rather than additional sensor
  libraries.
- One Vercel deployment path: GitHub `main` → Vercel automatic deployment.
- No custom CI/CD, database, authentication, route-planning API, or other
  infrastructure yet.
- One hard-coded destination and straight-line distance only; heading is an
  optional enhancement.
- The production build intentionally runs `next build --webpack`. This is a
  tooling/environment detail retained because the local environment had a
  Turbopack worker-port limitation; it is not a product architecture
  requirement.

## Field-test results

### Confirmed

- The deployed HTTPS application works on a real phone.
- Mapbox renders correctly in production.
- Browser geolocation works, and the current position can update while walking.
- Compass heading works in real-device use.
- Distance changes as location changes.
- The mobile player UI is usable on a phone.

### Observed limitations

- Location updates can lag.
- Location may occasionally need to be explicitly enabled again.
- Browser sensor lifecycle is not equivalent to native continuous tracking.

### Not fully validated

- Precise location update cadence.
- Arrival-radius behavior.
- Long, controlled distance accuracy testing.
- Locked-screen and background behavior.
- Native-versus-web sensor differences.
- Controlled compass-accuracy benchmarking.

## Lessons learned

1. A mobile-web-first consumer experience is viable.
2. Native iOS development is not required yet.
3. Browser geolocation supports continued product development, but should not
   be treated as perfectly continuous navigation-grade tracking.
4. Compass support is promising and should remain optional.
5. Future arrival detection should consider GPS accuracy, stale readings, and
   delayed updates rather than only a fixed distance threshold.
6. Mapbox and Vercel provide sufficient infrastructure for the current stage.

## Known limitations

- No persistence, real `Experience` object, or multiple stops.
- No creator tools, authentication, marketplace, audio, or offline mode.
- No route planning, turn-by-turn navigation, or background native tracking.

## Milestone success criteria

- [x] HTTPS deployment
- [x] Mobile map rendering
- [x] Explicit location permission
- [x] Live user position
- [x] Destination visualization
- [x] Straight-line distance calculation
- [x] Optional compass support
- [x] Map-camera controls
- [x] Basic mobile usability

## Next milestone

Milestone 1 will introduce the first product/domain layer, likely including
`Experience`, `ExperienceStop`, persistent storage, and creator-side
creation/editing. Supabase is the likely persistence platform. This document
does not define a schema or introduce those capabilities.

## Repository state

- Production branch: `main`
- Hosting: Vercel
- Deployment model: GitHub push → automatic Vercel deployment
- Mapbox token environment variable: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
