import { buildValuesSchema } from "./values";

const answers = { family: 3, social: 4, pace: 2, heritage: 5 };

describe("buildValuesSchema faith consent", () => {
  const schema = buildValuesSchema(["friend"]);

  it("needs explicit consent for a faith answer of 1-5", () => {
    expect(schema.safeParse({ ...answers, faith: 4 }).success).toBe(false);
    expect(schema.safeParse({ ...answers, faith: 4, consentFaith: true }).success).toBe(true);
  });

  it("needs none for prefer not to say", () => {
    expect(schema.safeParse({ ...answers, faith: 0 }).success).toBe(true);
  });

  it("isn't asked with only professional types", () => {
    expect(buildValuesSchema(["business"]).safeParse({ social: 4, pace: 2 }).success).toBe(true);
  });
});
