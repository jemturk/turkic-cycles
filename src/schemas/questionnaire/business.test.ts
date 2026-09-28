import { businessAnswersSchema } from "./business";

const valid = { roles: ["networking"], industry: "Tech", experienceLevel: "mid_career" };

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

  it("requires a non-empty industry", () => {
    expect(businessAnswersSchema.safeParse({ ...valid, industry: "" }).success).toBe(false);
  });

  it("rejects an unknown experience level", () => {
    expect(businessAnswersSchema.safeParse({ ...valid, experienceLevel: "legendary" }).success).toBe(false);
  });
});
