import { recentOnly, SKIP_COOLDOWN_MS, skippedLast } from "./skipCooldown";

jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(), setItem: jest.fn() }));

describe("skip cooldown", () => {
  it("keeps skips from the last day and forgets older ones", () => {
    const now = 1_000_000_000;
    const kept = recentOnly({ a: now - 1000, b: now - SKIP_COOLDOWN_MS - 1, c: now - SKIP_COOLDOWN_MS + 1 }, now);
    expect(Object.keys(kept).sort()).toEqual(["a", "c"]);
  });

  it("puts recently skipped people at the back, keeping everyone's order otherwise", () => {
    const people = ["a", "b", "c", "d"].map((userId) => ({ userId }));
    expect(skippedLast(people, new Set(["b", "d"])).map((p) => p.userId)).toEqual(["a", "c", "b", "d"]);
  });
});
