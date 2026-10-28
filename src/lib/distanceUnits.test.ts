import { distanceUnitFor, fromMiles, toMiles } from "./distanceUnits";

describe("distance units", () => {
  it("uses miles in the US and UK, km elsewhere", () => {
    expect(distanceUnitFor("United States")).toBe("mi");
    expect(distanceUnitFor("USA")).toBe("mi");
    expect(distanceUnitFor("United Kingdom")).toBe("mi");
    expect(distanceUnitFor("Germany")).toBe("km");
    expect(distanceUnitFor("Türkiye")).toBe("km");
    expect(distanceUnitFor(null)).toBe("km");
  });

  it("converts for display and back to whole miles for storage", () => {
    expect(fromMiles(30, "km")).toBe(48);
    expect(toMiles(48, "km")).toBe(30);
    expect(fromMiles(30, "mi")).toBe(30);
    expect(toMiles(30, "mi")).toBe(30);
    expect(toMiles(1, "km")).toBe(1);
  });
});
