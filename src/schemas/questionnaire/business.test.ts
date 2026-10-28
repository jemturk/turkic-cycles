import { businessAnswersSchema } from "./business";

const valid = {
  roles: ["networking"],
  industry: "technology",
  experienceLevel: "mid_career",
  goals: ["partnerships"],
  expertiseOffered: ["software_dev"],
  expertiseSought: [],
  locationPref: "anywhere",
};

describe("businessAnswersSchema", () => {
  it("accepts a valid submission", () => {
    expect(businessAnswersSchema.safeParse(valid).success).toBe(true);
  });

  it("requires at least one role", () => {
    expect(businessAnswersSchema.safeParse({ ...valid, roles: [] }).success).toBe(false);
  });

  it("rejects an unknown role", () => {
    expect(businessAnswersSchema.safeParse({ ...valid, roles: ["astronaut"] }).success).toBe(false);
  });

  it("takes the industry from the list, not free text", () => {
    expect(businessAnswersSchema.safeParse({ ...valid, industry: "" }).success).toBe(false);
    expect(businessAnswersSchema.safeParse({ ...valid, industry: "Tech" }).success).toBe(false);
  });

  it("rejects an unknown experience level", () => {
    expect(businessAnswersSchema.safeParse({ ...valid, experienceLevel: "legendary" }).success).toBe(false);
  });

  it("asks for 1 to 3 goals", () => {
    expect(businessAnswersSchema.safeParse({ ...valid, goals: [] }).success).toBe(false);
    expect(
      businessAnswersSchema.safeParse({ ...valid, goals: ["partnerships", "find_clients", "find_investors", "import_export"] })
        .success
    ).toBe(false);
  });

  it("needs at least one expertise offered or sought, up to 5 each", () => {
    expect(businessAnswersSchema.safeParse({ ...valid, expertiseOffered: [], expertiseSought: [] }).success).toBe(false);
    expect(businessAnswersSchema.safeParse({ ...valid, expertiseOffered: [], expertiseSought: ["sales"] }).success).toBe(true);
    const six = ["sales", "marketing", "operations", "leadership", "fundraising", "small_business"];
    expect(businessAnswersSchema.safeParse({ ...valid, expertiseOffered: six }).success).toBe(false);
  });
});
