export type ExperienceStatus = "draft" | "published";

export type ExperienceStop = {
  id: string;
  experienceId: string;
  position: number;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  triggerRadiusMeters: number;
};

export type Experience = {
  id: string;
  title: string;
  description: string;
  status: ExperienceStatus;
  stops: ExperienceStop[];
};
