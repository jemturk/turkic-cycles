import { onboardingStep1Schema, onboardingStep2Schema, onboardingStep3Schema, coreQuestionnaireSchema } from "./core";

function birthdateNYearsAgo(years: number): string {
  const d = new Date();
  const y = String(d.getFullYear() - years);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const validStep1 = {
  displayName: "Aigerim",
  connectionTypes: ["friend"],
  city: "Chicago",
  state: "IL",
  country: "USA",
  birthdate: birthdateNYearsAgo(30),
};

describe("onboardingStep1Schema", () => {
  it("accepts a fully valid submission", () => {
    expect(onboardingStep1Schema.safeParse(validStep1).success).toBe(true);
  });

  it("rejects an empty display name", () => {
    expect(onboardingStep1Schema.safeParse({ ...validStep1, displayName: "" }).success).toBe(false);
  });

  it("requires at least one connection type", () => {
    expect(onboardingStep1Schema.safeParse({ ...validStep1, connectionTypes: [] }).success).toBe(false);
  });

  it("rejects a malformed birthdate", () => {
    expect(onboardingStep1Schema.safeParse({ ...validStep1, birthdate: "06/15/2000" }).success).toBe(false);
  });

  it("rejects an under-18 birthdate", () => {
    expect(onboardingStep1Schema.safeParse({ ...validStep1, birthdate: birthdateNYearsAgo(17) }).success).toBe(false);
  });

  it("accepts exactly 18", () => {
    expect(onboardingStep1Schema.safeParse({ ...validStep1, birthdate: birthdateNYearsAgo(18) }).success).toBe(true);
  });

  it("rejects an over-100 birthdate", () => {
    expect(onboardingStep1Schema.safeParse({ ...validStep1, birthdate: birthdateNYearsAgo(101) }).success).toBe(
      false
    );
  });

  it("accepts exactly 100", () => {
    expect(onboardingStep1Schema.safeParse({ ...validStep1, birthdate: birthdateNYearsAgo(100) }).success).toBe(true);
  });
});

const validStep2 = {
  languages: ["English"],
  interests: ["cooking", "soccer", "travel"],
  hobbies: [],
  occupation: "Engineer",
  meetingFormat: "in_person",
  availability: [],
};

describe("onboardingStep2Schema", () => {
  it("accepts a valid submission with 3 interests and no hobbies", () => {
    expect(onboardingStep2Schema.safeParse(validStep2).success).toBe(true);
  });

  it("requires at least 3 interests", () => {
    expect(onboardingStep2Schema.safeParse({ ...validStep2, interests: ["cooking", "soccer"] }).success).toBe(false);
  });

  it("allows at most 10 interests", () => {
    const eleven = ["cooking", "soccer", "travel", "pets", "reading", "running", "cycling", "fishing", "gardening", "photography", "yoga_pilates"];
    expect(onboardingStep2Schema.safeParse({ ...validStep2, interests: eleven.slice(0, 10) }).success).toBe(true);
    expect(onboardingStep2Schema.safeParse({ ...validStep2, interests: eleven }).success).toBe(false);
  });

  it("requires at least one language", () => {
    expect(onboardingStep2Schema.safeParse({ ...validStep2, languages: [] }).success).toBe(false);
  });

  it("requires a non-empty occupation", () => {
    expect(onboardingStep2Schema.safeParse({ ...validStep2, occupation: "" }).success).toBe(false);
  });
});

const validStep3 = {
  usResidency: true,
  usCitizenship: false,
  europeanCitizenship: false,
  originCountries: ["Kazakhstan"],
  consentOriginCountries: true as const,
  travelFrequency: "none",
  travelStyle: [],
};

describe("onboardingStep3Schema", () => {
  it("accepts a valid submission", () => {
    expect(onboardingStep3Schema.safeParse(validStep3).success).toBe(true);
  });

  it("requires at least one origin country", () => {
    expect(onboardingStep3Schema.safeParse({ ...validStep3, originCountries: [] }).success).toBe(false);
  });

  it("rejects more than 3 origin countries", () => {
    const result = onboardingStep3Schema.safeParse({
      ...validStep3,
      originCountries: ["A", "B", "C", "D"],
    });
    expect(result.success).toBe(false);
  });

  it("requires explicit consent, not just a truthy value", () => {
    expect(onboardingStep3Schema.safeParse({ ...validStep3, consentOriginCountries: false }).success).toBe(false);
  });
});

describe("coreQuestionnaireSchema", () => {
  it("merges step2 + step3 but excludes origin-related fields", () => {
    const result = coreQuestionnaireSchema.safeParse({ ...validStep2, ...validStep3 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("originCountries");
      expect(result.data).not.toHaveProperty("consentOriginCountries");
    }
  });
});
