import "server-only";
import type { ExperienceStop } from "@/domain/experience";
import type { AuthenticatedCreator } from "@/lib/creator-experiences";

// Call only after the parent Experience has passed the creator ownership check.
export async function listCreatorStops(creator: AuthenticatedCreator, experienceId: string): Promise<ExperienceStop[] | null> {
  try {
    const { data, error } = await creator.supabase.from("experience_stops")
      .select("id, experience_id, position, title, description, latitude, longitude, trigger_radius_meters")
      .eq("experience_id", experienceId).order("position", { ascending: true });
    if (error) return null;
    return (data ?? []).map((row) => ({
      id: row.id, experienceId: row.experience_id, position: row.position,
      title: row.title, description: row.description,
      latitude: row.latitude, longitude: row.longitude,
      triggerRadiusMeters: row.trigger_radius_meters,
    }));
  } catch {
    return null;
  }
}
