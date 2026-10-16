"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getAuthenticatedCreator,
  isUuid,
} from "@/lib/creator-experiences";

export type ExperienceActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: {
    title?: string;
  };
};

function readExperienceInput(formData: FormData) {
  const rawTitle = formData.get("title");
  const rawDescription = formData.get("description");
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
  const description =
    typeof rawDescription === "string" ? rawDescription.trim() : "";

  if (!title) {
    return {
      error: {
        status: "error" as const,
        message: "Enter a title for the Experience.",
        fieldErrors: { title: "Title is required." },
      },
    };
  }

  return { value: { title, description } };
}

export async function createExperience(
  _previousState: ExperienceActionState,
  formData: FormData,
): Promise<ExperienceActionState> {
  const input = readExperienceInput(formData);

  if (input.error) {
    return input.error;
  }

  const creator = await getAuthenticatedCreator();

  if (!creator) {
    redirect("/auth/sign-in?next=/creator");
  }

  let createdId: string | null = null;

  try {
    const { data, error } = await creator.supabase
      .from("experiences")
      .insert({
        creator_id: creator.userId,
        title: input.value.title,
        description: input.value.description,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !data) {
      return {
        status: "error",
        message: "Unable to create the Experience. Please try again.",
      };
    }

    createdId = (data as { id: string }).id;
  } catch {
    return {
      status: "error",
      message: "Unable to create the Experience. Please try again.",
    };
  }

  revalidatePath("/creator");
  redirect(`/creator/experiences/${createdId}?created=1`);
}

export async function updateExperience(
  experienceId: string,
  _previousState: ExperienceActionState,
  formData: FormData,
): Promise<ExperienceActionState> {
  if (!isUuid(experienceId)) {
    return { status: "error", message: "Experience not found." };
  }

  const input = readExperienceInput(formData);

  if (input.error) {
    return input.error;
  }

  const creator = await getAuthenticatedCreator();

  if (!creator) {
    redirect("/auth/sign-in?next=/creator");
  }

  try {
    const { data, error } = await creator.supabase
      .from("experiences")
      .update({
        title: input.value.title,
        description: input.value.description,
      })
      .eq("id", experienceId)
      .eq("creator_id", creator.userId)
      .select("id")
      .maybeSingle();

    if (error) {
      return {
        status: "error",
        message: "Unable to save the Experience. Please try again.",
      };
    }

    if (!data) {
      return { status: "error", message: "Experience not found." };
    }
  } catch {
    return {
      status: "error",
      message: "Unable to save the Experience. Please try again.",
    };
  }

  revalidatePath("/creator");
  revalidatePath(`/creator/experiences/${experienceId}`);

  return { status: "success", message: "Experience saved." };
}

export async function deleteExperience(
  experienceId: string,
  _previousState: ExperienceActionState,
  _formData: FormData,
): Promise<ExperienceActionState> {
  void _previousState;
  void _formData;

  if (!isUuid(experienceId)) {
    return { status: "error", message: "Experience not found." };
  }

  const creator = await getAuthenticatedCreator();

  if (!creator) {
    redirect("/auth/sign-in?next=/creator");
  }

  try {
    const { data, error } = await creator.supabase
      .from("experiences")
      .delete()
      .eq("id", experienceId)
      .eq("creator_id", creator.userId)
      .select("id")
      .maybeSingle();

    if (error) {
      return {
        status: "error",
        message: "Unable to delete the Experience. Please try again.",
      };
    }

    if (!data) {
      return { status: "error", message: "Experience not found." };
    }
  } catch {
    return {
      status: "error",
      message: "Unable to delete the Experience. Please try again.",
    };
  }

  revalidatePath("/creator");
  redirect("/creator");
}
