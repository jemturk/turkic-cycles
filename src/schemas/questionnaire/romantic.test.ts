import { romanticAnswersSchema } from "./romantic";

const valid = {
  relationshipIntent: "long_term",
  wantsKids: "open",
  sharedReligionImportance: "somewhat",
  sharedCultureImportance: "very_important",
  goals: ["long_term"],
  gender: "woman",
  interestedIn: ["men"],
};

describe("romanticAnswersSchema gender", () => {
  it("asks gender and who they're interested in", () => {
    expect(romanticAnswersSchema.safeParse({ ...valid, gender: undefined }).success).toBe(false);
    expect(romanticAnswersSchema.safeParse({ ...valid, interestedIn: [] }).success).toBe(false);
  });

  it("asks someone who self-describes who they're shown to", () => {
    expect(romanticAnswersSchema.safeParse({ ...valid, gender: "self_describe" }).success).toBe(false);
    expect(romanticAnswersSchema.safeParse({ ...valid, gender: "self_describe", shownTo: ["women"] }).success).toBe(true);
  });

  it("no longer requires the shared-religion question", () => {
    const { sharedReligionImportance: _old, ...withoutReligion } = valid;
    expect(romanticAnswersSchema.safeParse(withoutReligion).success).toBe(true);
  });
});

describe("romanticAnswersSchema", () => {
  it("accepts a valid submission", () => {
    expect(romanticAnswersSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unknown relationshipIntent", () => {
    expect(romanticAnswersSchema.safeParse({ ...valid, relationshipIntent: "situationship" }).success).toBe(false);
  });

  it("requires every field", () => {
    const { wantsKids, ...missingWantsKids } = valid;
    expect(romanticAnswersSchema.safeParse(missingWantsKids).success).toBe(false);
  });
});
