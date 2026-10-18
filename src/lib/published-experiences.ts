import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Experience } from "@/domain/experience";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function getPublishedExperience(id: string): Promise<Experience | null> {
  const { url, publishableKey } = getSupabaseConfig();
  // Deliberately anonymous, even when the visitor has creator cookies.
  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  // One statement/snapshot avoids a publication race between parent/Stop reads.
  const { data, error } = await supabase.from("experiences")
    .select("id, title, description, status, experience_stops(id, experience_id, position, title, description, latitude, longitude, trigger_radius_meters)")
    .eq("id", id).eq("status", "published")
    .order("position", { referencedTable: "experience_stops", ascending: true })
    .maybeSingle();
  if (error) throw new Error("Unable to load this Experience. Please try again.");
  if (!data) return null;
  const stops = data.experience_stops.map(row => ({
    id: row.id, experienceId: row.experience_id, position: row.position,
    title: row.title, description: row.description,
    latitude: row.latitude, longitude: row.longitude, triggerRadiusMeters: row.trigger_radius_meters,
  }));
  if (!stops.length || stops.some((stop, index) => stop.experienceId !== id || stop.position !== index)) {
    throw new Error("This Experience is temporarily unavailable.");
  }
  return { id: data.id, title: data.title, description: data.description, status: "published", stops };
}
