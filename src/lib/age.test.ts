import { ageBucketForAge, calculateAge } from "./age";

describe("calculateAge", () => {
  const now = new Date("2026-06-15T00:00:00.000Z");

  it("counts a full year for a birthday already passed this year", () => {
    expect(calculateAge("2000-01-01", now)).toBe(26);
  });

  it("does not count this year until the birthday has passed", () => {
    expect(calculateAge("2000-12-31", now)).toBe(25);
  });

  it("counts the birthday itself as already had", () => {
    expect(calculateAge("2000-06-15", now)).toBe(26);
  });

  it("handles the day before the birthday", () => {
    expect(calculateAge("2000-06-16", now)).toBe(25);
  });
});

describe("ageBucketForAge", () => {
  it("returns the matching bucket", () => {
    expect(ageBucketForAge(20)).toBe("18-25");
    expect(ageBucketForAge(30)).toBe("25-35");
    expect(ageBucketForAge(60)).toBe("55-65");
  });

  it("treats bucket boundaries as [min, max)", () => {
    expect(ageBucketForAge(25)).toBe("25-35");
    expect(ageBucketForAge(35)).toBe("35-45");
  });

  it("returns undefined outside all buckets", () => {
    expect(ageBucketForAge(10)).toBeUndefined();
    expect(ageBucketForAge(70)).toBeUndefined();
  });
});
