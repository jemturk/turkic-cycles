import { romanticAnswersSchema } from "./romantic";

const valid = {
  relationshipIntent: "long_term",
  wantsKids: "open",
  sharedReligionImportance: "somewhat",
  sharedCultureImportance: "very_important",
};

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
