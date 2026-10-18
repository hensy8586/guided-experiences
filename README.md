# Guided Experiences

Guided Experiences is a future platform for creators to publish location-based experiences, including walking tours, food tours, treasure hunts, and photography walks. People will be able to follow these experiences from their phones and discover places through local knowledge.

## Current milestone

Milestone 0 is complete. Milestone 1 adds the Experience domain, database
foundation, creator authentication, Experience/Stop editing, and publishing.
The homepage demonstrates a local sample; `/experiences/[id]` loads a published
Experience anonymously. Both use the same mobile player with manual Previous/
Next Stop navigation, opt-in geolocation, straight-line distance, and optional heading.

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
been connected to the authenticated creator Experience and Stop workflow.
Public Experience pages read only published content through anonymous RLS access.

### Creator authentication

Minimal email/password authentication is available at `/auth/sign-up` and
`/auth/sign-in`. Supabase stores the session in cookies, the Next.js proxy
refreshes it for auth and creator routes, and `/creator` verifies the signed-in
identity server-side.

### Creator Experience workflow

Authenticated creators can use `/creator` to list their own Experiences, create
a draft at `/creator/experiences/new`, and edit or delete it at
`/creator/experiences/[id]`. Reads run on the server and mutations use Server
Actions through the authenticated Supabase client, so the existing RLS policies
remain the authorization boundary. New Experiences always start as drafts.
The Experience edit page includes ordered Stops with inline add/edit forms,
Mapbox coordinate selection, manual coordinates, and a default 40-meter trigger
radius. Move up/down and delete keep positions contiguous and zero-based;
displayed numbers start at 1.

Stop mutations require `20261015000000_stop_editor.sql`. This migration is
applied to `ventour` and field-tested as part of Step 6. The new publishing
migration is not applied automatically. Inspect it and apply it before using publishing:

```bash
git diff --no-index /dev/null supabase/migrations/20261017000000_publish_experiences.sql
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

The diff command exits with status 1 when it displays differences; this is normal.
Confirm the linked project is `ventour` and review all pending migrations before
the push. The `edit_experience_stop` RPC runs as the caller (`SECURITY INVOKER`),
checks parent ownership, locks the parent and existing Stops, and rejects gapped
ordering. All editor writes use this transaction. Existing direct table grants
and RLS remain unchanged. The publishing migration adds parent-write serialization
and deferred database checks, including for direct owner writes. Published
Experiences must remain nonempty with contiguous Stop positions at commit.
Draft direct writes can still create gaps, which the editor and publishing reject;
use the editor RPC for ordering. No malformed data is silently repaired.

### Publishing and public player

On the Experience editor, save metadata and Stops, then choose **Publish**.
At least one valid persisted Stop is required. The database checks final ordering
atomically with publication using `set_experience_publication` and constraint
triggers; all functions run as `SECURITY INVOKER` under existing RLS. Stop writes
and publishing serialize on the parent row. Temporary reorder positions are
allowed within the transaction, but invalid final published content cannot commit.
Deleting the last published Stop is blocked: unpublish first. Deleting an entire
Experience still cascades normally. Saved edits appear on subsequent public loads.

Use **Open public Experience** and copy its address to share `/experiences/<uuid>`.
No consumer login is needed. **Unpublish** restores draft visibility without
deleting data. Even a signed-in owner cannot open a draft via the public route.
Previous/Next changes the active destination, text, distance, and camera-button
target; it does not move the camera automatically or restart GPS/compass listeners.
Use **Show destination** to move the map to the selected Stop. Progress is not saved.

Public reads use one parent/ordered-Stops query with an explicit published filter,
an anonymous publishable-key client, and `fetch` with `cache: "no-store"`.
`connection()` keeps publication-sensitive rendering request-scoped; no data or
published content is placed in the persistent Data/Full Route Cache. A static
loading shell may still be prerendered. Public responses carry private/no-store
browser and CDN headers. Mutations also revalidate the public path. The creator
share link uses a normal navigation rather than prefetched Router Cache content.
Already-open pages, browser back/forward snapshots, or previously downloaded
content cannot be recalled; reload/new anonymous requests check publication again.

Apply migrations in order: base schema, Stop editor, then publishing. The new
migration fails safely if existing published data is empty or malformed; correct
that data or return it to draft before retrying. No remote push is performed by
the implementation task.

End-to-end check after applying the migration:

1. Sign in, create an Experience, and confirm publishing without Stops is blocked.
2. Add three Stops, reorder them, save metadata, and publish.
3. Open the public link in incognito; check Stop order and Previous/Next boundaries.
4. Enable location/compass on a phone; change Stops and check marker/distance,
   manual camera controls, and uninterrupted sensor permissions.
5. Try deleting the last published Stop; confirm it is blocked.
6. Unpublish and freshly load the URL in incognito and as the owner: both must
   show Not Found. Republish to restore access.
7. With a second creator account, confirm the first account's content cannot be
   changed. Recheck existing Stop edit/reorder/delete and Experience deletion.

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
Keep subsequent schema changes in new migrations. Stop editing adds the RPC
migration without changing the initial schema or RLS policies. See the
[Supabase migration workflow](https://supabase.com/docs/guides/local-development/cli-workflows).

### Domain mapping notes

Domain types remain independent of database rows. Database UUIDs replace the
sample's readable IDs; `creator_id` and timestamps are database fields not yet
represented in the domain. The public loader translates `experience_id` to
`experienceId` and `trigger_radius_meters` to `triggerRadiusMeters`. Domain and
database Stops both use zero-based `position`; the UI may display
`position + 1` when a human-readable stop number is needed. Stops must be
explicitly fetched in position order and assembled into `Experience.stops`.
The database defaults to a 40-meter trigger radius; the existing sample retains
its explicit 30-meter value. Neither currently implements arrival detection.
The creator Stop reader maps `experience_id` and `trigger_radius_meters` into
the existing camelCase Stop type; unused timestamps are not selected. The editor
RPC requires and preserves contiguous positions. No generated database types exist yet.

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
- Confirm the Mapbox map and first Stop load.
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
