import { act, renderHook } from "@testing-library/react-native";

import { buildCorePayload, useOnboardingStore } from "./onboarding";

const step1 = {
  displayName: "Aigerim",
  connectionTypes: ["friend"] as const,
  city: "Chicago",
  state: "IL",
  country: "USA",
  birthdate: "1996-01-01",
};
const step2 = {
  languages: ["English"],
  interests: ["Travel"],
  hobbies: [],
  occupation: "Engineer",
  meetingFormat: "either" as const,
  availability: [],
};
const step3 = {
  usResidency: true,
  usCitizenship: false,
  europeanCitizenship: false,
  originCountries: ["Kazakhstan"],
  consentOriginCountries: true as const,
  travelFrequency: "none",
  travelStyle: [],
};

beforeEach(() => {
  useOnboardingStore.getState().reset();
});

describe("useOnboardingStore", () => {
  it("starts empty", async () => {
    const { result } = await renderHook(() => useOnboardingStore());
    expect(result.current.step1).toBeUndefined();
    expect(result.current.step2).toBeUndefined();
    expect(result.current.step3).toBeUndefined();
    expect(result.current.step4Answers).toEqual({});
  });

  it("stores each step independently", async () => {
    const { result } = await renderHook(() => useOnboardingStore());
    await act(() => result.current.setStep1(step1 as never));
    await act(() => result.current.setStep2(step2));
    await act(() => result.current.setStep3(step3));
    expect(result.current.step1).toEqual(step1);
    expect(result.current.step2).toEqual(step2);
    expect(result.current.step3).toEqual(step3);
  });

  it("reset clears every step back to empty", async () => {
    const { result } = await renderHook(() => useOnboardingStore());
    await act(() => result.current.setStep1(step1 as never));
    await act(() => result.current.setStep2(step2));
    await act(() => result.current.reset());
    expect(result.current.step1).toBeUndefined();
    expect(result.current.step2).toBeUndefined();
    expect(result.current.step4Answers).toEqual({});
  });
});

describe("buildCorePayload", () => {
  it("merges step2 and step3, stripping origin fields", () => {
    const payload = buildCorePayload({ step2, step3 });
    expect(payload).toEqual({
      languages: ["English"],
      interests: ["Travel"],
      hobbies: [],
      occupation: "Engineer",
      meetingFormat: "either",
      availability: [],
      usResidency: true,
      usCitizenship: false,
      europeanCitizenship: false,
      travelFrequency: "none",
      travelStyle: [],
    });
    expect(payload).not.toHaveProperty("originCountries");
    expect(payload).not.toHaveProperty("consentOriginCountries");
  });

  it("never drops step2's fields when only step3 was resubmitted", () => {
    const payload = buildCorePayload({ step2, step3 });
    expect(payload.languages).toEqual(step2.languages);
    expect(payload.occupation).toEqual(step2.occupation);
  });

  it("never drops step3's fields when only step2 was resubmitted", () => {
    const payload = buildCorePayload({ step2, step3 });
    expect(payload.usResidency).toBe(step3.usResidency);
    expect(payload.travelFrequency).toBe(step3.travelFrequency);
  });

  it("handles a missing step3 without throwing", () => {
    const payload = buildCorePayload({ step2, step3: undefined });
    expect(payload).toEqual(step2);
  });

  it("handles a missing step2 without throwing", () => {
    const payload = buildCorePayload({ step2: undefined, step3 });
    expect(payload).not.toHaveProperty("originCountries");
    expect(payload.usResidency).toBe(true);
  });
});
