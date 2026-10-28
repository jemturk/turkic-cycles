import { buildStep4Schema } from "./step4";

const romantic = {
  relationshipIntent: "long_term",
  wantsKids: "open",
  sharedReligionImportance: "somewhat",
  sharedCultureImportance: "very_important",
  goals: ["long_term"],
  gender: "woman",
  interestedIn: ["men"],
};
const business = {
  roles: ["networking"],
  industry: "technology",
  experienceLevel: "mid_career",
  goals: ["partnerships"],
  expertiseOffered: ["software_dev"],
  expertiseSought: [],
  locationPref: "anywhere",
};
const values = { family: 3, faith: 0, social: 4, pace: 2, heritage: 5 };
const proValues = { social: 4, pace: 2 };
const mentor = {
  role: "seeking",
  field: "Software",
  yearsExperience: 2,
  expertise: ["software_dev"],
  goals: ["career_change"],
  locationPref: "anywhere",
};
const spiritual = { role: "seeking", field: "Prayer", experienceLevel: "early_career", locationPref: "anywhere" };

describe("buildStep4Schema", () => {
  it("asks friend-only selections for their goals, 1 to 3", () => {
    const schema = buildStep4Schema(["friend"]);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ values, friend: { goals: [] } }).success).toBe(false);
    expect(schema.safeParse({ values, friend: { goals: ["explore_city"] } }).success).toBe(true);
    expect(
      schema.safeParse({ values, friend: { goals: ["explore_city", "weekend_activities", "cultural_events", "new_to_area"] } }).success
    ).toBe(false);
  });

  it("requires romantic answers when romantic is selected", () => {
    const schema = buildStep4Schema(["romantic"]);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ values, romantic }).success).toBe(true);
  });

  it("does not require business answers when business isn't selected", () => {
    const schema = buildStep4Schema(["romantic"]);
    expect(schema.safeParse({ values, romantic }).success).toBe(true);
  });

  it("only requires the question sets for the types actually selected", () => {
    const schema = buildStep4Schema(["romantic", "business"]);
    expect(schema.safeParse({ values, romantic }).success).toBe(false);
    expect(schema.safeParse({ values, romantic, business }).success).toBe(true);
  });

  it("uses the same mentorAnswersSchema for all three mentor connection types", () => {
    for (const type of ["business_mentor", "academic_mentor", "spiritual_mentor"] as const) {
      const schema = buildStep4Schema([type]);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ values: proValues, [type]: type === "spiritual_mentor" ? spiritual : mentor }).success).toBe(true);
    }
  });

  it("requires every selected type's answers together", () => {
    const schema = buildStep4Schema(["romantic", "business", "business_mentor"]);
    expect(schema.safeParse({ values, romantic, business }).success).toBe(false);
    expect(schema.safeParse({ values, romantic, business, business_mentor: mentor }).success).toBe(true);
    // The values questions come with any selection.
    expect(schema.safeParse({ romantic, business, business_mentor: mentor }).success).toBe(false);
  });
});
