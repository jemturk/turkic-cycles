import { isWithinMiles, milesBetween } from "./distance";

const APEX = { latitude: 35.7327, longitude: -78.8503 };
const RALEIGH = { latitude: 35.7796, longitude: -78.6382 };
const TAMPA = { latitude: 27.9506, longitude: -82.4572 };

describe("milesBetween", () => {
  it("is zero for the same point", () => {
    expect(milesBetween(APEX, APEX)).toBe(0);
  });

  it("matches known city distances", () => {
    expect(milesBetween(APEX, RALEIGH)).toBeCloseTo(12, 0);
    // Apex to Tampa is roughly 580 miles as the crow flies.
    expect(milesBetween(APEX, TAMPA)).toBeGreaterThan(550);
    expect(milesBetween(APEX, TAMPA)).toBeLessThan(600);
  });
});

describe("isWithinMiles", () => {
  it("includes places inside the radius and excludes ones outside it", () => {
    expect(isWithinMiles(RALEIGH, APEX, 50)).toBe(true);
    expect(isWithinMiles(TAMPA, APEX, 50)).toBe(false);
  });

  it("treats places without coordinates as nearby", () => {
    expect(isWithinMiles({ latitude: null, longitude: null }, APEX, 50)).toBe(true);
  });
});
