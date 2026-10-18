"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedCreator, getCreatorExperience, isUuid } from "@/lib/creator-experiences";
import {
  isLastPublishedStop,
  stopActionError,
  type StopActionState,
} from "@/lib/stop-action-result";

export type { StopActionState } from "@/lib/stop-action-result";

async function getLastPublishedStopError(
  creator: Awaited<ReturnType<typeof getAuthenticatedCreator>>,
  experienceId: string,
  stopId: string,
  status: "draft" | "published",
) {
  if (!creator || status !== "published") return null;

  try {
    const { data, count, error } = await creator.supabase
      .from("experience_stops")
      .select("id", { count: "exact" })
      .eq("experience_id", experienceId)
      .limit(2);

    if (error || count === null) return null;

    return isLastPublishedStop(
      status,
      count,
      (data ?? []).some((stop) => stop.id === stopId),
    )
      ? stopActionError("last-published-stop")
      : null;
  } catch {
    // Let the RPC and its database constraint remain authoritative. If it also
    // fails, mutateStop returns a non-sensitive generic error.
    return null;
  }
}

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
    return stopActionError("inaccessible");
  }
  const parent = await getCreatorExperience(creator.supabase, creator.userId, experienceId);
  if (parent.status !== "success") return stopActionError("inaccessible");

  if (operation === "delete" && stopId) {
    const blocked = await getLastPublishedStopError(
      creator,
      experienceId,
      stopId,
      parent.experience.status,
    );
    if (blocked) return blocked;
  }

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
      return stopActionError("invalid-input");
    }
    Object.assign(fields, { p_title: title, p_description: String(form.get("description") ?? "").trim(),
      p_latitude: latitude, p_longitude: longitude, p_trigger_radius_meters: radius });
  }
  try {
    const { error } = await creator.supabase.rpc("edit_experience_stop", {
      p_experience_id: experienceId, p_stop_id: stopId, p_operation: operation, ...fields,
    });
    if (error) {
      // A concurrent deletion can pass the preflight and then lose the race.
      // Re-read application state instead of treating raw PostgreSQL text as
      // the UI contract. The database constraint remains the final safeguard.
      if (operation === "delete" && stopId) {
        const blocked = await getLastPublishedStopError(
          creator,
          experienceId,
          stopId,
          parent.experience.status,
        );
        if (blocked) return blocked;
      }
      return stopActionError(
        "mutation-failed",
        "Unable to save this Stop change. Reload and try again.",
      );
    }
  } catch {
    return stopActionError("mutation-failed");
  }
  revalidatePath(`/creator/experiences/${experienceId}`);
  revalidatePath(`/experiences/${experienceId}`);
  return { status: "success", message: "Stop change saved." };
}
