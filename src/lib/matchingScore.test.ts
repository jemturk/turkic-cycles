import {
  DEFAULT_CONFIG,
  applyCap,
  bestMatch,
  directionalScore,
  effectiveWeights,
  matchForType,
  passesTypeFilters,
  sanitizeBoosts,
  boostableCriteria,
  type Member,
} from "../../supabase/functions/_shared/matching";

const cfg = DEFAULT_CONFIG;

function member(overrides: Partial<Member> = {}): Member {
  return {
    id: "m",
    age: 30,
    interests: [],
    circles: [],
    heritage: [],
    values: {},
    location: null,
    country: "USA",
    state: "FL",
    maxDistanceMi: null,
    meetingFormat: null,
    availability: [],
    goals: {},
    romantic: null,
    business: null,
    mentors: {},
    boosts: {},
    ...overrides,
  };
}

// 5 miles due north of the origin: 5 / 3958.8 radians of latitude.
const FIVE_MILES_NORTH = (5 / 3958.8) * (180 / Math.PI);

describe("the spec's worked example (two Friend members)", () => {
  const a = member({
    id: "a",
    age: 30,
    interests: ["cooking", "soccer", "travel"],
    circles: ["c1", "c2"],
    heritage: ["Azerbaijan"],
    values: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 },
    location: { latitude: 0, longitude: 0 },
    maxDistanceMi: 25,
    meetingFormat: "in_person",
    availability: ["weekend"],
    goals: { friend: ["explore_city", "weekend_activities"] },
  });
  const b = member({
    id: "b",
    age: 34,
    interests: ["cooking", "soccer", "reading"],
    circles: ["c1", "c3"],
    heritage: ["Azerbaijan"],
    values: { 1: 4, 2: 2, 3: 4, 4: 2, 5: 4 },
    location: { latitude: FIVE_MILES_NORTH, longitude: 0 },
    maxDistanceMi: 10,
    meetingFormat: "in_person",
    availability: ["weekend"],
    goals: { friend: ["explore_city", "new_to_area"] },
  });

  it("scores A -> B 0.7475 and B -> A 0.7025", () => {
    expect(directionalScore(a, b, "friend", cfg).score).toBeCloseTo(0.7475, 4);
    expect(directionalScore(b, a, "friend", cfg).score).toBeCloseTo(0.7025, 4);
  });

  it("matches them at 0.7247: shown, but not a strong match", () => {
    const match = matchForType(a, b, "friend", cfg)!;
    expect(match.score).toBeCloseTo(0.7247, 4);
    expect(match.strong).toBe(false);
  });

  it("gives A shared interests, proximity and values as the top reasons", () => {
    const match = matchForType(a, b, "friend", cfg)!;
    expect(match.reasons.map((r) => r.criterion)).toEqual(["interests", "proximity", "values"]);
    expect(match.reasons[0].count).toBe(2);
    expect(match.reasons[1].miles).toBe(5);
  });
});

describe("missing data", () => {
  it("skips empty fields and renormalizes over the rest", () => {
    const a = member({ interests: ["cooking", "soccer", "travel"], meetingFormat: "either", values: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 } });
    const b = member({ interests: ["cooking", "soccer", "travel"], meetingFormat: "virtual", values: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 } });
    // interests 25 + values 15 + life stage 10 + format 10 = 60% of the weight: under 70%.
    expect(directionalScore(a, b, "friend", cfg).score).toBeNull();
    const withCircles = (m: Member) => ({ ...m, circles: ["c1", "c2"] });
    // + circles 10 = 70%: enough.
    expect(directionalScore(withCircles(a), withCircles(b), "friend", cfg).score).toBeCloseTo(1, 6);
  });

  it("returns a match with no score when too little is known, rather than hiding them", () => {
    expect(matchForType(member(), member(), "friend", cfg)).toEqual({ appType: "friend", score: null, strong: false, reasons: [] });
  });
});

describe("Romantic filters", () => {
  const woman = (interestedIn: ("women" | "men")[]) => member({ romantic: { gender: "woman", interestedIn, shownTo: [] } });
  const man = (interestedIn: ("women" | "men")[]) => member({ romantic: { gender: "man", interestedIn, shownTo: [] } });

  it("needs each to be interested in the other's gender", () => {
    expect(passesTypeFilters(woman(["men"]), man(["women"]), "romantic", cfg)).toBe(true);
    expect(passesTypeFilters(woman(["men"]), man(["men"]), "romantic", cfg)).toBe(false);
    expect(passesTypeFilters(woman(["women"]), woman(["women"]), "romantic", cfg)).toBe(true);
  });

  it("lets someone who self-describes choose who they're shown to", () => {
    const selfDescribes = member({ romantic: { gender: "self_describe", interestedIn: ["women"], shownTo: ["women"] } });
    expect(passesTypeFilters(woman(["women"]), selfDescribes, "romantic", cfg)).toBe(true);
    expect(passesTypeFilters(man(["women"]), selfDescribes, "romantic", cfg)).toBe(false);
  });

  it("leaves out anyone who hasn't given their gender", () => {
    expect(passesTypeFilters(member({ romantic: { gender: null, interestedIn: ["men"], shownTo: [] } }), man(["women"]), "romantic", cfg)).toBe(false);
  });
});

describe("Mentor filters and fit", () => {
  const side = (role: "seeking" | "offering", yearsExperience: number, expertise: string[]) => ({
    role,
    yearsExperience,
    expertise,
    goals: ["career_change"],
    locationPref: null,
  });

  it("never pairs two mentees or two mentors", () => {
    const a = member({ mentors: { business_mentor: side("seeking", 2, ["sales"]) } });
    const b = member({ mentors: { business_mentor: side("seeking", 10, ["sales"]) } });
    expect(passesTypeFilters(a, b, "business_mentor", cfg)).toBe(false);
  });

  it("needs the mentor to have at least 3 more years", () => {
    const mentee = member({ mentors: { business_mentor: side("seeking", 5, ["sales"]) } });
    expect(passesTypeFilters(mentee, member({ mentors: { business_mentor: side("offering", 7, ["sales"]) } }), "business_mentor", cfg)).toBe(false);
    expect(passesTypeFilters(mentee, member({ mentors: { business_mentor: side("offering", 8, ["sales"]) } }), "business_mentor", cfg)).toBe(true);
  });

  it("respects each side's location preference", () => {
    const mentee = member({ country: "USA", mentors: { business_mentor: { ...side("seeking", 1, ["sales"]), locationPref: "same_country" } } });
    const abroad = member({ country: "Germany", mentors: { business_mentor: side("offering", 10, ["sales"]) } });
    expect(passesTypeFilters(mentee, abroad, "business_mentor", cfg)).toBe(false);
  });

  it("gives spiritual mentors no professional fit", () => {
    const a = member({ meetingFormat: "either", mentors: { spiritual_mentor: side("seeking", 1, []) } });
    expect(effectiveWeights(a, "spiritual_mentor", cfg).professional).toBeUndefined();
  });
});

describe("Business", () => {
  it("counts complementary goals as shared (find clients <-> offer services)", () => {
    const biz = (goals: string[]) =>
      member({ meetingFormat: "either", goals: { business: goals }, business: { industry: "technology", expertiseOffered: ["sales"], expertiseSought: ["marketing"], locationPref: null } });
    const a = biz(["find_clients"]);
    const b = biz(["offer_services"]);
    const match = bestMatch(a, b, ["business"], cfg);
    expect(match?.appType).toBe("business");
  });
});

describe("weights", () => {
  it("caps any one criterion at 40% and spreads the excess", () => {
    const capped = applyCap({ professional: 0.6, goals: 0.2, interests: 0.2 }, 0.4);
    expect(capped.professional).toBeCloseTo(0.4, 6);
    expect((capped.goals ?? 0) + (capped.interests ?? 0)).toBeCloseTo(0.6, 6);
  });

  it("applies boosts and renormalizes", () => {
    const viewer = member({ boosts: { friend: { interests: "very" } } });
    const w = effectiveWeights(viewer, "friend", cfg);
    const total = Object.values(w).reduce((s, v) => s + (v ?? 0), 0);
    expect(total).toBeCloseTo(1, 6);
    expect(w.interests).toBeCloseTo(37.5 / 112.5, 6);
  });
});

describe("boosts (What matters most to you?)", () => {
  it("keeps at most 3 'very' and 2 'less' per type", () => {
    const boosts = sanitizeBoosts(
      {
        friend: {
          interests: "very",
          circles: "very",
          values: "very",
          heritage: "very",
          life_stage: "less",
          proximity: "less",
          goals: "less",
        },
      },
      cfg
    );
    const levels = Object.values(boosts.friend ?? {});
    expect(levels.filter((l) => l === "very")).toHaveLength(3);
    expect(levels.filter((l) => l === "less")).toHaveLength(2);
  });

  it("drops criteria the type doesn't weigh, unknown types and values", () => {
    const boosts = sanitizeBoosts({ friend: { professional: "very", nonsense: "very", interests: "loud" }, dating: { interests: "very" } }, cfg);
    expect(boosts).toEqual({});
  });

  it("never boosts Mentor's professional fit up, but allows it down", () => {
    expect(sanitizeBoosts({ business_mentor: { professional: "very" } }, cfg)).toEqual({});
    expect(sanitizeBoosts({ business_mentor: { professional: "less" } }, cfg)).toEqual({ business_mentor: { professional: "less" } });
  });

  it("offers only the criteria each type weighs", () => {
    expect(boostableCriteria("friend", cfg)).not.toContain("professional");
    expect(boostableCriteria("business_mentor", cfg)).not.toContain("proximity");
    expect(boostableCriteria("spiritual_mentor", cfg)).not.toContain("professional");
  });
});
