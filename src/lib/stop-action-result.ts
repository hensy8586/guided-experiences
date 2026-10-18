import type { ExperienceStatus } from "@/domain/experience";

export type StopActionErrorCode =
  | "invalid-input"
  | "inaccessible"
  | "last-published-stop"
  | "mutation-failed";

export type StopActionState =
  | { status: "idle"; message: "" }
  | { status: "success"; message: string }
  | { status: "error"; code: StopActionErrorCode; message: string };

export const INITIAL_STOP_ACTION_STATE: StopActionState = {
  status: "idle",
  message: "",
};

export const LAST_PUBLISHED_STOP_MESSAGE =
  "Cannot delete the last stop. A published Experience must have at least one stop. Unpublish the Experience first if you want to remove it.";

export function stopActionError(
  code: StopActionErrorCode,
  message?: string,
): StopActionState {
  const defaultMessages: Record<StopActionErrorCode, string> = {
    "invalid-input":
      "Enter a title, valid coordinates, and a positive whole-number radius.",
    inaccessible: "Unable to access this Experience or Stop.",
    "last-published-stop": LAST_PUBLISHED_STOP_MESSAGE,
    "mutation-failed": "Unable to save this Stop change. Please try again.",
  };

  return { status: "error", code, message: message ?? defaultMessages[code] };
}

export function isLastPublishedStop(
  experienceStatus: ExperienceStatus,
  stopCount: number,
  targetStopExists: boolean,
) {
  return experienceStatus === "published" && stopCount === 1 && targetStopExists;
}
