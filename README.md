# Guided Experiences

Guided Experiences is a future platform for creators to publish location-based experiences, including walking tours, food tours, treasure hunts, and photography walks. People will be able to follow these experiences from their phones and discover places through local knowledge.

## Current milestone

Milestone 0 is complete. Milestone 1 adds the Experience domain, database
foundation, and minimal creator authentication. The mobile player still uses
the first stop of a local sample Experience, with opt-in geolocation,
straight-line distance, and optional heading. It remains publicly accessible,
and no Experience database queries or creator editing tools are connected yet.

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

## Supabase foundation

Supabase is the planned platform for persistence and authentication. Add the
Project URL and publishable key from the Supabase project **Connect** dialog to
`.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Do not commit `.env.local`. The publishable key is intended for client use.
Row Level Security (RLS) is mandatory and is enabled by the applied schema
migration:
public readers see only published Experiences and their Stops; authenticated
creators can additionally read and manage their own content. The schema has
not yet been connected to the application UI.

### Creator authentication

Minimal email/password authentication is available at `/auth/sign-up` and
`/auth/sign-in`. Supabase stores the session in cookies, the Next.js proxy
refreshes it for auth and creator routes, and `/creator` verifies the signed-in
identity server-side. The creator page is identity-only; it does not query or
modify Experiences yet.

In the `ventour` Supabase dashboard:

1. Open **Authentication → Providers → Email** and keep email/password enabled.
2. Decide whether **Confirm email** is required. Hosted projects normally
   require confirmation; the app displays confirmation instructions and also
   supports projects where confirmation is disabled.
3. Open **Authentication → URL Configuration**. Set **Site URL** to the exact
   production Vercel URL, for example `https://YOUR-PRODUCTION-DOMAIN`.
4. Add `http://localhost:3000/auth/confirm` and
   `https://YOUR-PRODUCTION-DOMAIN/auth/confirm` to **Redirect URLs**. Add a
   Vercel preview-domain pattern only if preview deployments will test auth.

The sign-up action supplies `/auth/confirm` as its email redirect. Keep the
default confirmation link behavior; no custom email template is required by
this implementation. Supabase must allow each callback URL before it will use
it. See [Supabase redirect URL guidance](https://supabase.com/docs/guides/auth/redirect-urls).

### Database migrations

Version-controlled SQL in [`supabase/migrations`](supabase/migrations) is the
schema source of truth. The base migration creates `experiences` and
`experience_stops`, constraints, timestamps, indexes, grants, and RLS policies.
It contains no sample records. The base migration has been applied to the
linked `ventour` project; creating future migration files will not apply them
automatically.

From the repository root, use the Supabase CLI via `npx` (Node.js 20+; no app
dependency is required). Run `init` only once, if `supabase/config.toml` is absent:

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
```

Find the project reference in your Supabase dashboard. Confirm the linked
project and review the pending migration before applying it. Enter any database
password only at the CLI prompt; never put it in source code or command arguments.
Future migrations should be reviewed against the remote migration history
before being applied; do not reset the remote database or overwrite existing
tables.

Once the pending list is correct:

```bash
npx supabase db push
npx supabase migration list
```

The push applies pending SQL to the linked project and records migration history.
Keep subsequent schema changes in new migrations. No Experience query, creator
CRUD, or deployment automation is introduced by the auth setup. See the
[Supabase migration workflow](https://supabase.com/docs/guides/local-development/cli-workflows).

### Domain mapping notes

Domain types remain independent of database rows. Database UUIDs replace the
sample's readable IDs; `creator_id` and timestamps are database fields not yet
represented in the domain. A future mapper will translate `experience_id` to
`experienceId` and `trigger_radius_meters` to `triggerRadiusMeters`. Domain and
database Stops both use zero-based `position`; the UI may display
`position + 1` when a human-readable stop number is needed. Stops must be
explicitly fetched in position order and assembled into `Experience.stops`.
The database defaults to a 40-meter trigger radius; the existing sample retains
its explicit 30-meter value. Neither currently implements arrival detection.
Unique positions need not be contiguous; future reorder operations must avoid
temporary position collisions. No mapping layer or generated types exist yet.

## Deployment

The production application is live on Vercel through its GitHub integration.
GitHub's `main` branch remains the production deployment path. Vercel detected
Next.js, uses the existing `npm run build` script (`next build --webpack`), and
serves the application over HTTPS. No `vercel.json`, custom CI/CD, or other
deployment infrastructure is needed.

For future deployments:

1. Push this repository to GitHub on the `main` branch.
2. Sign in to [Vercel](https://vercel.com) and import the
   `guided-experiences` GitHub repository.
3. Allow Vercel to detect Next.js.
4. Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to the project's environment
   variables. Select Production; add it to Preview too if you plan to use
   preview deployments for field testing.
5. Add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the same Vercel environments.
6. Redeploy after adding or changing public environment variables.
7. Open the resulting HTTPS URL and confirm the map loads before testing
   location, compass, or creator authentication.

Vercel detects `package-lock.json` and uses `npm install`. No custom output
directory or install setting is needed.

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

### Real-device field-test results

The deployed HTTPS application passed an initial outdoor walking test on a real
phone. HTTPS provided the required secure context for geolocation and
orientation testing.

#### Verified

- Production deployment, Mapbox, browser geolocation, and the map/player UI
  work on a real mobile browser.
- Current position can update while walking.
- Compass heading worked in real-device use and appeared useful; no major
  compass problem was observed during this test.
- Distance changed as the user moved, confirming the existing geolocation →
  Haversine distance → UI flow responds to changing location.

#### Observed mobile-browser behavior

- **Use my location** works, though it may occasionally need to be pressed
  again to re-enable location sharing.
- Location updates can lag, but most of the time the browser eventually
  refreshed to the latest position.
- Browser sensor lifecycle is not equivalent to native continuous location
  tracking. These observations are expected mobile-browser behavior to
  investigate later, not confirmed application defects.

#### Not yet fully validated

- Precise GPS update cadence and suitability for arrival detection.
- Distance accuracy and monotonicity over a longer controlled route.
- Background or locked-screen behavior suitable for a production guide.
- Native-versus-web sensor differences.
- Compass accuracy as a controlled sensor benchmark.

### Milestone 0 assessment

Milestone 0 successfully demonstrates that a mobile-web-first approach is
viable for the initial guided-experience consumer application. A native iOS
application is not required at this stage. The remaining mobile-browser
limitations should inform later product design rather than block progression to
a subsequent milestone.

Before walking with the prototype, update the first stop in
[`src/data/sampleExperience.ts`](src/data/sampleExperience.ts). Edit its
`title`, `latitude`, and `longitude`, then deploy the change.

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

### Further optional validation

- Use a longer controlled route to assess GPS cadence and distance accuracy.
- Compare compass readings with a native compass in varied outdoor conditions.
- Record background, locked-screen, GPS jitter, and app-switch behavior using
  the notes template below.

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
