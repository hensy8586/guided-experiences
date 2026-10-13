import type { Experience } from "@/domain/experience";

const EXPERIENCE_ID = "stillwater-riverfront-walk";

export const SAMPLE_EXPERIENCE: Experience = {
  id: EXPERIENCE_ID,
  title: "Stillwater Riverfront Walk",
  description: "A short sample experience through downtown Stillwater.",
  status: "published",
  stops: [
    {
      id: "lift-bridge-overlook",
      experienceId: EXPERIENCE_ID,
      order: 1,
      title: "Lift Bridge Overlook",
      description: "Begin near the riverfront and the historic lift bridge.",
      latitude: 45.0563,
      longitude: -92.8056,
      triggerRadiusMeters: 30,
    },
    {
      id: "lowell-park",
      experienceId: EXPERIENCE_ID,
      order: 2,
      title: "Lowell Park",
      description: "Continue north through the riverfront park.",
      latitude: 45.0582,
      longitude: -92.8067,
      triggerRadiusMeters: 30,
    },
    {
      id: "pioneer-park-overlook",
      experienceId: EXPERIENCE_ID,
      order: 3,
      title: "Pioneer Park Overlook",
      description: "Finish at an overlook above downtown and the river.",
      latitude: 45.0598,
      longitude: -92.8101,
      triggerRadiusMeters: 30,
    },
  ],
};
