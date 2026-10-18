"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedCreator, isUuid } from "@/lib/creator-experiences";

export async function setPublication(id: string, published: boolean, _state: { message: string }) {
  void _state;
  const creator = await getAuthenticatedCreator();
  if (!creator) redirect("/auth/sign-in?next=/creator");
  if (!isUuid(id) || typeof published !== "boolean") return { message: "Experience not found." };
  try {
    const { error } = await creator.supabase.rpc("set_experience_publication", {
      p_experience_id: id, p_published: published,
    });
    if (error) {
      if (error.message === "published_requires_stops") return { message: "Add at least one Stop before publishing." };
      if (error.message === "published_invalid_order") return { message: "Stops must have contiguous positions starting at zero before publishing." };
      return { message: "Unable to change publication. Reload and try again." };
    }
  } catch {
    return { message: "Unable to change publication. Please try again." };
  }
  revalidatePath("/creator");
  revalidatePath(`/creator/experiences/${id}`);
  revalidatePath(`/experiences/${id}`);
  return { message: published ? "Experience published." : "Experience unpublished." };
}
