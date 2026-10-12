import type { GeographicCoordinates } from "@/lib/geo";

export type Destination = GeographicCoordinates & {
  id: string;
  name: string;
};

export const TEST_DESTINATION: Destination = {
  id: "test-destination",
  name: "Test Destination",
  latitude: 45.0563,
  longitude: -92.8056,
};
