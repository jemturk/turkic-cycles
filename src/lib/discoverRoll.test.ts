import { byMatch, moveTo, nextLap, reconcile } from "./discoverRoll";

const people = (...ids: string[]) => ids.map((userId) => ({ userId }));

describe("the Discover roll", () => {
  it("starts with everyone in the order given", () => {
    expect(reconcile({ ids: [], pos: 0 }, people("a", "b", "c"))).toMatchObject({ ids: ["a", "b", "c"], pos: 0 });
  });

  it("adds a new lap of the skipped people when the end comes into reach", () => {
    // On c, the last one: a and b come round again after it.
    expect(moveTo({ ids: ["a", "b", "c"], pos: 1 }, 2)).toEqual({ ids: ["a", "b", "c", "a", "b"], pos: 2 });
    expect(nextLap(["a", "b", "c", "a", "b"], 4)).toEqual(["a", "c"]);
  });

  it("never rolls past either end", () => {
    expect(moveTo({ ids: ["a", "b"], pos: 0 }, -1).pos).toBe(0);
    expect(moveTo({ ids: ["a"], pos: 0 }, 1)).toEqual({ ids: ["a"], pos: 0 });
  });

  it("keeps the person in front when someone behind them leaves", () => {
    const roll = reconcile({ ids: ["a", "b", "c", "d"], pos: 2 }, people("b", "c", "d"));
    expect(roll.ids[roll.pos]).toBe("c");
    expect(roll.fade).toBe(false);
  });

  it("brings the next person forward, fading in, when the one in front leaves", () => {
    const roll = reconcile({ ids: ["a", "b", "c"], pos: 1 }, people("a", "c"));
    expect(roll.ids[roll.pos]).toBe("c");
    expect(roll.fade).toBe(true);
  });

  it("puts newcomers in the order given, among the people not seen yet", () => {
    const roll = reconcile({ ids: ["a", "b"], pos: 0 }, people("a", "b", "z"));
    expect(roll.ids.slice(0, 3)).toEqual(["a", "b", "z"]);
  });

  it("brings a better newcomer ahead of the people not seen yet, leaving the seen ones be", () => {
    // On b (a already seen); z arrives ranked above c and d.
    const roll = reconcile({ ids: ["a", "b", "c", "d"], pos: 1 }, people("z", "c", "d", "a", "b"));
    expect(roll.ids).toEqual(["a", "b", "z", "c", "d"]);
    expect(roll.ids[roll.pos]).toBe("b");
  });

  it("picks who comes forward by the new order when the one in front leaves", () => {
    const roll = reconcile({ ids: ["a", "b", "c"], pos: 1 }, people("z", "a", "c"));
    expect(roll.ids[roll.pos]).toBe("z");
    expect(roll.fade).toBe(true);
  });

  it("keeps skipped people coming round again after everyone not seen yet", () => {
    // On c, with a and b's next lap after it; z arrives.
    const roll = reconcile({ ids: ["a", "b", "c", "a", "b"], pos: 2 }, people("z", "a", "b", "c"));
    expect(roll.ids).toEqual(["a", "b", "c", "z", "a", "b"]);
  });
});

describe("byMatch", () => {
  it("puts the best match first and people without a score after, in their order", () => {
    const sorted = byMatch([
      { userId: "x", match: { score: null } },
      { userId: "y", match: { score: 0.6 } },
      { userId: "w" },
      { userId: "z", match: { score: 0.9 } },
    ]);
    expect(sorted.map((p) => p.userId)).toEqual(["z", "y", "x", "w"]);
  });
});
