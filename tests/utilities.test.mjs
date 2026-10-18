import assert from "node:assert/strict";
import test from "node:test";
import { getDistanceInMeters } from "../src/lib/geo.ts";
import { normalizeHeading, getCompassDirection, getAbsoluteHeading } from "../src/lib/heading.ts";

test("Haversine: same point, symmetry, nearby distance and date line", () => {
  const a = { latitude: 45.0563, longitude: -92.8056 };
  const b = { latitude: 45.0582, longitude: -92.8067 };
  assert.equal(getDistanceInMeters(a, a), 0);
  assert.ok(Math.abs(getDistanceInMeters(a,b) - getDistanceInMeters(b,a)) < 1e-8);
  assert.ok(getDistanceInMeters(a,b) > 200 && getDistanceInMeters(a,b) < 250);
  const boundary = getDistanceInMeters({latitude:0,longitude:179.999}, {latitude:0,longitude:-179.999});
  assert.ok(boundary > 220 && boundary < 224);
});

test("Heading normalization, sectors and unusable orientations", () => {
  for (const [degrees, direction] of [[0,"N"],[44,"NE"],[90,"E"],[181,"S"],[270,"W"],[359,"N"]]) {
    assert.equal(getCompassDirection(degrees), direction);
  }
  assert.equal(normalizeHeading(-1),359);
  assert.equal(normalizeHeading(360),0);
  assert.equal(getAbsoluteHeading(90,0),270);
  assert.equal(getAbsoluteHeading(90,90),null);
  assert.equal(getAbsoluteHeading(NaN,0),null);
});
