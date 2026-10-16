import "server-only";

import type { ExperienceStatus } from "@/domain/experience";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type ExperienceRow = {
  id: string;
  title: string;
  description: string;
  status: ExperienceStatus;
  created_at: string;
  updated_at: string;
};

export type CreatorExperience = {
  id: string;
  title: string;
  description: string;
  status: ExperienceStatus;
  createdAt: string;
  updatedAt: string;
};

export type AuthenticatedCreator = {
  supabase: ServerSupabaseClient;
  userId: string;
  email: string;
};

export type ExperienceReadResult =
  | { status: "success"; experience: CreatorExperience }
  | { status: "not-found" }
  | { status: "error" };

function mapExperienceRow(row: ExperienceRow): CreatorExperience {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function getAuthenticatedCreator(): Promise<AuthenticatedCreator | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error || !data?.claims.sub) {
      return null;
    }

    return {
      supabase,
      userId: data.claims.sub,
      email: data.claims.email ?? "Email unavailable",
    };
  } catch {
    return null;
  }
}

export async function listCreatorExperiences(
  supabase: ServerSupabaseClient,
  creatorId: string,
) {
  try {
    const { data, error } = await supabase
      .from("experiences")
      .select("id, title, description, status, created_at, updated_at")
      .eq("creator_id", creatorId)
      .order("updated_at", { ascending: false });

    if (error) {
      return null;
    }

    return ((data ?? []) as ExperienceRow[]).map(mapExperienceRow);
  } catch {
    return null;
  }
}

export async function getCreatorExperience(
  supabase: ServerSupabaseClient,
  creatorId: string,
  experienceId: string,
): Promise<ExperienceReadResult> {
  if (!isUuid(experienceId)) {
    return { status: "not-found" };
  }

  try {
    const { data, error } = await supabase
      .from("experiences")
      .select("id, title, description, status, created_at, updated_at")
      .eq("id", experienceId)
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (error) {
      return { status: "error" };
    }

    if (!data) {
      return { status: "not-found" };
    }

    return {
      status: "success",
      experience: mapExperienceRow(data as ExperienceRow),
    };
  } catch {
    return { status: "error" };
  }
}
