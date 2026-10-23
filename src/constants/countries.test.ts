import { COUNTRIES, SUGGESTED_COUNTRIES, canonicalCountry, matchRegionOption, normalizeForSearch, regionConfigFor } from "./countries";
import { onboardingStep1FormSchema } from "@/schemas/questionnaire/core";

describe("canonicalCountry", () => {
  it("maps stored and common spellings to the list's name", () => {
    expect(canonicalCountry("USA")).toBe("United States");
    expect(canonicalCountry("united states of america")).toBe("United States");
    expect(canonicalCountry("Turkey")).toBe("Türkiye");
    expect(canonicalCountry("turkiye")).toBe("Türkiye");
    expect(canonicalCountry("UK")).toBe("United Kingdom");
  });

  it("leaves unrecognized free text as it was, and empty as empty", () => {
    expect(canonicalCountry("Atlantis")).toBe("Atlantis");
    expect(canonicalCountry(null)).toBe("");
  });
});

describe("normalizeForSearch", () => {
  it("ignores case and accents, including the dotless ı", () => {
    expect(normalizeForSearch("Türkiye")).toBe("turkiye");
    expect(normalizeForSearch("São Tomé")).toBe("sao tome");
    expect(normalizeForSearch("Iğdır")).toBe("igdir");
  });
});

describe("regionConfigFor", () => {
  it("uses a state list for the US, including the stored 'USA' spelling", () => {
    const region = regionConfigFor("USA");
    expect(region.kind).toBe("list");
    if (region.kind === "list") expect(region.options).toHaveLength(51); // 50 states + DC
  });

  it("is an optional free-text region for countries without a list", () => {
    expect(regionConfigFor("Germany").kind).toBe("optional");
    expect(regionConfigFor("Türkiye").kind).toBe("optional");
  });
});

describe("matchRegionOption", () => {
  const region = regionConfigFor("United States");
  const options = region.kind === "list" ? region.options : [];

  it("matches by code or by full name, returning the code", () => {
    expect(matchRegionOption(options, "NC")).toBe("NC");
    expect(matchRegionOption(options, "north carolina")).toBe("NC");
  });

  it("returns null for anything not on the list", () => {
    expect(matchRegionOption(options, "Bavaria")).toBeNull();
    expect(matchRegionOption(options, "")).toBeNull();
  });
});

describe("country data", () => {
  it("lists every suggested country, with no duplicates", () => {
    for (const country of SUGGESTED_COUNTRIES) expect(COUNTRIES).toContain(country);
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length);
  });
});

describe("onboardingStep1FormSchema location rules", () => {
  const base = {
    displayName: "Aigerim",
    connectionTypes: ["friend"],
    city: "Apex",
    birthdate: "1990-05-05",
  };

  it("requires a state from the list in the US", () => {
    expect(onboardingStep1FormSchema.safeParse({ ...base, country: "United States", state: "" }).success).toBe(false);
    expect(onboardingStep1FormSchema.safeParse({ ...base, country: "United States", state: "Bavaria" }).success).toBe(false);
    expect(onboardingStep1FormSchema.safeParse({ ...base, country: "United States", state: "NC" }).success).toBe(true);
  });

  it("lets the region be left empty elsewhere", () => {
    expect(onboardingStep1FormSchema.safeParse({ ...base, country: "Türkiye", state: "" }).success).toBe(true);
  });

  it("requires a country and a city", () => {
    expect(onboardingStep1FormSchema.safeParse({ ...base, country: "", state: "" }).success).toBe(false);
    expect(onboardingStep1FormSchema.safeParse({ ...base, city: "  ", country: "Türkiye", state: "" }).success).toBe(false);
  });
});
