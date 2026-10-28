import { mentorAnswersSchema, spiritualMentorAnswersSchema } from "./mentor";

const valid = {
  role: "seeking",
  field: "Software",
  yearsExperience: 2,
  expertise: ["software_dev"],
  goals: ["career_change"],
  locationPref: "anywhere",
};

describe("mentorAnswersSchema (business and academic)", () => {
  it("accepts a valid submission", () => {
    expect(mentorAnswersSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unknown role", () => {
    expect(mentorAnswersSchema.safeParse({ ...valid, role: "spectating" }).success).toBe(false);
  });

  it("requires a non-empty field", () => {
    expect(mentorAnswersSchema.safeParse({ ...valid, field: "" }).success).toBe(false);
  });

  it("asks years of experience, 0 to 50", () => {
    expect(mentorAnswersSchema.safeParse({ ...valid, yearsExperience: undefined }).success).toBe(false);
    expect(mentorAnswersSchema.safeParse({ ...valid, yearsExperience: 51 }).success).toBe(false);
    expect(mentorAnswersSchema.safeParse({ ...valid, yearsExperience: 0 }).success).toBe(true);
  });

  it("needs at least one expertise tag and a location preference", () => {
    expect(mentorAnswersSchema.safeParse({ ...valid, expertise: [] }).success).toBe(false);
    expect(mentorAnswersSchema.safeParse({ ...valid, locationPref: undefined }).success).toBe(false);
  });
});

describe("spiritualMentorAnswersSchema", () => {
  it("keeps the level and adds where, with no professional fields", () => {
    expect(
      spiritualMentorAnswersSchema.safeParse({ role: "offering", field: "Sufism", experienceLevel: "senior", locationPref: "nearby" }).success
    ).toBe(true);
  });
});
