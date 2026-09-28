import { authCredentialsSchema, passwordComplexitySchema, signUpCredentialsSchema } from "./auth";

describe("authCredentialsSchema", () => {
  it("accepts a valid email and an 8+ char password of any composition", () => {
    const result = authCredentialsSchema.safeParse({ email: "a@b.com", password: "alllowercase" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = authCredentialsSchema.safeParse({ email: "not-an-email", password: "password1" });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = authCredentialsSchema.safeParse({ email: "a@b.com", password: "short1" });
    expect(result.success).toBe(false);
  });
});

describe("passwordComplexitySchema", () => {
  it("accepts a password with lower, upper, number, and special char", () => {
    expect(passwordComplexitySchema.safeParse("Abcdef1!").success).toBe(true);
  });

  it.each([
    ["missing uppercase", "abcdef1!"],
    ["missing lowercase", "ABCDEF1!"],
    ["missing number", "Abcdefg!"],
    ["missing special char", "Abcdefg1"],
    ["too short", "Ab1!"],
  ])("rejects a password %s", (_label, value) => {
    expect(passwordComplexitySchema.safeParse(value).success).toBe(false);
  });
});

describe("signUpCredentialsSchema", () => {
  it("requires the stricter password complexity, unlike login", () => {
    expect(signUpCredentialsSchema.safeParse({ email: "a@b.com", password: "alllowercase" }).success).toBe(false);
    expect(signUpCredentialsSchema.safeParse({ email: "a@b.com", password: "Abcdef1!" }).success).toBe(true);
  });
});
