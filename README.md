# Guided Experiences

Guided Experiences is a future platform for creators to publish location-based experiences, including walking tours, food tours, treasure hunts, and photography walks. People will be able to follow these experiences from their phones and discover places through local knowledge.

## Current milestone

This initial milestone is a mobile-responsive Mapbox prototype with opt-in live browser geolocation, one test destination, straight-line distance, and optional device heading. It does not include routing, accounts, data storage, or other future product functionality.

## Install dependencies

```bash
npm install
```

## Run the development server

Create `.env.local` with your public Mapbox browser access token:

```dotenv
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_public_mapbox_token
```

Use `.env.example` as a template. `.env.local` is ignored by Git; never commit
your actual token. Restart the development server after changing it.

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy through Vercel's GitHub integration:

1. Push this repository to GitHub on the `main` branch.
2. Sign in to [Vercel](https://vercel.com) and import the
   `guided-experiences` GitHub repository.
3. Allow Vercel to detect Next.js.
4. Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to the project's environment
   variables. Select Production; add it to Preview too if you plan to use
   preview deployments for field testing.
5. Deploy, then open the resulting HTTPS URL.
6. Confirm the map loads before testing location or compass permissions.

No `vercel.json`, custom output directory, or custom install setting is needed.
Vercel detects `package-lock.json` and uses `npm install`. It then runs the
existing `npm run build` script, which intentionally uses
`next build --webpack`.

### Mapbox token guidance

`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is intentionally a public browser token, so
it is available to client-side code. Never commit its value. After deployment,
restrict the token in your Mapbox account where practical: allow localhost for
development, the Vercel production domain, and any preview domains you choose
to use.

## Why HTTPS matters

Browsers treat `localhost` specially during development. On a real phone,
geolocation and device orientation require a secure context, so a plain LAN URL
such as `http://192.168.x.x:3000` is not a reliable sensor-test environment.
Use the deployed Vercel HTTPS URL for field testing.

## Compass support

Device heading is an optional enhancement and varies by browser and hardware. iPhone Safari may require explicit motion and orientation permission, while many desktop browsers do not provide a useful compass heading. Test mobile heading behavior on the deployed HTTPS site.

## Mobile field testing

Before walking with the prototype, update the nearby safe test destination in
[`src/data/destination.ts`](src/data/destination.ts). Edit the `name`,
`latitude`, and `longitude` fields in `TEST_DESTINATION`, then deploy the
change.

### Initial load

- Open the deployed HTTPS Vercel URL.
- Confirm the Mapbox map and `Test Destination` load.
- Confirm the browser does not request location automatically.

### Location

- Tap **Use my location** and grant permission.
- Confirm the green user marker appears.
- Expand **Location details** and confirm latitude, longitude, and accuracy.
- Confirm a straight-line distance appears.

### Camera behavior

- Confirm the first GPS fix recenters the map once.
- Pan away, wait for another GPS update, and confirm the map does not snap back.
- Test **Center on me** and **Show destination**.

### Movement test

- Walk toward the safe test destination and confirm distance generally decreases.
- Walk away and confirm distance generally increases.
- Note GPS jitter and the reported accuracy; small distance fluctuations are
  expected.

### Compass

On supported devices, enable the compass when prompted. Compare the displayed
heading with the device's native compass, rotate through several directions,
and note jitter or major disagreement. Confirm heading updates do not rotate or
recenter the map.

### App switching

- Switch to another app briefly, then return to the browser.
- Observe whether location and heading resume, and record the behavior.

### Field test notes

```text
Device:
OS:
Browser:
Deployment URL:

Map: pass / fail
Map notes:

Location permission: pass / fail
Location notes:

GPS responsiveness: good / acceptable / poor
GPS jitter: low / medium / high

Distance behavior: pass / fail
Distance notes:

Compass: pass / fail / unavailable
Compass notes:

Map camera behavior: pass / fail
Camera notes:

Touch usability: good / acceptable / poor
App-switch behavior:
Unexpected issues:
```
