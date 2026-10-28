import { AGE_STOPS, ageToIndex, agesFromIndexes, distanceStops, distanceToIndex, milesFromIndex } from "./preferenceSliders";

describe("age slider", () => {
  it("never goes below 18, and tops out at 80+", () => {
    expect(ageToIndex(16, 0)).toBe(0);
    expect(ageToIndex(95, 0)).toBe(AGE_STOPS - 1);
    expect(ageToIndex(30, 0)).toBe(12);
    expect(ageToIndex(null, 5)).toBe(5);
  });

  it("stores the ends of the track as no limit", () => {
    expect(agesFromIndexes([0, AGE_STOPS - 1])).toEqual({ ageMin: undefined, ageMax: undefined });
    expect(agesFromIndexes([12, 22])).toEqual({ ageMin: 30, ageMax: 40 });
  });
});

describe("distance slider", () => {
  it("ends with Anywhere, stored as no limit", () => {
    const last = distanceStops("mi").length - 1;
    expect(distanceToIndex(null, "mi")).toBe(last);
    expect(milesFromIndex(last, "mi")).toBeUndefined();
  });

  it("snaps a saved distance to the nearest stop, in km outside the US/UK", () => {
    expect(distanceToIndex(60, "mi")).toBe(3); // 50 mi
    expect(milesFromIndex(3, "mi")).toBe(50);
    expect(distanceToIndex(62, "km")).toBe(3); // ~100 km
    expect(milesFromIndex(3, "km")).toBe(62);
  });
});
