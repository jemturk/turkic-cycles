import { buildStep4Schema } from "./step4";

const romantic = {
  relationshipIntent: "long_term",
  wantsKids: "open",
  sharedReligionImportance: "somewhat",
  sharedCultureImportance: "very_important",
  goals: ["long_term"],
};
const business = {
  roles: ["networking"],
  industry: "technology",
  experienceLevel: "mid_career",
  goals: ["partnerships"],
  expertiseOffered: ["software_dev"],
  expertiseSought: [],
};
const mentor = { role: "seeking", field: "Software", experienceLevel: "early_career" };

describe("buildStep4Schema", () => {
  it("asks friend-only selections for their goals, 1 to 3", () => {
    const schema = buildStep4Schema(["friend"]);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ friend: { goals: [] } }).success).toBe(false);
    expect(schema.safeParse({ friend: { goals: ["explore_city"] } }).success).toBe(true);
    expect(
      schema.safeParse({ friend: { goals: ["explore_city", "weekend_activities", "cultural_events", "new_to_area"] } }).success
    ).toBe(false);
  });

  it("requires romantic answers when romantic is selected", () => {
    const schema = buildStep4Schema(["romantic"]);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ romantic }).success).toBe(true);
  });

  it("does not require business answers when business isn't selected", () => {
    const schema = buildStep4Schema(["romantic"]);
    expect(schema.safeParse({ romantic }).success).toBe(true);
  });

  it("only requires the question sets for the types actually selected", () => {
    const schema = buildStep4Schema(["romantic", "business"]);
    expect(schema.safeParse({ romantic }).success).toBe(false);
    expect(schema.safeParse({ romantic, business }).success).toBe(true);
  });

  it("uses the same mentorAnswersSchema for all three mentor connection types", () => {
    for (const type of ["business_mentor", "academic_mentor", "spiritual_mentor"] as const) {
      const schema = buildStep4Schema([type]);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ [type]: mentor }).success).toBe(true);
    }
  });

  it("requires every selected type's answers together", () => {
    const schema = buildStep4Schema(["romantic", "business", "business_mentor"]);
    expect(schema.safeParse({ romantic, business }).success).toBe(false);
    expect(schema.safeParse({ romantic, business, business_mentor: mentor }).success).toBe(true);
  });
});
