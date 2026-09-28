import { mentorAnswersSchema } from "./mentor";

const valid = { role: "seeking", field: "Software", experienceLevel: "early_career" };

describe("mentorAnswersSchema", () => {
  it("accepts a valid submission", () => {
    expect(mentorAnswersSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unknown role", () => {
    expect(mentorAnswersSchema.safeParse({ ...valid, role: "spectating" }).success).toBe(false);
  });

  it("requires a non-empty field", () => {
    expect(mentorAnswersSchema.safeParse({ ...valid, field: "" }).success).toBe(false);
  });
});
