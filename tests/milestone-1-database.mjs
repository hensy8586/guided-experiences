// Isolated SQL regression checks; never connects to Supabase or a remote DB.
// Pass an installed PGlite entry point as argv[2]; see docs/milestone-1.md.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (!process.argv[2]) throw new Error("Pass the path to a temporary PGlite dist/index.js installation.");
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
let checks = 0;
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const experience = "33333333-3333-4333-8333-333333333333";
const otherExperience = "44444444-4444-4444-8444-444444444444";
const sql = (text) => db.exec(text);
const rows = async (text) => (await db.query(text)).rows;
async function denied(text, pattern) {
  await assert.rejects(() => sql(text), pattern);
  // Explicit transactions remain aborted after a rejected deferred check.
  await sql("rollback");
  checks++;
}
function check(actual, expected) { assert.deepEqual(actual, expected); checks++; }
async function login(user) {
  await sql(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false)`);
}
async function anonymous() {
  await sql("set role anon; select set_config('request.jwt.claim.sub','',false)");
}
const publish = `select public.set_experience_publication('${experience}',true)`;
const unpublish = `select public.set_experience_publication('${experience}',false)`;
const stops = () => rows(`select id,position from public.experience_stops where experience_id='${experience}' order by position`);
const edit = (op, id) => `select public.edit_experience_stop('${experience}','${op}','${id}')`;

try {
  // Minimal Supabase auth shape only; auth.uid() reads this test session's claim.
  await sql(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;`);
  const migrationDir = new URL("../supabase/migrations/", import.meta.url);
  for (const file of readdirSync(migrationDir).filter(name => name.endsWith(".sql")).sort()) {
    await sql(readFileSync(new URL(file, migrationDir), "utf8"));
  }
  await sql(`insert into auth.users values ('${owner}'),('${other}')`);
  await login(other);
  await sql(`insert into public.experiences(id,creator_id,title) values('${otherExperience}',auth.uid(),'Other draft')`);
  await login(owner);
  await denied(`insert into public.experiences(creator_id,title) values('${other}','Spoof')`, /row-level security/);
  await sql(`insert into public.experiences(id,creator_id,title) values('${experience}',auth.uid(),'Test')`);
  await denied(`update public.experiences set creator_id='${other}' where id='${experience}'`, /row-level security/);
  await denied(publish, /published_requires_stops/);
  await denied(`update public.experiences set status='published' where id='${experience}'`, /published_requires_stops/);
  for (let n=0;n<3;n++) await sql(`select public.edit_experience_stop('${experience}','add',null,'Stop ${n}','',45,-92,40)`);
  const original = await stops();
  check(original.map(s => s.position), [0,1,2]);
  await anonymous();
  check((await rows("select * from public.experiences")).length, 0);
  check((await rows("select * from public.experience_stops")).length, 0);
  await denied(publish, /permission denied/);
  await login(owner);
  await denied(`update public.experience_stops set experience_id='${otherExperience}' where id='${original[0].id}'`, /row-level security/);
  await denied(edit("up", original[0].id), /Cannot move/);
  await denied(edit("down", original[2].id), /Cannot move/);
  await denied(edit("delete", otherExperience), /Stop not found/);
  // Direct owners can gap their own draft; editor and publication reject it.
  await sql(`update public.experience_stops set position=8 where id='${original[2].id}'`);
  await denied(publish, /published_invalid_order/);
  await denied(edit("up", original[1].id), /Invalid stop ordering/);
  await sql(`update public.experience_stops set position=2 where id='${original[2].id}'`);
  await sql(publish);
  await sql(edit("up", original[1].id));
  check((await stops())[0].id, original[1].id);
  await sql(edit("down", original[1].id));
  check((await stops()).map(s => s.id), original.map(s => s.id));
  await denied(`update public.experience_stops set position=9 where id='${original[2].id}'`, /published_invalid_order/);
  await denied(`update public.experience_stops set latitude=91 where id='${original[0].id}'`, /latitude_valid/);
  await denied(`update public.experience_stops set trigger_radius_meters=0 where id='${original[0].id}'`, /radius_positive/);
  await denied(`begin; set constraints all immediate; delete from public.experience_stops where experience_id='${experience}'; commit`, /published_requires_stops/);
  await denied(`begin; set constraints all immediate; update public.experience_stops set position=9 where id='${original[2].id}'; commit`, /published_invalid_order/);
  check((await stops()).map(s => s.position), [0,1,2]);
  await sql(edit("delete", original[1].id));
  check((await stops()).map(s => s.position), [0,1]);
  await sql(edit("delete", original[2].id));
  await denied(edit("delete", original[0].id), /published_requires_stops/);
  await denied(`delete from public.experience_stops where experience_id='${experience}'`, /published_requires_stops/);
  // Deferred multi-statement replacement permits temporary emptiness, not invalid commits.
  await sql(`begin; delete from public.experience_stops where experience_id='${experience}';
    insert into public.experience_stops(experience_id,position,title,latitude,longitude) values('${experience}',0,'Replacement',45,-92); commit`);
  check((await stops()).length, 1);
  await login(other);
  await denied(unpublish, /Experience not found/);
  await denied(edit("delete", original[0].id), /Experience not found/);
  check(await rows(`update public.experiences set title='Attack' where id='${experience}' returning id`), []);
  check(await rows(`delete from public.experience_stops where experience_id='${experience}' returning id`), []);
  await anonymous();
  check((await rows("select * from public.experiences")).length, 1);
  check((await rows("select * from public.experience_stops")).length, 1);
  await login(owner);
  await sql(unpublish);
  check((await rows("select * from public.experiences where status='published'")).length, 0);
  await anonymous();
  check((await rows("select * from public.experiences")).length, 0);
  check((await rows("select * from public.experience_stops")).length, 0);
  await login(owner);
  await sql(publish);
  await sql(`delete from public.experiences where id='${experience}'`);
  check((await stops()).length, 0);
  console.log(`${checks} isolated SQL checks passed. This is not a concurrent-session or hosted Supabase test.`);
} finally { await db.close(); }
