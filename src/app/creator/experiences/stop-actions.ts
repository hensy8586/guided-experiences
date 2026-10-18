"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedCreator, getCreatorExperience, isUuid } from "@/lib/creator-experiences";

export type StopActionState = { success: boolean; message: string };

export async function mutateStop(
  experienceId: string,
  stopId: string | null,
  operation: "add" | "edit" | "delete" | "up" | "down",
  _state: StopActionState,
  form: FormData,
): Promise<StopActionState> {
  const creator = await getAuthenticatedCreator();
  if (!creator) redirect("/auth/sign-in?next=/creator");
  if (!isUuid(experienceId) || (stopId !== null && !isUuid(stopId))) {
    return { success: false, message: "Experience or Stop not found." };
  }
  const parent = await getCreatorExperience(creator.supabase, creator.userId, experienceId);
  if (parent.status !== "success") return { success: false, message: "Unable to access this Experience." };

  const fields: Record<string, string | number> = {};
  if (operation === "add" || operation === "edit") {
    const title = String(form.get("title") ?? "").trim();
    const latitudeText = String(form.get("latitude") ?? "").trim();
    const longitudeText = String(form.get("longitude") ?? "").trim();
    const radiusText = String(form.get("radius") ?? "").trim();
    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    const radius = Number(radiusText);
    if (!title || !latitudeText || !longitudeText || !radiusText ||
        !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
        !Number.isInteger(radius) || radius <= 0 || radius > 2147483647) {
      return { success: false, message: "Enter a title, valid coordinates, and a positive whole-number radius." };
    }
    Object.assign(fields, { p_title: title, p_description: String(form.get("description") ?? "").trim(),
      p_latitude: latitude, p_longitude: longitude, p_trigger_radius_meters: radius });
  }
  try {
    const { error } = await creator.supabase.rpc("edit_experience_stop", {
      p_experience_id: experienceId, p_stop_id: stopId, p_operation: operation, ...fields,
    });
    if (error) return { success: false, message: "Unable to save this Stop change. Reload and try again." };
  } catch {
    return { success: false, message: "Unable to save this Stop change. Please try again." };
  }
  revalidatePath(`/creator/experiences/${experienceId}`);
  return { success: true, message: "Stop change saved." };
}
