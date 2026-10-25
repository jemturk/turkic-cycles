import { buildProfileEditSchema } from "./profileEdit";

function birthdateNYearsAgo(years: number): string {
  const d = new Date();
  const y = String(d.getFullYear() - years);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const baseValues = {
  displayName: "Aigerim",
  connectionTypes: ["friend"],
  city: "Chicago",
  state: "IL",
  country: "USA",
  birthdate: birthdateNYearsAgo(30),
  languages: ["English"],
  interests: ["cooking", "soccer", "travel"],
  hobbies: [],
  occupation: "Engineer",
  usResidency: true,
  usCitizenship: false,
  europeanCitizenship: false,
  originCountries: ["Kazakhstan"],
  consentOriginCountries: true as const,
  travelFrequency: "none",
  travelStyle: [],
  bio: "Hello",
};

describe("buildProfileEditSchema", () => {
  it("accepts a full valid submission for a friend-only profile", () => {
    const schema = buildProfileEditSchema(["friend"]);
    expect(schema.safeParse(baseValues).success).toBe(true);
  });

  it("makes bio optional", () => {
    const schema = buildProfileEditSchema(["friend"]);
    const { bio: _bio, ...withoutBio } = baseValues;
    expect(schema.safeParse(withoutBio).success).toBe(true);
  });

  it("still requires the branching answers for the selected connection type", () => {
    const schema = buildProfileEditSchema(["romantic"]);
    expect(schema.safeParse({ ...baseValues, connectionTypes: ["romantic"] }).success).toBe(false);
    expect(
      schema.safeParse({
        ...baseValues,
        connectionTypes: ["romantic"],
        romantic: {
          relationshipIntent: "long_term",
          wantsKids: "open",
          sharedReligionImportance: "somewhat",
          sharedCultureImportance: "very_important",
        },
      }).success
    ).toBe(true);
  });

  it("still enforces step1's age bounds", () => {
    const schema = buildProfileEditSchema(["friend"]);
    expect(schema.safeParse({ ...baseValues, birthdate: birthdateNYearsAgo(10) }).success).toBe(false);
  });
});
