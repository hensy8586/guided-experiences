# Milestone 1 — Persistent creator and public Experience loop

## Status and objective

Ventour is the eventual product name. Milestone 1 delivers the first web-first
product loop: a creator authenticates, authors an Experience with ordered
geographic Stops, publishes it, and shares a URL that anonymous consumers follow
manually on a phone. No consumer account is required.

**Feature work is complete and production-tested by the project owner. Formal
closure is pending the Step 8 integrity migration and post-deployment checks.**
The audit reproduced a transaction-mode defect in the applied publication guard;
the repository fix passes isolated regression checks but is not yet applied to
Ventour. This is a closure gate, not a request to start Milestone 2.

## Completed capabilities and architecture

```text
Creator → Next.js Server Components / Server Actions → Supabase Auth + RLS
                                                        ├─ experiences
                                                        └─ experience_stops
Anonymous URL → request-time published query → shared consumer player
                                              ├─ Mapbox map / markers
                                              ├─ browser GPS / optional heading
                                              └─ Haversine distance / manual Stop navigation
GitHub main → Vercel → HTTPS
```

- Email/password sign-up, confirmation, sign-in, local-session sign-out.
- Creator-only Experience list/create/edit/delete and Stop coordinate editing.
- Map click or manual latitude/longitude selection; positive trigger radius.
- Atomic append, edit, move up/down, and delete/compaction.
- Owner publish/unpublish and a shareable UUID URL.
- Anonymous multi-Stop player, GPS, optional compass, camera controls, and distance.
- Homepage remains a local sample; no persisted progress or arrival detection.

Server Actions recheck signed JWT claims with Supabase `getClaims()`, obtain the
creator ID server-side, and use the ordinary cookie-session Supabase client.
Proxy refreshes auth cookies for auth/creator routes; public Experience reads
deliberately use an anonymous publishable-key client without creator cookies.
No service-role key, privileged query, ORM, or separate backend is used.

## Domain and database

Framework-independent `Experience`: id, title, description, draft/published
status, and ordered Stops. `ExperienceStop`: id, experienceId, zero-based
position, title, description, latitude, longitude, triggerRadiusMeters.
Database snake_case is mapped at the read boundary; timestamps and creator
metadata do not expand the consumer domain unnecessarily.

`experiences` has a generated UUID, creator FK to `auth.users` (cascade), title,
description, checked status, and created/updated timestamps. `experience_stops`
has a generated UUID, cascading parent FK, position, text, coordinates, radius,
and timestamps. Checks require nonblank titles, bounded coordinates, positive
radius (default 40), and nonnegative positions; `(experience_id, position)` is
unique. Timestamp triggers keep updates current. No media, profiles, or routes
are stored.

## Authorization and direct-write decision

RLS is mandatory on both tables. Anonymous SELECT sees published parents and
their Stops only. Authenticated owners additionally see their own drafts.
INSERT requires ownership; UPDATE checks both old and resulting ownership;
DELETE requires ownership. Stops derive ownership from the parent. Changing a
Stop's parent to another creator fails RLS. Changing an Experience's creator
also fails RLS. Public queries explicitly require published status even if the
viewer is the owner, and select parent/ordered Stops in one statement snapshot.

**Decision A: retain direct table grants for Milestone 1.** Invoker RPCs need the
caller's table permissions. Direct owners may create gaps or move Stops between
their own drafts; this is bounded self-corruption, not an ownership bypass.
The editor RPC refuses malformed ordering and publishing refuses gaps. Repair
requires deliberate owner/admin correction outside the editor. Direct writes
are not the supported authoring path. Do not revoke writes without redesigning
and verifying RPC authorization; no SECURITY DEFINER conversion is justified now.

## Ordering and publication safeguards

`edit_experience_stop` checks `auth.uid()` and ownership, locks the parent before
Stops, validates contiguous positions, appends at count, compacts deletions in
ascending order, and swaps through unused position n. Forged/cross-parent IDs
fail. Its normal callers serialize on the same parent row.

`set_experience_publication` checks ownership and locks that parent. Published
Experiences require at least one Stop with contiguous positions. Existing table
checks enforce title/coordinate/radius validity. Deferred constraint checks
validate final state at commit, allowing temporary reorder positions. Last-Stop
deletion while published is rejected; unpublish first. Whole-Experience deletion
still cascades. Saved content edits propagate on new public loads; no versions.

The audit fix changes the Stop parent-update trigger from BEFORE to AFTER.
Previously, `SET CONSTRAINTS ALL IMMEDIATE` checked the pre-deletion Stop set and
could commit a published Experience with zero Stops. AFTER timing checks the
resulting state. Default deferred RPC ordering continues to work. Immediate-mode
multi-statement reorder can reject intermediate states safely; use normal
deferred mode. All functions remain invokers with empty search paths; execution
grants and RLS are unchanged.

Direct updates/deletes lock a child before the parent trigger, whereas the RPC
and Experience deletion lock parent first. Example: one transaction holds the
parent awaiting a child; another holds that child awaiting the parent. PostgreSQL
may detect a deadlock and abort one transaction. This is a retryable failure,
not permission escalation or a partial commit. Parent writes also serialize
publication races; stronger isolation can produce serialization failures.
Multi-session contention has **not** been executed in this audit. PGlite does
not prove hosted PostgreSQL concurrency behavior.

## Routes and workflows

- `/`: anonymous sample player.
- `/auth/sign-up`, `/auth/sign-in`, `/auth/confirm`: creator authentication.
- `/creator`: own Experiences, newest updated first.
- `/creator/experiences/new`: create draft.
- `/creator/experiences/[id]`: metadata, Stops, publication, deletion, public link.
- `/experiences/[id]`: anonymous published player; neutral Not Found for hidden IDs.

Redirect targets are fixed/allowlisted to `/creator` or sign-in. Confirmation
parameters use supported flows only; exceptions return the neutral confirmation
error rather than diagnostics. Sign-out now always invokes Supabase rather than
silently skipping it after failed claims verification. Auth outages may still
deny access or require retry. Signed access JWTs can remain valid until expiry
after session revocation: `getClaims()` is not an instantaneous revocation check.

## Public caching and privacy

`connection()` delays data rendering until a request; Supabase fetches use
`cache: "no-store"`. No publication data is placed in a persistent Data/Full
Route Cache; only a content-free shell can be prerendered. Public responses have
private/no-store and CDN no-store headers. Creator mutations revalidate the
affected routes. Public sharing uses a normal link, not automatic prefetching.
A fresh anonymous request starting after unpublish commits cannot retrieve the
draft through this path. Already-open pages, in-flight earlier requests, Router
Cache/back-forward snapshots and downloaded content cannot be recalled.
Query outages use a generic error boundary, not a misleading Not Found result.

## Audit findings and disposition

| Severity | Finding | Disposition |
| --- | --- | --- |
| Medium | Immediate constraint mode could commit an empty/gapped published Experience | Reproduced; new migration fixes trigger timing; remote application pending |
| Medium | Logout could skip sign-out after claims failure; confirmation/logout exceptions escaped | Explicit Supabase logout and safe exception handling |
| Low | Asynchronous Mapbox load errors lacked consumer feedback | Error/load listeners with unmount cleanup and fallback text |
| Low | Direct draft writes can gap ordering; mixed lock order can deadlock | Explicitly accepted bounded limitation; use RPC and retry failed transactions |
| Informational | README incorrectly treated publishing migration as pending | Updated to owner-reported deployment/test facts |

No demonstrated cross-owner access, public draft leakage, secret exposure, or
sensor lifecycle regression was found. This is a focused engineering review,
not a comprehensive penetration test or concurrency proof.

## Test evidence

Owner-reported production tests before this audit: creator authentication and
Experience CRUD passed; Step 6 Stop editing/ordering passed against Ventour;
Step 7 publishing and anonymous public playback were deployed and manually
tested successfully. Milestone 0 phone/walking findings remain in the unchanged
[`milestone-0.md`](milestone-0.md). Do not interpret these as exhaustive adversarial tests.

Audit execution:

- Reproduced the pre-fix immediate-mode defect in temporary PGlite: published,
  zero Stops committed.
- `tests/milestone-1-database.mjs`: 36 isolated checks across all migrations,
  covering RLS, owner spoofing, parent reassignment, boundaries, forged IDs,
  append/reorder/compaction, publication, direct-write guards, immediate and
  deferred transactions, anonymous visibility, unpublishing, and cascading delete.
- `tests/utilities.test.mjs`: two test groups covering Haversine identity,
  symmetry, nearby distance/date line; compass sectors/normalization and invalid
  orientation. Node's TS module-detection warning is harmless; no package module
  mode change is needed solely for the test runner.
- `npm run lint`, `npm run build` (Webpack), and `git diff --check`: passed.
- Seven read-only local production HTTP checks passed: sample homepage;
  anonymous creator dashboard/new-route redirects; invalid and nonexistent
  public IDs; two invalid confirmation/external-return cases. Public responses
  included browser/CDN no-store headers. Streamed redirects/Not Found pages can
  start with HTTP 200; their framework redirect/404 signals were checked too.
- Tracked-file credential-pattern scan: no matches; only `.env.example` tracked.
  This is a pattern scan of the current tree, not an exhaustive history audit.
- No production records were mutated, no migrations pushed, and no deployment
  performed by the audit. No live account login/logout or phone test was repeated.

Run utility checks with Node 22.18+ (native TypeScript stripping):

```bash
node --test tests/utilities.test.mjs
npm run lint
npm run build
git diff --check
```

Optional SQL tests need no application dependency or remote credentials:

```bash
AUDIT_TMP=$(mktemp -d)
npm install --prefix "$AUDIT_TMP" --no-audit --no-fund @electric-sql/pglite
node tests/milestone-1-database.mjs "$AUDIT_TMP/node_modules/@electric-sql/pglite/dist/index.js"
```

The script creates only an in-memory database with a minimal test `auth.uid()`
and roles; it never reads `.env.local`. It does not exercise real Supabase Auth,
PostgREST request handling, or concurrent sessions.

## Deployment and migrations

GitHub `main` automatically deploys Next.js to Vercel over HTTPS. Preserve
`next build --webpack`: the choice addresses a local Turbopack worker-port
limitation, not a product requirement. No custom CI/CD or `vercel.json`.
Configure the public Mapbox token, Supabase URL and Supabase publishable key in
Vercel; keep local values in ignored `.env.local`. Supabase dashboard Site URL
and redirect allowlist must include the actual deployed auth callback and local
development callback. `supabase/config.toml` describes local CLI defaults, not
verified hosted dashboard settings.

Applied to Ventour (per owner):

1. `20261012000000_create_experiences_and_stops.sql`
2. `20261015000000_stop_editor.sql`
3. `20261017000000_publish_experiences.sql`

Pending audit fix: `20261018000000_publication_trigger_timing.sql`.
It fails rather than modifying any existing malformed published content; if
the preflight fails, review and correct the affected data before retrying.
Review it, confirm the linked project, and run:

```bash
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

## Closure checklist

- [x] First complete author → publish → anonymous consumer loop implemented.
- [x] Owner reports successful Step 7 production testing.
- [x] Audit defect reproduced and fixed locally with regression coverage.
- [ ] Apply the trigger-timing fix to Ventour and verify migration history.
- [ ] Deploy auth/map reliability fixes through the normal GitHub/Vercel path.
- [ ] Recheck published reorder/delete, last-Stop protection, unpublish/fresh
  incognito access, sign-out, and phone Stop navigation. Exercise immediate-mode
  regression only in an isolated/staging database, not on production records.

Milestone 1 can be formally closed after these outstanding checks pass; it is
not yet marked closed merely because the fix exists in Git.

## Remaining limitations and Milestone 2 opportunities

Acceptable current limitations: browser GPS lag, optional/variable compass,
last-known readings, no guaranteed background tracking, no saved consumer
progress, and already-downloaded content cannot be revoked. Mapbox/WebGL/network
availability is external; failure text and Stop details remain usable. Very long
descriptions may require phone scrolling. Real multi-session SQL stress tests,
automated browser/accessibility tests, and controlled sensor accuracy tests were
not performed here.

Future opportunities (not designed or implemented here): improve creator
validation/recovery based on usage, study GPS freshness/accuracy before arrival
logic, and evaluate consumer progress and content presentation. No routing,
media, AI, payments, marketplace, native app, or other Milestone 2 features were added.
